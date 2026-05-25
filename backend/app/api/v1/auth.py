from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.models.base import User, Organization
from app.core.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.schemas.upload import StandardResponse
from app.utils.logging import logger

router = APIRouter(tags=["Authentication"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    org_id: str

@router.post("/signup", response_model=StandardResponse)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user and creates an organization if it doesn't exist.
    By default, the first user in a new org is an ADMIN.
    """
    logger.info(f"API: Attempting signup for {payload.email}")
    
    # Check if user already exists
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check or create organization
    org = db.query(Organization).filter(Organization.name == payload.organization_name).first()
    if not org:
        org = Organization(name=payload.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)
        role = "ADMIN" # First user is admin
    else:
        role = "ANALYST" # Subsequent users are analysts by default

    # Create user
    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        organization_id=org.id,
        role=role
    )
    db.add(new_user)
    db.commit()
    
    return StandardResponse(
        success=True,
        message="User successfully registered.",
        data={"email": new_user.email, "role": new_user.role, "organization_id": org.id}
    )

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 compatible token login, gets email/password from form data.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "org_id": user.organization_id},
        expires_delta=access_token_expires
    )
    
    logger.info(f"User {user.email} logged in successfully.")
    
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        org_id=user.organization_id
    )
