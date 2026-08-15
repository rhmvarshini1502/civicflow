import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="citizen", nullable=False)  # citizen, department, admin
    points = Column(Integer, default=0, nullable=False)  # Gamification contribution score
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaints = relationship("Complaint", back_populates="user", foreign_keys="Complaint.user_id")
    notifications = relationship("Notification", back_populates="user")
    verifications = relationship("Verification", back_populates="user")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    area = Column(String, nullable=False)  # e.g., "North Zone", "South Zone", "All"
    contact_email = Column(String, nullable=False)

    # Relationships
    complaints = relationship("Complaint", back_populates="department")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_code = Column(String, unique=True, index=True, nullable=False)  # CF-YYYYMMDD-XXXX
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String, nullable=False)
    severity = Column(String, default="Medium", nullable=False)  # Low, Medium, High, Critical
    priority = Column(Integer, default=50, nullable=False)  # AI calculated priority score (0-100)
    status = Column(String, default="Reported", nullable=False)  # Reported, Assigned, In_Progress, Resolved, Reopened, Closed
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    support_count = Column(Integer, default=0, nullable=False)  # Number of citizens supporting/upvoting
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    deadline = Column(DateTime, nullable=True)  # SLA deadline based on severity
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="complaints", foreign_keys=[user_id])
    department = relationship("Department", back_populates="complaints")
    images = relationship("ComplaintImage", back_populates="complaint", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="complaint", cascade="all, delete-orphan")

class ComplaintImage(Base):
    __tablename__ = "complaint_images"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    image_url = Column(Text, nullable=False)  # Store base64 data URL for simplicity in local demo
    image_type = Column(String, default="before", nullable=False)  # before, after
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="images")

class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    level = Column(String, nullable=False)  # Supervisor, Higher Authority
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="escalations")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # User ID of the changer
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")
    changer = relationship("User", foreign_keys=[changed_by])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint")

class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    result = Column(String, nullable=False)  # Approved (Yes, Resolved), Rejected (No, Still Exists)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    complaint = relationship("Complaint", back_populates="verifications")
    user = relationship("User", back_populates="verifications")
