import sys
import os

# Add root directory and backend directory to sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(api_dir)
backend_dir = os.path.join(root_dir, "backend")

for path in [backend_dir, root_dir, api_dir]:
    if os.path.exists(path) and path not in sys.path:
        sys.path.insert(0, path)

from app.main import app
