import datetime
import math
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .config import settings
from .database import get_db, engine, Base
from .models import User, Department, Complaint, ComplaintImage, Escalation, StatusHistory, Notification, Verification
from .schemas import (
    UserCreate, UserLogin, UserResponse, Token, TokenData,
    ComplaintCreate, ComplaintResponse, ComplaintDetailResponse, ComplaintStatusUpdate,
    VerificationCreate, NotificationResponse, AIAnalyzeRequest, AIAnalyzeResponse
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user, require_role
from .ai import analyze_complaint

app = FastAPI(title=settings.PROJECT_NAME)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

@app.on_event("startup")
def auto_seed_on_startup():
    try:
        from .seed import seed_db
        seed_db()
    except Exception as e:
        print("Auto-seed notification:", e)


# --- SLA Deadline & Escalation Engine Helper ---

def run_escalation_checks(db: Session):
    """
    Scans the database for active complaints that have breached their SLA deadline
    and applies simulated escalation workflows (Supervisor alert -> Higher Authority alert) in real time.
    """
    now = datetime.datetime.utcnow()
    
    # Active complaints are those not Resolved or Closed, where deadline is in the past
    overdue_complaints = db.query(Complaint).filter(
        Complaint.status.notin_(["Resolved", "Closed"]),
        Complaint.deadline < now
    ).all()
    
    for comp in overdue_complaints:
        overdue_delta = now - comp.deadline
        existing_levels = [esc.level for esc in comp.escalations]
        
        # Escalation Level 1: Supervisor (immediate breach)
        if "Supervisor" not in existing_levels:
            # Create escalation history
            esc = Escalation(
                complaint_id=comp.id,
                level="Supervisor",
                reason=f"SLA deadline breached. Time remaining: Overdue by {overdue_delta.days} days. Escalated to Department Supervisor.",
                created_at=comp.deadline + datetime.timedelta(hours=1)
            )
            db.add(esc)
            
            # Status History track
            hist = StatusHistory(
                complaint_id=comp.id,
                old_status=comp.status,
                new_status=comp.status,
                changed_by=1,  # System user ID / Admin fallback
                notes="SLA threshold breached: Escalated to Department Supervisor.",
                timestamp=comp.deadline + datetime.timedelta(hours=1)
            )
            db.add(hist)
            
            # Notify Citizen
            notif = Notification(
                user_id=comp.user_id,
                complaint_id=comp.id,
                message=f"Alert: Your complaint {comp.complaint_code} is overdue and has been escalated to the Department Supervisor.",
                created_at=now
            )
            db.add(notif)
            
        # Escalation Level 2: Higher Authority (overdue by more than 2 days)
        if overdue_delta.days >= 2 and "Higher Authority" not in existing_levels:
            esc = Escalation(
                complaint_id=comp.id,
                level="Higher Authority",
                reason="No resolution action within 48 hours of Supervisor alert. Escalated to Municipal Commissioner.",
                created_at=comp.deadline + datetime.timedelta(days=2)
            )
            db.add(esc)
            
            hist = StatusHistory(
                complaint_id=comp.id,
                old_status=comp.status,
                new_status=comp.status,
                changed_by=1,
                notes="SLA critical delay: Escalated to Higher Authority.",
                timestamp=comp.deadline + datetime.timedelta(days=2)
            )
            db.add(hist)
            
            notif = Notification(
                user_id=comp.user_id,
                complaint_id=comp.id,
                message=f"Critical: Your complaint {comp.complaint_code} has been escalated to the Higher Municipal Authority.",
                created_at=now
            )
            db.add(notif)
            
    db.commit()


# --- Authentication Endpoints ---

@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_pwd,
        role=user_data.role,
        points=10 if user_data.role == "citizen" else 0  # Starter points for registering
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Run SLA checks to ensure numbers are updated
    run_escalation_checks(db)
    
    total_reports = db.query(Complaint).filter(Complaint.user_id == current_user.id).count()
    resolved_reports = db.query(Complaint).filter(
        Complaint.user_id == current_user.id,
        Complaint.status == "Closed"
    ).count()
    pending_reports = db.query(Complaint).filter(
        Complaint.user_id == current_user.id,
        Complaint.status.notin_(["Closed", "Resolved"])
    ).count()
    
    # Calculate gamification badge level
    badge = "Novice Reporter"
    if current_user.points >= 250:
        badge = "Civic Champion"
    elif current_user.points >= 100:
        badge = "Community Helper"
        
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "points": current_user.points,
        "badge": badge,
        "stats": {
            "total_reports": total_reports,
            "resolved_reports": resolved_reports,
            "pending_reports": pending_reports
        }
    }


# --- Complaint Endpoints ---

@app.post("/api/complaints/check-duplicate")
def check_duplicate(data: dict, db: Session = Depends(get_db)):
    """
    Checks if a complaint of the same category has already been reported nearby (~150 meters).
    Distance calculation is approximated using standard coordinate bounding boxes.
    """
    category = data.get("category")
    lat = data.get("latitude")
    lon = data.get("longitude")
    
    if not lat or not lon:
        return {"has_duplicate": False, "duplicates": []}
        
    # Roughly 0.0015 degrees is ~150 meters
    lat_diff = 0.0015
    lon_diff = 0.0015
    
    duplicates = db.query(Complaint).filter(
        Complaint.category == category,
        Complaint.status.notin_(["Closed", "Resolved"]),
        Complaint.latitude.between(lat - lat_diff, lat + lat_diff),
        Complaint.longitude.between(lon - lon_diff, lon + lon_diff)
    ).all()
    
    return {
        "has_duplicate": len(duplicates) > 0,
        "duplicates": [
            {
                "id": d.id,
                "complaint_code": d.complaint_code,
                "category": d.category,
                "address": d.address,
                "status": d.status,
                "support_count": d.support_count,
                "created_at": d.created_at,
                "distance_approx_m": int(math.sqrt((d.latitude - lat)**2 + (d.longitude - lon)**2) * 111000)
            }
            for d in duplicates
        ]
    }

@app.post("/api/complaints", response_model=ComplaintResponse)
def create_new_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine classification using local or remote AI
    ai_res = analyze_complaint(complaint_data.description, complaint_data.image_url)
    
    category = ai_res.get("category", complaint_data.category)
    severity = ai_res.get("severity", "Medium")
    priority = ai_res.get("priority", 50)
    suggested_dept_name = ai_res.get("suggested_department", "General Administration")
    
    # Check if department exists, if not, create it
    dept = db.query(Department).filter(Department.name == suggested_dept_name).first()
    if not dept:
        dept = Department(
            name=suggested_dept_name,
            area="Koramangala Zone",
            contact_email=f"contact.{suggested_dept_name.lower().replace(' ', '.')}@civicflow.gov.simulation"
        )
        db.add(dept)
        db.flush()
        
    # Generate unique complaint code CF-YYYYMMDD-XXXX
    now = datetime.datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    count = db.query(Complaint).filter(Complaint.complaint_code.like(f"CF-{date_str}-%")).count()
    complaint_code = f"CF-{date_str}-{100000 + count + 1}"
    
    # Calculate deadline based on severity SLA rules
    sla_hours = {"Critical": 24, "High": 72, "Medium": 168, "Low": 336}
    deadline = now + datetime.timedelta(hours=sla_hours.get(severity, 168))
    
    new_comp = Complaint(
        complaint_code=complaint_code,
        user_id=current_user.id,
        category=category,
        description=complaint_data.description,
        latitude=complaint_data.latitude,
        longitude=complaint_data.longitude,
        address=complaint_data.address,
        severity=severity,
        priority=priority,
        status="Assigned",  # Auto assigned due to AI parsing
        department_id=dept.id,
        created_at=now,
        deadline=deadline
    )
    db.add(new_comp)
    db.flush()
    
    # Add Image if provided
    if complaint_data.image_url:
        img = ComplaintImage(
            complaint_id=new_comp.id,
            image_url=complaint_data.image_url,
            image_type="before",
            uploaded_at=now
        )
        db.add(img)
        
    # Add initial status histories
    hist_reported = StatusHistory(
        complaint_id=new_comp.id,
        old_status="Reported",
        new_status="Reported",
        changed_by=current_user.id,
        notes="Citizen filed the issue via CivicFlow client app.",
        timestamp=now
    )
    hist_assigned = StatusHistory(
        complaint_id=new_comp.id,
        old_status="Reported",
        new_status="Assigned",
        changed_by=1,  # System
        notes=f"Auto-assigned to {suggested_dept_name} based on AI category analysis.",
        timestamp=now
    )
    db.add_all([hist_reported, hist_assigned])
    
    # Give user points for submitting a valid complaint
    current_user.points += 15
    db.add(current_user)
    
    db.commit()
    db.refresh(new_comp)
    return new_comp

@app.get("/api/complaints", response_model=List[ComplaintResponse])
def get_complaints(
    category: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    my_reports: bool = False,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Run SLA calculations so listing updates are synchronous
    run_escalation_checks(db)
    
    query = db.query(Complaint)
    
    if my_reports and current_user:
        query = query.filter(Complaint.user_id == current_user.id)
        
    if category:
        query = query.filter(Complaint.category == category)
    if status:
        if status == "Overdue":
            query = query.filter(
                Complaint.status.notin_(["Resolved", "Closed"]),
                Complaint.deadline < datetime.datetime.utcnow()
            )
        elif status == "Escalated":
            query = query.join(Escalation).distinct()
        else:
            query = query.filter(Complaint.status == status)
    if severity:
        query = query.filter(Complaint.severity == severity)
        
    if search:
        query = query.filter(
            (Complaint.description.like(f"%{search}%")) |
            (Complaint.complaint_code.like(f"%{search}%")) |
            (Complaint.address.like(f"%{search}%"))
        )
        
    return query.order_by(desc(Complaint.created_at)).all()

@app.get("/api/complaints/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_by_id(complaint_id: int, db: Session = Depends(get_db)):
    # Trigger escalation updates
    run_escalation_checks(db)
    
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return comp

@app.put("/api/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    data: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforce role logic
    if current_user.role not in ["department", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only department staff or administrators can update complaints."
        )
        
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    old_status = comp.status
    new_status = data.status
    
    valid_transitions = {
        "Assigned": ["In_Progress", "Resolved"],
        "In_Progress": ["Resolved"],
        "Resolved": ["Closed", "Reopened"],
        "Reopened": ["In_Progress", "Resolved"]
    }
    
    # Perform update
    comp.status = new_status
    now = datetime.datetime.utcnow()
    
    if new_status == "Resolved":
        if not data.after_image_url:
            raise HTTPException(
                status_code=400,
                detail="A resolution photo proof is required to resolve complaints."
            )
        comp.resolved_at = now
        
        # Add After image
        img = ComplaintImage(
            complaint_id=comp.id,
            image_url=data.after_image_url,
            image_type="after",
            uploaded_at=now
        )
        db.add(img)
        
        # Notify citizen to verify resolution
        notif = Notification(
            user_id=comp.user_id,
            complaint_id=comp.id,
            message=f"Your complaint {comp.complaint_code} is marked as RESOLVED by the department. Please verify the fix.",
            created_at=now
        )
        db.add(notif)
        
    hist = StatusHistory(
        complaint_id=comp.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=current_user.id,
        notes=data.notes or f"Status updated to {new_status} by department officer.",
        timestamp=now
    )
    db.add(hist)
    db.commit()
    return {"message": f"Complaint status successfully updated to {new_status}"}

@app.post("/api/complaints/{complaint_id}/support")
def support_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Check if citizen already supports it by checking notifications / upvotes
    # In a simplified SQLite design, we just increment and reward points.
    comp.support_count += 1
    
    # Reward citizen with points for supporting community reports
    current_user.points += 5
    db.add(current_user)
    
    # Notify creator of support
    if comp.user_id != current_user.id:
        notif = Notification(
            user_id=comp.user_id,
            complaint_id=comp.id,
            message=f"Another citizen supported your reported issue {comp.complaint_code}.",
            created_at=datetime.datetime.utcnow()
        )
        db.add(notif)
        
    db.commit()
    return {"message": "You supported this complaint successfully.", "support_count": comp.support_count}

@app.post("/api/complaints/{complaint_id}/verify")
def verify_complaint(
    complaint_id: int,
    data: VerificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    if comp.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the citizen who reported the issue can verify the resolution."
        )
        
    if comp.status != "Resolved":
        raise HTTPException(
            status_code=400,
            detail="Verification can only be done on resolved complaints."
        )
        
    now = datetime.datetime.utcnow()
    
    # Add verification log
    verify = Verification(
        complaint_id=comp.id,
        user_id=current_user.id,
        result=data.result,
        reason=data.reason,
        created_at=now
    )
    db.add(verify)
    
    old_status = comp.status
    if data.result == "Approved":
        comp.status = "Closed"
        # Give citizen bonus verification points
        current_user.points += 20
        db.add(current_user)
        
        hist = StatusHistory(
            complaint_id=comp.id,
            old_status=old_status,
            new_status="Closed",
            changed_by=current_user.id,
            notes=f"Citizen confirmed resolution. Feedback: {data.reason or 'Confirmed fixed.'}",
            timestamp=now
        )
        db.add(hist)
    else:
        comp.status = "Reopened"
        # Reset resolution parameters
        comp.resolved_at = None
        
        hist = StatusHistory(
            complaint_id=comp.id,
            old_status=old_status,
            new_status="Reopened",
            changed_by=current_user.id,
            notes=f"Citizen rejected resolution. Reason: {data.reason or 'Issue still persists.'}",
            timestamp=now
        )
        db.add(hist)
        
        # Notify department
        # In mock system we notify system admin
        admin = db.query(User).filter(User.role == "admin").first()
        if admin:
            notif = Notification(
                user_id=admin.id,
                complaint_id=comp.id,
                message=f"Complaint {comp.complaint_code} was marked as unresolved by the citizen.",
                created_at=now
            )
            db.add(notif)
            
    db.commit()
    return {"message": f"Verification saved. Complaint updated to {comp.status}."}


# --- Dashboard / Analytics Endpoints ---

@app.get("/api/dashboard/public")
def get_public_analytics(db: Session = Depends(get_db)):
    """
    Returns public accountability dashboard statistics:
    Totals, categories distribution, response metrics, department resolution ratings.
    """
    run_escalation_checks(db)
    
    total = db.query(Complaint).count()
    resolved = db.query(Complaint).filter(Complaint.status == "Closed").count()
    in_progress = db.query(Complaint).filter(Complaint.status == "In_Progress").count()
    assigned = db.query(Complaint).filter(Complaint.status == "Assigned").count()
    reopened = db.query(Complaint).filter(Complaint.status == "Reopened").count()
    
    # Overdue SLA complaints (not resolved or closed, deadline < now)
    now = datetime.datetime.utcnow()
    overdue = db.query(Complaint).filter(
        Complaint.status.notin_(["Resolved", "Closed"]),
        Complaint.deadline < now
    ).count()
    
    # Category distribution
    categories_raw = db.query(
        Complaint.category, func.count(Complaint.id)
    ).group_by(Complaint.category).all()
    categories_dist = [{"category": row[0], "count": row[1]} for row in categories_raw]
    
    # SLA performance per department
    dept_performance = []
    depts = db.query(Department).all()
    for d in depts:
        d_comps = db.query(Complaint).filter(Complaint.department_id == d.id).all()
        d_total = len(d_comps)
        if d_total == 0:
            continue
        d_resolved = sum(1 for c in d_comps if c.status in ["Closed", "Resolved"])
        d_overdue = sum(1 for c in d_comps if c.status not in ["Closed", "Resolved"] and c.deadline < now)
        
        # Calculate average resolution time for resolved ones
        res_times = []
        for c in d_comps:
            if c.resolved_at and c.created_at:
                delta = c.resolved_at - c.created_at
                res_times.append(delta.days)
        avg_res_days = round(sum(res_times) / len(res_times), 1) if res_times else 0.0
        
        dept_performance.append({
            "department": d.name,
            "total": d_total,
            "resolved": d_resolved,
            "pending": d_total - d_resolved,
            "overdue": d_overdue,
            "avg_resolution_days": avg_res_days
        })
        
    # AI insights Generation (Simulated)
    potholes_count = db.query(Complaint).filter(Complaint.category == "Pothole").count()
    drainage_count = db.query(Complaint).filter(Complaint.category == "Drainage").count()
    
    insights = [
        "AI Spot Alert: Infrastructure reports (Potholes, Road Damage) rose by 14% this month near East Sector.",
        f"Recurrent Issue Warning: The database identifies {drainage_count} active complaints for drainage overflow, suggesting potential sewer main blockages.",
        "SLA Efficiency Alert: Sanitation & Waste Management is resolving garbage collection complaints 1.2 days faster than last week."
    ]
    
    return {
        "stats": {
            "total": total,
            "resolved": resolved,
            "in_progress": in_progress,
            "assigned": assigned,
            "reopened": reopened,
            "overdue": overdue,
            "resolution_rate": round((resolved / total * 100), 1) if total > 0 else 0.0
        },
        "category_distribution": categories_dist,
        "department_performance": dept_performance,
        "ai_insights": insights
    }

@app.get("/api/dashboard/admin")
def get_admin_dashboard(current_user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    """
    Returns secure administrative KPI charts and metrics, and escalation cases.
    """
    run_escalation_checks(db)
    
    total_users = db.query(User).count()
    citizen_count = db.query(User).filter(User.role == "citizen").count()
    escalations_count = db.query(Escalation).count()
    
    # Public metrics
    public_data = get_public_analytics(db)
    
    # Active escalations
    recent_escalated = db.query(Escalation).order_by(desc(Escalation.created_at)).limit(10).all()
    escalation_list = [
        {
            "id": esc.complaint_id,
            "complaint_code": esc.complaint.complaint_code,
            "category": esc.complaint.category,
            "level": esc.level,
            "reason": esc.reason,
            "created_at": esc.created_at
        }
        for esc in recent_escalated
    ]
    
    return {
        **public_data,
        "admin_stats": {
            "total_users": total_users,
            "citizen_count": citizen_count,
            "escalations_count": escalations_count
        },
        "recent_escalations": escalation_list
    }


# --- Notifications ---

@app.get("/api/notifications", response_model=List[NotificationResponse])
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(30).all()

@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.read = True
    db.commit()
    return {"message": "Notification marked as read"}


# --- AI Service raw tester endpoint ---

@app.post("/api/ai/analyze", response_model=AIAnalyzeResponse)
def api_ai_analyze(request: AIAnalyzeRequest):
    res = analyze_complaint(request.description, request.image_url)
    return res
