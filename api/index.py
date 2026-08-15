import sys
import os
import traceback

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

try:
    from app.main import app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI(title="CivicFlow Diagnostic Mode")
    err_msg = traceback.format_exc()
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    def diagnostic_fallback(path: str):
        return {
            "status": "error",
            "message": "FastAPI Serverless Initialization Error",
            "traceback": err_msg,
            "sys_path": sys.path
        }
