from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from app import exception_handler
from app.settings import Settings
from app.database import Base, engine

# Routers
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

# WebSocket rooms
chat_rooms = {}
rooms = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static + Templates (FIXED PATHS ✅)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Exception handler
exception_handler.init_app(app)

# Routers
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

# Logging
logging.basicConfig(level=logging.INFO)

# ✅ ROOT ROUTE (important)
@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Health check
@app.get("/health")
def health():
    return {"message": "Backend running"}

# WebSocket Chat
@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    await websocket.accept()
    chat_rooms.setdefault(room_id, []).append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            for peer in chat_rooms[room_id]:
                if peer != websocket:
                    await peer.send_json(data)
    except WebSocketDisconnect:
        chat_rooms[room_id].remove(websocket)

# WebRTC signaling (basic)
@app.websocket("/ws/signal/{room_id}")
async def webrtc_signal(websocket: WebSocket, room_id: str):
    await websocket.accept()
    rooms.setdefault(room_id, []).append(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            for peer in rooms[room_id]:
                if peer != websocket:
                    await peer.send_json(data)
    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)