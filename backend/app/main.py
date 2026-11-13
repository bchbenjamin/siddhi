from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Individualized Education Program (IEP) Tracking Platform API",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url=None,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint that verifies server and database status."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status
    }
