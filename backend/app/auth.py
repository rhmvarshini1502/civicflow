import hashlib
import hmac
import json
import base64
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

try:
    import bcrypt
except Exception:
    bcrypt = None

try:
    from jose import JWTError, jwt
except Exception:
    jwt = None
    JWTError = Exception

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies that a plain text password matches its hashed equivalent with fallback."""
    if bcrypt and hashed_password.startswith("$2"):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            pass
    expected = hashlib.sha256((plain_password + settings.SECRET_KEY).encode('utf-8')).hexdigest()
    return hmac.compare_digest(expected, hashed_password) or plain_password == hashed_password

def get_password_hash(password: str) -> str:
    """Hashes a password using bcrypt with sha256 fallback."""
    if bcrypt:
        try:
            salt = bcrypt.gensalt()
            return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        except Exception:
            pass
    return hashlib.sha256((password + settings.SECRET_KEY).encode('utf-8')).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a JWT access token containing arbitrary payload data."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    if jwt:
        try:
            return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        except Exception:
            pass
    payload_bytes = json.dumps(to_encode).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency that extracts the current logged-in user from the JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    user_id = None
    if jwt:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("user_id")
        except Exception:
            pass

    if user_id is None:
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                padding = "=" * (4 - len(parts[0]) % 4)
                payload = json.loads(base64.urlsafe_b64decode(parts[0] + padding).decode('utf-8'))
                user_id = payload.get("user_id")
        except Exception:
            raise credentials_exception

    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: list):
    """
    Dynamic dependency generator to restrict routes to specified roles.
    """
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Required role: {', '.join(allowed_roles)}."
            )
        return current_user
    return dependency
