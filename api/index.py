import sys
import os

# Locate the bundled backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

for p in [backend_dir, root_dir, current_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except Exception as err:
    import traceback
    err_str = traceback.format_exc()
    from fastapi import FastAPI
    app = FastAPI(title="CivicFlow Emergency Fallback")
    
    @app.get("/api/health")
    def health():
        return {
            "error": "Module import failed", 
            "details": str(err_str), 
            "sys_path": sys.path, 
            "current_dir": current_dir,
            "root_dir_contents": os.listdir(root_dir) if os.path.exists(root_dir) else []
        }

handler = app
