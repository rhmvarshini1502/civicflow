# CivicFlow 🌐
> **Report Problems. Track Action. Improve Your City.**

CivicFlow is a citizen-driven civic accountability and issue-tracking platform built for hackathons. Unlike basic complaint-filing portals, CivicFlow focuses on closing the civic loop using a structured lifecycle: **Report → Classify → Assign → Track → Remind → Escalate → Verify → Close**. 

Every complaint requires evidence, has an assigned municipal department, tracks a firm SLA resolution countdown, escalates automatically on delay, and cannot be closed without citizen verification and before/after photo comparisons.

---

## 🛠️ Technology Stack

* **Backend**: Python, FastAPI, SQLite (development database), SQLAlchemy (ORM), JWT Authentication, Bcrypt hashing.
* **AI Service**: Google Gemini API integration (with local keyword regex-based classifier fallback).
* **Frontend**: React (Vite), Tailwind CSS v3, Recharts (analytics graphs), Leaflet JS (interactive OpenStreetMap visual map), Lucide React (icons).

---

## 🚀 Quick Start Instructions

### 1. Backend Server Setup
From the `backend` folder:
1. Ensure Python 3.10+ is installed.
2. Initialize virtual environment:
   ```bash
   py -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows Powershell**: `.\venv\Scripts\Activate.ps1`
   * **Windows CMD**: `.\venv\Scripts\activate.bat`
   * **macOS/Linux**: `source venv/bin/activate`
4. Install python packages:
   ```bash
   pip install -r requirements.txt
   ```
5. Seed the SQLite database with 50+ realistic initial complaints, users, and departments:
   ```bash
   python -m app.seed
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```
   *The Swagger API documentation will be available at `http://120.0.0.1:8000/docs` (or localhost).*

### 2. Frontend Client Setup
From the `frontend` folder:
1. Install Node modules:
   ```bash
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 🧑‍💻 Hackathon Presentation Accounts
To make demonstrating the platform to judges seamless, we provide quick-login shortcuts on the sign-in modal for the three primary system roles:

1. **Citizen Reporter**
   * **Email**: `citizen@civicflow.org`
   * **Password**: `password`
   * **Features**: Submit issues with base64 photos, search/filter, upvote/support nearby reports to prevent duplication, view notifications of resolution, slide before/after photo comparisons, verify fixes (+20 XP points) or reopen ticket.
   
2. **Department Resolver (Officer)**
   * **Email**: `authority@civicflow.org`
   * **Password**: `password`
   * **Features**: View incoming queue of assigned issues (e.g. road repair, garbage), accept assignments (changes status to `In Progress`), upload final completion photos and notes to mark issues as `Resolved`.

3. **Platform Administrator**
   * **Email**: `admin@civicflow.org`
   * **Password**: `password`
   * **Features**: Monitor live city metrics, inspect SLA compliance charts, oversee supervisor and commissioner escalations, read AI hotspot analysis reports.

---

## 💡 Key Platform Capabilities

1. **Automated SLA Countdown**: Critical issues must be resolved within 24 hours, high-severity within 3 days, medium within 7 days, and low within 14 days. Countdowns highlight remaining time or overdue days.
2. **SLA Escalation Engine**: If deadlines are breached, the system records simulated escalations (Supervisor alert, then Higher Municipal Authority alert) and notifies citizens of the escalation history.
3. **Smart Duplicate Prevention**: Pinpointing location checks within a 150m radius of existing category complaints. The citizen is encouraged to "Support Existing Issue" (upvote) to build collective pressure instead of creating duplicates.
4. **Before/After slider**: Citizens can inspect repairs using an interactive comparison slider comparing original photos and resolution photos.
5. **AI Routing**: FastAPI parses the textual description to identify categories, select departments, assign severity levels, and generate concise summaries. Works in mock mode when `GEMINI_API_KEY` is not present.
