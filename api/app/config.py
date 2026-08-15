import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "CivicFlow API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicflow_hackathon_super_secret_key_2026_987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for demo convenience
    
    # Database URL: use /tmp/civicflow.db on Vercel read-only filesystem
    default_db = "sqlite:////tmp/civicflow.db" if os.getenv("VERCEL") else "sqlite:///./civicflow.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db)
    
    # Gemini AI Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
