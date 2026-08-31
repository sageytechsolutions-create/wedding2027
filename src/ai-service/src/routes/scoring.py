from fastapi import APIRouter
from pydantic import BaseModel
from services.scoring_service import (
    ScoringService,
    InvestmentProfile,
    PropertyValuationData,
    InvestmentScoreResult
)

router = APIRouter()

class ScoringRequest(BaseModel):
    profile: InvestmentProfile
    property_data: PropertyValuationData

@router.post("/score", response_model=InvestmentScoreResult)
async def score_property(request: ScoringRequest):
    """
    Score a property based on investment profile and property data.

    Returns:
    - **overall_score**: Overall investment score (0-100)
    - **roi_score**: Return on investment score
    - **cash_flow_score**: Cash flow score
    - **appreciation_score**: Appreciation potential score
    - **risk_score**: Risk score (higher = safer)
    - **recommendation**: AI recommendation
    - **key_factors**: Important factors affecting the score
    """
    return ScoringService.score_property(request.profile, request.property_data)
