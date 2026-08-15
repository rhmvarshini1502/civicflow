import sys
import os
from mangum import Mangum

api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from app.main import app

handler = Mangum(app, api_gateway_base_path="/api")
