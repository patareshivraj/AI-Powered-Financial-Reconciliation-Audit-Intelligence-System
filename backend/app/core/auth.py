"""
Authentication & RBAC Core
Implements JWT parsing, password hashing, and role-based access decorators.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.base import User
from app.core.config import settings
from app.utils.logging import logger

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# We expect JWT_SECRET to be defined in settings or fallback.
JWT_SECRET_KEY = getattr(settings, "JWT_SECRET", "super-secret-local-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

class TokenData:
    def __init__(self, email: str, role: str, org_id: str):
        self.email = email
        self.role = role
        self.org_id = org_id

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

class RoleChecker:
    """Dependency injection class to enforce RBAC rules"""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)) -> User:
        if user.role not in self.allowed_roles:
            logger.warning(f"Access denied for user {user.email} (Role: {user.role}) trying to access restricted endpoint.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your current role"
            )
        return user

# Predefined role dependencies
require_admin = RoleChecker(["ADMIN"])
require_analyst_or_admin = RoleChecker(["ADMIN", "ANALYST"])
require_any_role = RoleChecker(["ADMIN", "ANALYST", "AUDITOR"])
