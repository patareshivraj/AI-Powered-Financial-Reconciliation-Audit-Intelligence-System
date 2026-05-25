import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "BANK AI — Financial Reconciliation & Transaction Intelligence"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings - sqlite initially, postgres ready
    DATABASE_URL: str = Field(
        default="sqlite:///./app.db",
        description="SQLAlchemy database connection string. Can be swapped to Postgres in production."
    )
    
    # Upload & Report directories
    UPLOAD_DIR: str = Field(default="./uploads", description="Directory to safely store uploaded statement files.")
    REPORTS_DIR: str = Field(default="./reports", description="Directory to store exported reconciliation sheets.")
    
    # File Validation Thresholds (Fintech-grade rules)
    MAX_UPLOAD_SIZE: int = Field(default=52428800, description="Max upload size in bytes (50MB).")
    ALLOWED_EXTENSIONS: List[str] = ["csv", "xlsx"]
    
    # CORS policy
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Groq AI Settings (Phase 3 Activation)
    GROQ_API_KEY: str = Field(default="", description="Groq AI API authorization token.")
    GROQ_MODEL: str = Field(default="llama3-70b-8192", description="Target Llama Groq Model.")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

# Instantiate settings
settings = Settings()
