import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    date_of_birth: date
    gender: Optional[str] = None
    disability_category: str = Field(..., min_length=1, max_length=150)
    enrollment_date: date
    grade_class: str = Field(..., min_length=1, max_length=50)
    strengths: Optional[str] = None
    areas_of_need: Optional[str] = None
    learning_style: Optional[str] = None
    languages_known: Optional[str] = None
    assistive_devices: Optional[str] = None


class StudentCreate(StudentBase):
    admission_number: str = Field(..., min_length=1, max_length=100)
    diagnosis: Optional[str] = None
    udid_number_encrypted: Optional[str] = None


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    disability_category: Optional[str] = None
    enrollment_date: Optional[date] = None
    grade_class: Optional[str] = None
    strengths: Optional[str] = None
    areas_of_need: Optional[str] = None
    learning_style: Optional[str] = None
    languages_known: Optional[str] = None
    assistive_devices: Optional[str] = None
    diagnosis: Optional[str] = None


class GuardianBriefSchema(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str]
    relationship_label: Optional[str]
    is_primary: bool

    model_config = {"from_attributes": True}


class StaffAssignmentSchema(BaseModel):
    user_id: uuid.UUID
    full_name: str
    role: str
    assignment_type: str

    model_config = {"from_attributes": True}


class StudentResponse(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    admission_number: str
    full_name: str
    date_of_birth: date
    gender: Optional[str]
    disability_category: str
    enrollment_date: date
    grade_class: str
    strengths: Optional[str]
    areas_of_need: Optional[str]
    learning_style: Optional[str]
    languages_known: Optional[str]
    assistive_devices: Optional[str]
    profile_image_path: Optional[str]
    is_active: bool
    created_at: datetime
    # Restricted fields - only shown to authorized roles
    diagnosis: Optional[str] = None
    udid_number_masked: Optional[str] = None  # always masked in responses

    model_config = {"from_attributes": True}


class StudentDetailResponse(StudentResponse):
    guardians: List[GuardianBriefSchema] = []
    assigned_staff: List[StaffAssignmentSchema] = []


class StudentListResponse(BaseModel):
    items: List[StudentResponse]
    total: int
    page: int
    page_size: int
