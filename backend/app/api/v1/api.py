from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, guardian, students, plop, iep, progress, therapy,
    accommodations, communications, assessments, attendance,
    reviews, reports, exports
)

api_router = APIRouter()

# Auth and user management
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Guardian endpoints
api_router.include_router(guardian.router, prefix="/guardians", tags=["guardian"])

# Student management
api_router.include_router(students.router, prefix="/students", tags=["students"])

# IEP modules (all use /students/{id}/... prefix internally)
api_router.include_router(plop.router, tags=["plop"])
api_router.include_router(iep.router, tags=["iep"])
api_router.include_router(progress.router, tags=["progress"])
api_router.include_router(therapy.router, tags=["therapy"])
api_router.include_router(accommodations.router, tags=["accommodations"])
api_router.include_router(communications.router, tags=["communications"])
api_router.include_router(assessments.router, tags=["assessments"])
api_router.include_router(attendance.router, tags=["attendance"])
api_router.include_router(reviews.router, tags=["reviews"])

# Reports and exports
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
