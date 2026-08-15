import sys
import os

# Add both workspace root and backend directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

for p in [backend_dir, root_dir, current_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except Exception as err:
    import traceback
    err_str = traceback.format_exc()
    from fastapi import FastAPI
    app = FastAPI(title="CivicFlow Emergency Fallback")
    
    @app.get("/api/{path:path}")
    def catch_all(path: str):
        return {"error": "Serverless Startup Exception", "details": str(err_str)}

handler = app
