from pydantic import BaseModel, Field
from typing import List

class ReconciliationSummaryResponse(BaseModel):
    summary: str = Field(description="A clear, human-readable summary of the reconciliation results.")
    confidence_score: int = Field(ge=0, le=100)
    confidence_indicator: str = Field(description="HIGH/MEDIUM/LOW")

class MismatchExplanationResponse(BaseModel):
    status: str = Field(description="The status of the mismatch (e.g., AMOUNT_MISMATCH, DATE_MISMATCH).")
    explanation: str = Field(description="A non-authoritative explanation of the mismatch.")
    confidence_score: int = Field(ge=0, le=100)
    confidence_indicator: str = Field(description="HIGH/MEDIUM/LOW")

class NarrationParsingResponse(BaseModel):
    merchant: str = Field(description="Extracted clean vendor/merchant name.")
    category: str = Field(description="Expense bookkeeping category.")
    payment_mode: str = Field(description="Extracted payment mode.")
    confidence_score: int = Field(ge=0, le=100)

class OperationalInsightsResponse(BaseModel):
    insights: List[str] = Field(description="List of operational insights found in the data.")
    confidence_score: int = Field(ge=0, le=100)
    confidence_indicator: str = Field(description="HIGH/MEDIUM/LOW")
