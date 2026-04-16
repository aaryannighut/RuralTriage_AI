import asyncio
import logging
import uuid
import sys
import os
from contextlib import asynccontextmanager
from pathlib import Path

# --- PROPER PATH RESOLUTION ---
# This ensures the app finds its modules and assets regardless of launch directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent # backend folder

# Add backend to sys.path for module resolution
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Conditional imports to catch path/package errors early
try:
    from app import exception_handler
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
except ImportError as e:
    print(f"CRITICAL IMPORT ERROR: {e}")
    print(f"Python Path: {sys.path}")
    raise

# --- INITIALIZATION ---
settings = Settings()
pcs: set = set()
dcs: set = set()
chat_rooms: dict[str, list[WebSocket]] = {}
rooms: dict[str, list[WebSocket]] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown tasks"""
    print("🚀 Starting RuralTriage AI Backend...")
    try:
        # Create tables for any models that don't exist yet
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables verified.")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
    
    yield
    
    print("🛑 Shutting down RuralTriage AI Backend...")
    # Clean up peer connections if any
    for pc in list(pcs):
        await pc.close()
    pcs.clear()

app = FastAPI(
    title="RuralTriage AI API",
    version="1.0.0",
    lifespan=lifespan
)

# --- MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STATIC & TEMPLATE CONFIG (RESILIENT) ---
STATIC_DIR = BASE_DIR / "static"
TEMPLATE_DIR = BASE_DIR / "templates"

if not STATIC_DIR.exists():
    print(f"⚠️ Warning: Static directory not found at {STATIC_DIR}. Creating it...")
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

if not TEMPLATE_DIR.exists():
    print(f"⚠️ Warning: Template directory not found at {TEMPLATE_DIR}. Creating it...")
    TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATE_DIR))

# Register Custom Exception Handlers
exception_handler.init_app(app)

# --- ROUTE REGISTRATION ---
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

# Logging Setup
root_logger = logging.getLogger("app")
if not root_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
root_logger.setLevel(settings.LOG_LEVEL)

# --- CORE ENDPOINTS ---

@app.get("/", include_in_schema=False)
async def index(request: Request) -> HTMLResponse:
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception:
        return HTMLResponse("<h1>RuralTriage AI API</h1><p>API is running. index.html not found.</p>")

@app.get("/health", tags=["System"])
def health() -> JSONResponse:
    return JSONResponse({"status": "healthy", "service": "RuralTriage AI Backend"})

@app.post("/message", include_in_schema=False)
async def message(request: Request):
    params = await request.json()
    for dc in dcs:
        try:
            dc.send(params["message"])
        except Exception:
            pass
    return JSONResponse({"status": "sent", "recipients": len(dcs)})

# --- WEBSOCKET SERVICES ---

@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in chat_rooms:
        chat_rooms[room_id] = []
    room = chat_rooms[room_id]
    room.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            dead = []
            for peer in list(room):
                if peer is websocket: continue
                try:
                    await peer.send_json(data)
                except Exception:
                    dead.append(peer)
            for d in dead:
                if d in room: room.remove(d)
    except WebSocketDisconnect:
        if websocket in room: room.remove(websocket)
        if not room: chat_rooms.pop(room_id, None)

@app.websocket("/ws/signal/{room_id}")
async def webrtc_signal(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in rooms:
        rooms[room_id] = []
    room = rooms[room_id]

    if len(room) >= 2:
        await websocket.send_json({"type": "room-full"})
        await websocket.close()
        return

    position = len(room)
    room.append(websocket)
    
    await websocket.send_json({
        "type": "joined",
        "role": "initiator" if position == 0 else "receiver",
        "peers": len(room),
    })

    try:
        while True:
            data = await websocket.receive_json()
            for peer in list(room):
                if peer is websocket: continue
                try:
                    await peer.send_json(data)
                except Exception:
                    pass
    except WebSocketDisconnect:
        if websocket in room: room.remove(websocket)
        if not room: rooms.pop(room_id, None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)