from pydantic import BaseModel, Field
from typing import List, Optional

class MismatchExplanationResponse(BaseModel):
    explanation: str = Field(description="Audit explanation of the discrepancy.")
    category_prediction: str = Field(description="Operating transaction class prediction.")
    suggested_action: str = Field(description="Remediation steps recommended for manual approval.")
    confidence_score: int = Field(ge=0, le=100, description="Estimated inference accuracy score.")
    confidence_indicator: str = Field(description="Quality level: HIGH, MEDIUM, LOW")

class NarrationParsingResponse(BaseModel):
    merchant_name: str = Field(description="Extracted merchant name.")
    predicted_category: str = Field(description="Expense bookkeeping category.")
    cleaned_narration: str = Field(description="Prettified transaction detail narration.")
    confidence_score: int = Field(ge=0, le=100, description="Estimated accuracy score.")

class ReconciliationSummaryInsightResponse(BaseModel):
    observations: str = Field(description="Overall matching review and trend observations.")
    insights: List[str] = Field(description="Curated list of operational or structural findings.")
    confidence_score: int = Field(ge=0, le=100)
    confidence_indicator: str
