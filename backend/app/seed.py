import datetime
import random
from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from .models import User, Department, Complaint, ComplaintImage, Escalation, StatusHistory, Notification, Verification
from .auth import get_password_hash

# Coordinates centered around a mock city center (e.g. Bangalore Koramangala area)
CENTER_LAT = 12.935
CENTER_LON = 77.624

CATEGORIES_DEPTS = {
    "Pothole": "Road Maintenance",
    "Garbage": "Sanitation & Waste Management",
    "Streetlight": "Public Lighting & Electricity",
    "Water Leakage": "Water & Sewerage",
    "Drainage": "Water & Sewerage",
    "Open Manhole": "Road Maintenance",
    "Traffic Signal": "Traffic Engineering",
    "Road Damage": "Road Maintenance",
    "Illegal Dumping": "Sanitation & Waste Management",
    "Other": "General Administration"
}

SEVERITY_DEADLINES = {
    "Critical": 1,  # 1 day
    "High": 3,      # 3 days
    "Medium": 7,    # 7 days
    "Low": 14       # 14 days
}

# Base64 mock images for Before/After to avoid external network dependencies
MOCK_BEFORE_IMAGES = {
    "Pothole": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23666'/><circle cx='200' cy='150' r='60' fill='%23222'/><path d='M160 120 L240 180 M240 120 L160 180' stroke='%23444' stroke-width='8'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Pothole &amp; Cracks</text></svg>",
    "Garbage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%238a7c6a'/><path d='M100 200 L150 120 L200 210 L250 150 L300 230' stroke='%233a3024' stroke-width='10' fill='none'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Garbage Pile</text></svg>",
    "Streetlight": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23111222'/><line x1='200' y1='50' x2='200' y2='250' stroke='%23444' stroke-width='6'/><circle cx='200' cy='50' r='20' fill='%23444'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Streetlight Off / Broken</text></svg>",
    "Water Leakage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%234b6b80'/><path d='M0 150 Q100 100 200 150 T400 150' fill='none' stroke='%237ec0ee' stroke-width='6'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Water Burst / Leakage</text></svg>",
    "Drainage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%234a5d4e'/><path d='M0 200 H400 M0 240 H400' stroke='%23223024' stroke-width='12'/><circle cx='200' cy='220' r='40' fill='%23151c16'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Clogged Drainage Overflow</text></svg>",
    "Open Manhole": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23555'/><circle cx='200' cy='150' r='50' fill='%23000' stroke='%23ff3b30' stroke-width='5'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Open Manhole Danger</text></svg>",
    "Traffic Signal": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23333'/><rect x='170' y='50' width='60' height='150' rx='10' fill='%23111'/><circle cx='200' cy='80' r='15' fill='%23444'/><circle cx='200' cy='125' r='15' fill='%23444'/><circle cx='200' cy='170' r='15' fill='%23444'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Traffic Signal Dead</text></svg>",
    "Road Damage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23777'/><path d='M50 150 L120 180 L200 130 L290 190 L350 140' stroke='%23333' stroke-width='10' fill='none'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Cave-in Road Damage</text></svg>",
    "Illegal Dumping": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%236e7a68'/><rect x='100' y='120' width='200' height='100' fill='%238c6239'/><path d='M80 220 L320 220' stroke='%23000' stroke-width='6'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Debris Dumping Site</text></svg>",
    "Other": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23888'/><path d='M150 150 L250 150' stroke='%23fff' stroke-width='6'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>BEFORE: Civic Infrastructure Defect</text></svg>"
}

MOCK_AFTER_IMAGES = {
    "Pothole": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23444'/><path d='M0 150 H400' stroke='%23fff' stroke-dasharray='10' stroke-width='2'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='lightgreen' text-anchor='middle'>AFTER: Repaved Smooth Road</text></svg>",
    "Garbage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%238fbc8f'/><circle cx='200' cy='120' r='30' fill='%232e8b57'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>AFTER: Cleaned &amp; Swept Area</text></svg>",
    "Streetlight": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%232c3539'/><line x1='200' y1='50' x2='200' y2='250' stroke='%23888' stroke-width='6'/><circle cx='200' cy='50' r='20' fill='%23ffd700'/><polygon points='200,50 100,300 300,300' fill='rgba(255,215,0,0.15)'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='%23ffd700' text-anchor='middle'>AFTER: Bright Light Restored</text></svg>",
    "Water Leakage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%235c755e'/><path d='M200 50 L200 250' stroke='%23222' stroke-width='16'/><rect x='170' y='120' width='60' height='40' rx='5' fill='%238b0000'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>AFTER: Pipe Replaced &amp; Sealed</text></svg>",
    "Drainage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23556b2f'/><circle cx='200' cy='150' r='40' fill='%23333' stroke='%23222' stroke-width='8'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>AFTER: Unclogged &amp; Flow Restored</text></svg>",
    "Open Manhole": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23666'/><circle cx='200' cy='150' r='50' fill='%23333' stroke='%23111' stroke-width='6'/><path d='M150 150 H250 M200 100 V200' stroke='%23111' stroke-width='4'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='lightgreen' text-anchor='middle'>AFTER: Secure Heavy Metal Lid Installed</text></svg>",
    "Traffic Signal": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23444'/><rect x='170' y='50' width='60' height='150' rx='10' fill='%23111'/><circle cx='200' cy='80' r='15' fill='%23ff4500'/><circle cx='200' cy='125' r='15' fill='%23ffd700'/><circle cx='200' cy='170' r='15' fill='%2300ff00'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='%2300ff00' text-anchor='middle'>AFTER: Operational Traffic Signal</text></svg>",
    "Road Damage": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23555'/><path d='M0 150 H400' stroke='%23ffcc00' stroke-width='4'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='lightgreen' text-anchor='middle'>AFTER: Road Resurfaced &amp; Marked</text></svg>",
    "Illegal Dumping": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%238fbc8f'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>AFTER: Fenced Off &amp; Warning Signs Posted</text></svg>",
    "Other": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%235f9ea0'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>AFTER: Repaired Infrastructure</text></svg>"
}

SAMPLE_COMPLAINTS = [
    # Road Maintenance / Potholes / Open Manholes
    {"category": "Pothole", "description": "Giant crater/pothole in the middle of 4th Block main road. Multiple scooters have slipped here.", "severity": "High", "address": "128, 4th Block, Koramangala, Bengaluru"},
    {"category": "Pothole", "description": "A cluster of deep potholes near the bus stop. Damaging tires and causing traffic jams.", "severity": "Medium", "address": "80 Feet Road, near Bus Depot, Koramangala"},
    {"category": "Open Manhole", "description": "A manhole cover is completely missing on the footpath. Extremely dangerous for pedestrians at night.", "severity": "Critical", "address": "17th Main Road, near post office, Koramangala"},
    {"category": "Road Damage", "description": "The asphalt has completely caved in near the sewer line connection.", "severity": "High", "address": "Koramangala 3rd Block, lane 5"},
    
    # Sanitation / Garbage
    {"category": "Garbage", "description": "Enormous heap of uncollected garbage left near the park entrance. Stray animals scattering it everywhere. Terrible smell.", "severity": "Medium", "address": "Park Road, Koramangala 1st Block"},
    {"category": "Garbage", "description": "Garbage bin overflowing for the last 5 days. Nobody has come to clean it up.", "severity": "Medium", "address": "Mestripalya, Koramangala"},
    {"category": "Illegal Dumping", "description": "Truck dumped construction debris and cement bags in the empty plot overnight.", "severity": "Medium", "address": "Koramangala 6th Block, behind commercial complex"},
    
    # Lighting
    {"category": "Streetlight", "description": "Three consecutive streetlights are not functioning. The entire lane is pitch black, making it unsafe for residents.", "severity": "Medium", "address": "Koramangala 5th Block, 1st Cross"},
    {"category": "Streetlight", "description": "Streetlight pole bulb is broken and hanging loosely by wires. Threat of falling on someone.", "severity": "High", "address": "12th Main Road, 4th Block, Koramangala"},
    
    # Water & Sewerage
    {"category": "Water Leakage", "description": "Main water pipeline is leaking, creating a massive puddle and wasting thousands of gallons of clean drinking water.", "severity": "High", "address": "Koramangala 7th Block, near water tank"},
    {"category": "Drainage", "description": "Sewage water is overflowing from the sewer chamber onto the residential street. Intolerable stench.", "severity": "High", "address": "Koramangala 8th Block, near police station"},
    {"category": "Drainage", "description": "Blocked stormwater drain. With light rain, the entire street gets flooded with dirty drainage water.", "severity": "High", "address": "National Games Village, Koramangala"},
    
    # Traffic
    {"category": "Traffic Signal", "description": "Traffic lights at the busy junction are dead. Complete chaos, near miss accidents happening.", "severity": "Critical", "address": "Koramangala Sony World Junction"},
    {"category": "Traffic Signal", "description": "Pedestrian crossing signal is stuck on red constantly. Walkers cannot cross safely.", "severity": "Medium", "address": "Koramangala Water Tank Junction"}
]

def seed_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if data already exists to avoid double seeding
    if db.query(User).first() is not None:
        print("Database already seeded. Skipping.")
        db.close()
        return

    print("Seeding database with realistic civic-tech data...")
    
    # 1. Create Departments
    departments = {}
    dept_names = set(CATEGORIES_DEPTS.values())
    for name in dept_names:
        dept = Department(
            name=name,
            area="Koramangala Zone",
            contact_email=f"contact.{name.lower().replace(' ', '.').replace('&', 'and')}@civicflow.gov.simulation"
        )
        db.add(dept)
        db.flush()
        departments[name] = dept
        
    # 2. Create Users
    citizen_pwd = get_password_hash("password")
    admin_pwd = get_password_hash("password")
    
    citizen1 = User(name="Jane Doe", email="citizen@civicflow.org", password_hash=citizen_pwd, role="citizen", points=240)
    citizen2 = User(name="John Smith", email="citizen2@civicflow.org", password_hash=citizen_pwd, role="citizen", points=85)
    citizen3 = User(name="Aria Patel", email="citizen3@civicflow.org", password_hash=citizen_pwd, role="citizen", points=15)
    
    authority_user = User(name="Officer Smith", email="authority@civicflow.org", password_hash=citizen_pwd, role="department", points=0)
    admin_user = User(name="System Administrator", email="admin@civicflow.org", password_hash=admin_pwd, role="admin", points=0)
    
    db.add_all([citizen1, citizen2, citizen3, authority_user, admin_user])
    db.flush()
    
    citizens = [citizen1, citizen2, citizen3]
    
    # 3. Create 50 Complaints across multiple states
    status_options = ["Reported", "Assigned", "In_Progress", "Resolved", "Closed", "Reopened", "Overdue", "Escalated"]
    
    # We will generate complaints
    for i in range(1, 55):
        # Pick category sample
        sample = random.choice(SAMPLE_COMPLAINTS)
        category = sample["category"]
        description = f"{sample['description']} (Ref ID: {1000 + i})"
        address = sample["address"]
        severity = sample["severity"]
        
        # Jitter coordinates around Koramangala center
        lat = CENTER_LAT + random.uniform(-0.015, 0.015)
        lon = CENTER_LON + random.uniform(-0.015, 0.015)
        
        # Determine status
        if i <= 8:
            status = "Reported"
        elif i <= 15:
            status = "Assigned"
        elif i <= 22:
            status = "In_Progress"
        elif i <= 32:
            status = "Resolved"
        elif i <= 40:
            status = "Closed"
        elif i <= 43:
            status = "Reopened"
        elif i <= 47:
            status = "Overdue"  # Handled below by custom deadline offset
        else:
            status = "Escalated"  # Handled below with deadline + escalations
            
        # Create timestamps
        days_ago = random.randint(1, 20)
        created_at = datetime.datetime.utcnow() - datetime.timedelta(days=days_ago)
        
        # Calculate deadline
        deadline_days = SEVERITY_DEADLINES.get(severity, 7)
        deadline = created_at + datetime.timedelta(days=deadline_days)
        
        # If status is overdue or escalated, force deadline to be in the past
        if status in ["Overdue", "Escalated"]:
            created_at = datetime.datetime.utcnow() - datetime.timedelta(days=12)
            deadline = created_at + datetime.timedelta(days=deadline_days)
            # Make sure it's in the past
            if deadline > datetime.datetime.utcnow():
                deadline = datetime.datetime.utcnow() - datetime.timedelta(days=2)
            # Re-map status to In_Progress or Assigned because Overdue is a calculated SLA state
            status = "In_Progress" if random.random() > 0.5 else "Assigned"
            is_sla_overdue = True
        else:
            is_sla_overdue = False
            
        code = f"CF-{created_at.strftime('%Y%m%d')}-{100000 + i}"
        
        dept_name = CATEGORIES_DEPTS.get(category, "General Administration")
        dept = departments.get(dept_name)
        
        comp_user = random.choice(citizens)
        
        comp = Complaint(
            complaint_code=code,
            user_id=comp_user.id,
            category=category,
            description=description,
            latitude=lat,
            longitude=lon,
            address=address,
            severity=severity,
            priority=random.randint(40, 95),
            status=status,
            department_id=dept.id if status != "Reported" else None,
            support_count=random.randint(0, 35),
            created_at=created_at,
            deadline=deadline
        )
        
        if status in ["Resolved", "Closed"]:
            comp.resolved_at = created_at + datetime.timedelta(days=random.randint(1, deadline_days))
            
        db.add(comp)
        db.flush()
        
        # Add Before Image
        before_img_data = MOCK_BEFORE_IMAGES.get(category, MOCK_BEFORE_IMAGES["Other"])
        img_before = ComplaintImage(
            complaint_id=comp.id,
            image_url=before_img_data,
            image_type="before",
            uploaded_at=created_at
        )
        db.add(img_before)
        
        # Add After Image if Resolved or Closed
        if status in ["Resolved", "Closed"]:
            after_img_data = MOCK_AFTER_IMAGES.get(category, MOCK_AFTER_IMAGES["Other"])
            img_after = ComplaintImage(
                complaint_id=comp.id,
                image_url=after_img_data,
                image_type="after",
                uploaded_at=comp.resolved_at
            )
            db.add(img_after)
            
        # Add status history
        hist1 = StatusHistory(
            complaint_id=comp.id,
            old_status="Reported",
            new_status="Reported",
            changed_by=comp_user.id,
            notes="Issue submitted by citizen.",
            timestamp=created_at
        )
        db.add(hist1)
        
        if status != "Reported":
            hist2 = StatusHistory(
                complaint_id=comp.id,
                old_status="Reported",
                new_status="Assigned",
                changed_by=admin_user.id,
                notes=f"Auto-assigned to {dept_name} based on AI classification.",
                timestamp=created_at + datetime.timedelta(hours=2)
            )
            db.add(hist2)
            
        if status in ["In_Progress", "Resolved", "Closed"]:
            hist3 = StatusHistory(
                complaint_id=comp.id,
                old_status="Assigned",
                new_status="In_Progress",
                changed_by=authority_user.id,
                notes="Department staff dispatched to resolve the issue.",
                timestamp=created_at + datetime.timedelta(days=1)
            )
            db.add(hist3)
            
        if status in ["Resolved", "Closed"]:
            hist4 = StatusHistory(
                complaint_id=comp.id,
                old_status="In_Progress",
                new_status="Resolved",
                changed_by=authority_user.id,
                notes="Issue fixed successfully. Work proof photo uploaded.",
                timestamp=comp.resolved_at
            )
            db.add(hist4)
            
        if status == "Closed":
            hist5 = StatusHistory(
                complaint_id=comp.id,
                old_status="Resolved",
                new_status="Closed",
                changed_by=comp_user.id,
                notes="Citizen verified the fix. Issue closed. Contribution points awarded.",
                timestamp=comp.resolved_at + datetime.timedelta(hours=4)
            )
            db.add(hist5)
            
            # Create verification
            verify = Verification(
                complaint_id=comp.id,
                user_id=comp_user.id,
                result="Approved",
                reason="Looks perfectly repaired. Thank you!",
                created_at=comp.resolved_at + datetime.timedelta(hours=4)
            )
            db.add(verify)
            
        if status == "Reopened":
            # Add after image but show citizen reopened it
            after_img_data = MOCK_AFTER_IMAGES.get(category, MOCK_AFTER_IMAGES["Other"])
            img_after = ComplaintImage(
                complaint_id=comp.id,
                image_url=after_img_data,
                image_type="after",
                uploaded_at=created_at + datetime.timedelta(days=3)
            )
            db.add(img_after)
            
            hist4 = StatusHistory(
                complaint_id=comp.id,
                old_status="In_Progress",
                new_status="Resolved",
                changed_by=authority_user.id,
                notes="Marked resolved by department.",
                timestamp=created_at + datetime.timedelta(days=3)
            )
            db.add(hist4)
            
            hist5 = StatusHistory(
                complaint_id=comp.id,
                old_status="Resolved",
                new_status="Reopened",
                changed_by=comp_user.id,
                notes="Citizen rejection: Pothole has not been filled completely. Dirt was just dumped in.",
                timestamp=created_at + datetime.timedelta(days=4)
            )
            db.add(hist5)
            
            verify = Verification(
                complaint_id=comp.id,
                user_id=comp_user.id,
                result="Rejected",
                reason="The pothole was not paved properly. Only some mud was placed, and it washed away in the rain today.",
                created_at=created_at + datetime.timedelta(days=4)
            )
            db.add(verify)
            
        # Add escalations for the Overdue/Escalated mock complaints
        if is_sla_overdue:
            # Escalation level 1
            esc1 = Escalation(
                complaint_id=comp.id,
                level="Supervisor",
                reason="SLA Response threshold breached. Issue automatically escalated to Department Supervisor.",
                created_at=deadline + datetime.timedelta(hours=1)
            )
            db.add(esc1)
            
            # If i > 50, escalate to level 2 as well
            if i > 50:
                esc2 = Escalation(
                    complaint_id=comp.id,
                    level="Higher Authority",
                    reason="No department action taken within 48 hours of Supervisor alert. Escalated to Municipal Commissioner.",
                    created_at=deadline + datetime.timedelta(days=2)
                )
                db.add(esc2)
                
    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
