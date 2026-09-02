from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Tuple
from src.models.valuation_model import PropertyValuationModel
from src.models.recommendation_model import RecommendationEngine, InvestmentStyle
from src.models.risk_assessment import RiskAssessmentModel

router = APIRouter()

# Initialize models
valuation_model = PropertyValuationModel()
recommendation_engine = RecommendationEngine()
risk_model = RiskAssessmentModel()

# Request/Response models
class PropertyFeatures(BaseModel):
    square_feet: float
    bedrooms: int
    bathrooms: float
    city: str
    age: int
    lot_size: float = 0
    condition: str = "good"

class ValuationRequest(BaseModel):
    properties: List[PropertyFeatures]

class InvestorProfile(BaseModel):
    investment_style: str
    target_roi: float
    risk_tolerance: str
    max_budget: float
    preferred_cities: List[str] = []
    min_sqft: int = 800
    max_sqft: int = 5000

class RecommendationRequest(BaseModel):
    investor_profile: InvestorProfile
    available_properties: List[Dict]
    market_data: Dict
    portfolio_context: Optional[Dict] = None
    max_recommendations: int = 10

class FinancialData(BaseModel):
    purchase_price: float
    down_payment: float
    interest_rate: float
    annual_rental_income: float = 0
    annual_expenses: float = 0
    annual_debt_service: float = 0

class RiskAssessmentRequest(BaseModel):
    property_data: Dict
    market_data: Dict
    financial_data: Dict
    investment_style: str = "rental"

# Valuation endpoints
@router.post("/valuate")
async def valuate_property(request: PropertyFeatures):
    """Estimate property value using ML model"""

    try:
        prediction = valuation_model.predict(
            square_feet=request.square_feet,
            bedrooms=request.bedrooms,
            bathrooms=request.bathrooms,
            city=request.city,
            age=request.age,
            lot_size=request.lot_size,
            condition=request.condition,
        )

        explanation = valuation_model.explain_prediction(
            prediction,
            request.dict()
        )

        return {
            "data": {
                "estimated_value": prediction.estimated_value,
                "confidence_interval": {
                    "low": prediction.confidence_interval_low,
                    "high": prediction.confidence_interval_high,
                },
                "confidence_score": prediction.confidence_score,
                "key_factors": prediction.key_factors,
                "explanation": explanation,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/valuate-batch")
async def valuate_batch(request: ValuationRequest):
    """Estimate values for multiple properties"""

    try:
        properties = [p.dict() for p in request.properties]
        predictions = valuation_model.predict_batch(properties)

        return {
            "data": [
                {
                    "estimated_value": p.estimated_value,
                    "confidence_interval": {
                        "low": p.confidence_interval_low,
                        "high": p.confidence_interval_high,
                    },
                    "confidence_score": p.confidence_score,
                    "key_factors": p.key_factors,
                }
                for p in predictions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/model-info")
async def get_model_info():
    """Get information about the valuation model"""

    return {
        "data": {
            "valuation_model": valuation_model.get_model_info(),
            "feature_importance": valuation_model.get_feature_importance(),
        }
    }

# Recommendation endpoints
@router.post("/recommend")
async def get_recommendations(request: RecommendationRequest):
    """Generate investment recommendations for investor profile"""

    try:
        recommendations = recommendation_engine.recommend(
            investor_profile=request.investor_profile.dict(),
            available_properties=request.available_properties,
            market_data=request.market_data,
            portfolio_context=request.portfolio_context,
            max_recommendations=request.max_recommendations,
        )

        return {
            "data": [
                {
                    "property_id": r.property_id,
                    "property_address": r.property_address,
                    "match_score": r.match_score,
                    "recommendation_type": r.recommendation_type,
                    "reasoning": r.reasoning,
                    "risk_level": r.risk_level,
                    "estimated_annual_return": r.estimated_annual_return,
                    "estimated_roi": r.estimated_roi,
                    "alignment_score": r.alignment_score,
                }
                for r in recommendations
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Risk assessment endpoints
@router.post("/assess-risk")
async def assess_risk(request: RiskAssessmentRequest):
    """Comprehensive risk assessment for property investment"""

    try:
        assessment = risk_model.assess(
            property_data=request.property_data,
            market_data=request.market_data,
            financial_data=request.financial_data.dict(),
            investment_style=request.investment_style,
        )

        return {
            "data": {
                "overall_risk_score": assessment.overall_risk_score,
                "risk_level": assessment.risk_level,
                "risk_breakdown": {k.value: v for k, v in assessment.risk_breakdown.items()},
                "key_risks": assessment.key_risks,
                "mitigations": assessment.mitigations,
                "recommendation": assessment.recommendation,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_models_info():
    """Get list of available ML models"""

    return {
        "data": {
            "models": [
                {
                    "name": "Property Valuation Model",
                    "endpoint": "/models/valuate",
                    "description": "ML-based property valuation with confidence intervals",
                },
                {
                    "name": "Recommendation Engine",
                    "endpoint": "/models/recommend",
                    "description": "Investment recommendations based on investor profile",
                },
                {
                    "name": "Risk Assessment Model",
                    "endpoint": "/models/assess-risk",
                    "description": "Comprehensive risk analysis for real estate investments",
                },
            ]
        }
    }
