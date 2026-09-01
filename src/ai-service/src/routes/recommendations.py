from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Recommendation(BaseModel):
    property_id: str
    match_score: float
    reason: str

class RecommendationsRequest(BaseModel):
    user_id: str
    investment_style: str
    target_locations: List[str]
    max_budget: float

@router.post("/", response_model=List[Recommendation])
async def get_deal_recommendations(request: RecommendationsRequest):
    """
    Get personalized deal recommendations based on investment profile.

    **Note**: Phase 1 returns mock data. Phase 2 will integrate with property database.
    """
    # Mock recommendations for now
    return [
        {
            "property_id": "prop_123",
            "match_score": 85.5,
            "reason": "Strong cash flow potential in preferred location"
        },
        {
            "property_id": "prop_456",
            "match_score": 78.0,
            "reason": "Good appreciation potential based on market trends"
        }
    ]
