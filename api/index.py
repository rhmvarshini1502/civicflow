import sys
import os

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app as main_app

# Vercel python runtime strictly requires the exported ASGI object to be named 'app'
app = main_app
