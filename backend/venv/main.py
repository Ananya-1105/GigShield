from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()

from database import Base, engine

from routes.auth import router as auth_router
from routes.claim import router as claim_router
from routes.policy import router as policy_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router
from routes.weather import router as weather_router

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(
    title="GigShield",
    description="AI-Powered Parametric Income Protection for India's Gig Riders",
    version="1.0.0",
)

# Create DB tables
Base.metadata.create_all(bind=engine)

# CORS (keep open for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(claim_router)
app.include_router(policy_router)
app.include_router(admin_router)
app.include_router(weather_router)

# API root (changed to avoid conflict with frontend)
@app.get("/api")
def root():
    return {
        "app": "GigShield",
        "version": "1.0.0",
        "status": "running"
    }

# --------- SERVE FRONTEND ---------
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_path):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_path, "assets")),
        name="assets"
    )

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = os.path.join(frontend_path, full_path)

        # If file exists (JS, CSS, images)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Otherwise return index.html (React routing)
        return FileResponse(os.path.join(frontend_path, "index.html"))
