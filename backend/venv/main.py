from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import Base, engine

from routes.auth import router as auth_router
from routes.claim import router as claim_router
from routes.policy import router as policy_router
from routes.dashboard import router as dashboard_router
from routes.admin import router as admin_router
from routes.weather import router as weather_router

app = FastAPI(
    title="GigShield",
    description="AI-Powered Parametric Income Protection for India's Gig Riders",
    version="1.0.0",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(claim_router)
app.include_router(policy_router)
app.include_router(admin_router)
app.include_router(weather_router)


@app.get("/")
def root():
    return {"app": "GigShield", "version": "1.0.0", "status": "running", "docs": "/docs"}
