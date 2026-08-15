from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: str = "citizen"  # citizen, department, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    points: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str
    area: str
    contact_email: EmailStr

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

# --- Complaint Image Schemas ---
class ComplaintImageBase(BaseModel):
    image_url: str  # Base64 string for demo simplicity
    image_type: str = "before"  # before, after

class ComplaintImageResponse(BaseModel):
    id: int
    complaint_id: int
    image_url: str
    image_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Escalation Schemas ---
class EscalationResponse(BaseModel):
    id: int
    complaint_id: int
    level: str
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Status History Schemas ---
class ChangerResponse(BaseModel):
    id: int
    name: str
    role: str

    class Config:
        from_attributes = True

class StatusHistoryResponse(BaseModel):
    id: int
    old_status: str
    new_status: str
    changed_by: int
    notes: Optional[str] = None
    timestamp: datetime
    changer: ChangerResponse

    class Config:
        from_attributes = True

# --- Verification Schemas ---
class VerificationCreate(BaseModel):
    result: str  # Approved, Rejected
    reason: Optional[str] = None

class VerificationResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: int
    result: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Complaint Schemas ---
class ComplaintCreate(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    address: str
    image_url: Optional[str] = None  # Base64 data URI

class ComplaintStatusUpdate(BaseModel):
    status: str  # Assigned, In_Progress, Resolved, Closed
    notes: Optional[str] = None
    after_image_url: Optional[str] = None  # Base64 string for "Resolved" completion image

class ComplaintResponse(BaseModel):
    id: int
    complaint_code: str
    user_id: int
    category: str
    description: str
    latitude: float
    longitude: float
    address: str
    severity: str
    priority: int
    status: str
    department_id: Optional[int] = None
    support_count: int
    created_at: datetime
    deadline: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ComplaintDetailResponse(ComplaintResponse):
    images: List[ComplaintImageResponse] = []
    status_history: List[StatusHistoryResponse] = []
    escalations: List[EscalationResponse] = []
    verifications: List[VerificationResponse] = []
    user: UserResponse
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    complaint_id: Optional[int] = None
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI Analyzer Schema ---
class AIAnalyzeRequest(BaseModel):
    description: str
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AIAnalyzeResponse(BaseModel):
    category: str
    severity: str
    summary: str
    suggested_department: str
    priority: int
