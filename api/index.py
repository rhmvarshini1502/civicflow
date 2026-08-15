import sys
import os
from fastapi import FastAPI

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app as main_app

# Create a master gateway app that handles all /api and direct path routes seamlessly
app = FastAPI(title="CivicFlow Master Gateway")
app.mount("/api", main_app)
app.mount("/", main_app)

handler = app
