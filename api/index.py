import sys
import os
from fastapi import FastAPI, Request

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app as main_app

# Master ASGI gateway that forwards raw ASGI scope to main_app regardless of path rewrites
app = FastAPI(title="CivicFlow Master Gateway")

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def catch_all_gateway(request: Request, path: str):
    return await main_app(request.scope, request._receive, request._send)

handler = app
