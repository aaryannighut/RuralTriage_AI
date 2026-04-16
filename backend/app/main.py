import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

#from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaRelay
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import HTMLResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import exception_handler
from app.my_media_transform_check import AudioTransformTrack, VideoTransformTrack
from app.settings import Settings
from app.database import Base, engine
from app.routes.auth_routes import router as auth_router
from app.routes.doctor_routes import router as doctor_router
from app.routes.doctor_dashboard_routes import router as doctor_dashboard_router
from app.routes.health_records_routes import router as health_records_router
from app.routes.patient_routes import router as patient_router
from app.routes.pharmacist_routes import router as pharmacist_router
from app.routes.pharmacy_routes import router as pharmacy_router
from app.routes.medicine_search_routes import router as medicine_search_router
from app.routes.appointment_routes import router as appointment_router
from app.routes.translation_routes import router as translation_router

BASE_DIR = Path(__file__).parent

settings = Settings()

pcs: set = set()
dcs: set = set()
relay = MediaRelay()
connections: list[WebSocket] = []

# Chat rooms: room_id → list of WebSocket
chat_rooms: dict[str, list[WebSocket]] = {}

# Signaling rooms: room_id → list of (position, WebSocket)
rooms: dict[str, list[WebSocket]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables for any models that don't exist yet
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: close all peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# 例外ハンドラの登録
exception_handler.init_app(app)

app.include_router(auth_router)
app.include_router(doctor_router)
app.include_router(doctor_dashboard_router)
app.include_router(health_records_router)
app.include_router(patient_router)
app.include_router(pharmacist_router)
app.include_router(pharmacy_router)
app.include_router(medicine_search_router, prefix="/medicines", tags=["Medicines"])
app.include_router(appointment_router)
app.include_router(translation_router)

# このアプリケーションのログ設定
root_logger = logging.getLogger("app")
root_logger.addHandler(logging.StreamHandler())
root_logger.setLevel(settings.LOG_LEVEL)


@app.get("/", include_in_schema=False)
async def index(
    request: Request,
) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health", include_in_schema=False)
def health() -> JSONResponse:
    """ヘルスチェック"""
    return JSONResponse({"message": "It worked!!"})


@app.post("/offer", include_in_schema=False)
async def offer(request: Request):
    params = await request.json()
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

    # pc = RTCPeerConnection()
    pc_id = "PeerConnection(%s)" % uuid.uuid4()
    pcs.add(pc)

    def log_info(msg, *args):
        root_logger.info(pc_id + " " + msg, *args)

    # player = MediaPlayer("/usr/src/app/app/demo-instruct.wav")
    recorder = MediaBlackhole()

    @pc.on("datachannel")
    def on_datachannel(channel):
        dcs.add(channel)

        @channel.on("message")
        def on_message(message):
            if isinstance(message, str) and message.startswith("ping"):
                channel.send("pong" + message[4:])

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        log_info("Connection state is %s", pc.connectionState)
        if pc.connectionState == "failed":
            await pc.close()
            pcs.discard(pc)

    @pc.on("track")
    def on_track(track):
        log_info("Track {} received".format(track.kind))

        if track.kind == "audio":
            pc.addTrack(AudioTransformTrack(relay.subscribe(track)))
            # recorder.addTrack(track)
            # recorder.addTrack(player.audio)
            pass
        elif track.kind == "video":
            # pc.addTrack(relay.subscribe(track))
            pc.addTrack(VideoTransformTrack(relay.subscribe(track), transform=""))
            # recorder.addTrack(relay.subscribe(track))
            pass

        @track.on("ended")
        async def on_ended():
            log_info("Track %s ended", track.kind)
            await recorder.stop()

    # handle offer
    await pc.setRemoteDescription(offer)
    await recorder.start()

    # send answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    return JSONResponse(
        {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type},
    )


@app.post("/message", include_in_schema=False)
async def message(request: Request):
    params = await request.json()
    for dc in dcs:
        dc.send(params["message"])
    return JSONResponse({"status": "sent", "recipients": len(dcs)})


@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    """
    Room-based chat. Each room holds multiple peers.
    Messages are JSON: {"sender": "...", "text": "...", ...}
    and are relayed to every *other* peer in the room.
    """
    await websocket.accept()

    if room_id not in chat_rooms:
        chat_rooms[room_id] = []
    room = chat_rooms[room_id]
    room.append(websocket)

    # Notify everyone in the room about the new peer count
    for peer in list(room):
        try:
            await peer.send_json({"type": "system", "text": f"A user joined. {len(room)} in room."})
        except Exception:
            pass

    try:
        while True:
            data = await websocket.receive_json()
            # Relay to every other peer in the room
            dead = []
            for peer in list(room):
                if peer is websocket:
                    continue
                try:
                    await peer.send_json(data)
                except Exception:
                    dead.append(peer)
            for d in dead:
                room.remove(d)
    except WebSocketDisconnect:
        if websocket in room:
            room.remove(websocket)
        # Notify remaining peers
        for peer in list(room):
            try:
                await peer.send_json({"type": "system", "text": f"A user left. {len(room)} in room."})
            except Exception:
                pass
        if not room:
            chat_rooms.pop(room_id, None)


@app.websocket("/ws/signal/{room_id}")
async def webrtc_signal(websocket: WebSocket, room_id: str):
    """
    WebRTC signaling server.
    Rooms hold exactly 2 peers. Messages (offer / answer / ice-candidate)
    are relayed transparently to the other peer in the room.
    """
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
        root_logger.info(f"Signaling: Room {room_id} created.")

    room = rooms[room_id]

    if len(room) >= 2:
        root_logger.warning(f"Signaling: Room {room_id} full. Rejecting connection.")
        await websocket.send_json({"type": "room-full"})
        await websocket.close()
        return

    position = len(room)   # 0 = initiator, 1 = receiver
    room.append(websocket)
    root_logger.info(f"Signaling: Peer joined room {room_id}. Position: {position}. Total: {len(room)}")

    # Tell this peer its role
    await websocket.send_json({
        "type": "joined",
        "role": "initiator" if position == 0 else "receiver",
        "peers": len(room),
    })

    if len(room) == 2:
        root_logger.info(f"Signaling: Room {room_id} now full. Notifying peers.")
        for peer in list(room):
            try:
                await peer.send_json({"type": "peer-joined", "peers": 2})
            except Exception as e:
                root_logger.error(f"Signaling: Failed to notify peer in room {room_id}: {e}")

    try:
        while True:
            data = await websocket.receive_json()
            # Relay to every other peer in the room (not back to sender)
            msg_type = data.get("type", "unknown")
            # root_logger.debug(f"Signaling: Relaying {msg_type} in room {room_id}")
            
            for peer in list(room):
                if peer is websocket:
                    continue
                try:
                    await peer.send_json(data)
                except Exception as e:
                    root_logger.error(f"Signaling: Relay failed for {msg_type} in room {room_id}: {e}")
    except WebSocketDisconnect:
        if websocket in room:
            room.remove(websocket)
        root_logger.info(f"Signaling: Peer left room {room_id}. Remaining: {len(room)}")
        
        # Notify remaining peer
        for peer in list(room):
            try:
                await peer.send_json({"type": "peer-left"})
            except Exception as e:
                root_logger.error(f"Signaling: Failed to notify remaining peer in room {room_id}: {e}")
        
        # Clean up empty room
        if not room:
            rooms.pop(room_id, None)
            root_logger.info(f"Signaling: Room {room_id} destroyed.")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
