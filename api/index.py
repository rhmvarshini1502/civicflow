import sys
import os
from fastapi import FastAPI, Request

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app as main_app

app = FastAPI(title="CivicFlow Master Gateway")

@app.middleware("http")
async def vercel_routing_middleware(request: Request, call_next):
    # Vercel passes the original requested URL in headers (x-forwarded-uri / x-matched-path)
    original_uri = request.headers.get("x-forwarded-uri") or request.headers.get("x-matched-path")
    if original_uri:
        # Extract clean path without query parameters
        clean_path = original_uri.split("?")[0]
        request.scope["path"] = clean_path
    return await call_next(request)

# Mount main_app to handle all incoming routes
app.mount("/", main_app)

handler = app
