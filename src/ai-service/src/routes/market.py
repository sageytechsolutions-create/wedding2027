from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from src.services.market_analysis import MarketAnalysisService

router = APIRouter()
service = MarketAnalysisService()

class MarketAnalysisRequest(BaseModel):
    city: str
    state: str

class PriceForecastRequest(BaseModel):
    city: str
    state: str
    months: int = 6

class MarketComparisonRequest(BaseModel):
    cities: List[tuple[str, str]]

class InvestmentScoreRequest(BaseModel):
    city: str
    state: str
    property_price: float
    annual_rent: float

@router.post("/analyze")
async def analyze_market(request: MarketAnalysisRequest):
    """Analyze market for a specific location"""
    analysis = service.analyze_market(request.city, request.state)

    if not analysis:
        raise HTTPException(status_code=404, detail="Market not found")

    return {
        "data": {
            "location": analysis.location,
            "city": analysis.city,
            "state": analysis.state,
            "analysis_date": analysis.analysis_date,
            "average_price": analysis.average_price,
            "median_price": analysis.median_price,
            "price_per_sqft": analysis.price_per_sqft,
            "inventory_level": analysis.inventory_level,
            "days_on_market": analysis.days_on_market,
            "price_trend_6m": analysis.price_trend_6m,
            "price_trend_12m": analysis.price_trend_12m,
            "market_temperature": analysis.market_temperature,
            "median_home_age": analysis.median_home_age,
            "school_rating": analysis.school_rating,
            "crime_rate": analysis.crime_rate,
            "walkability_score": analysis.walkability_score,
        }
    }

@router.post("/trends")
async def get_price_trends(
    city: str = Query(...),
    state: str = Query(...),
    months: int = Query(12)
):
    """Get price trends for a location"""
    trends = service.get_price_trends(city, state, months)

    if not trends:
        raise HTTPException(status_code=404, detail="Market trends not found")

    return {
        "data": [
            {
                "month": t.month,
                "price": t.price,
                "inventory": t.inventory,
                "days_on_market": t.days_on_market,
                "price_change_percent": t.price_change_percent,
            }
            for t in trends
        ]
    }

@router.post("/forecast")
async def forecast_prices(request: PriceForecastRequest):
    """Forecast future prices for a location"""
    forecasts = service.forecast_prices(request.city, request.state, request.months)

    if not forecasts:
        raise HTTPException(status_code=404, detail="Market not found")

    return {"data": forecasts}

@router.post("/compare")
async def compare_markets(request: MarketComparisonRequest):
    """Compare markets across multiple cities"""
    comparison = service.get_market_comparison(request.cities)

    if not comparison:
        raise HTTPException(status_code=404, detail="No markets found")

    return {"data": comparison}

@router.post("/investment-score")
async def calculate_investment_score(request: InvestmentScoreRequest):
    """Calculate investment score for a property in a market"""
    score = service.get_investment_score(
        request.city,
        request.state,
        request.property_price,
        request.annual_rent,
    )

    if "error" in score:
        raise HTTPException(status_code=404, detail=score["error"])

    return {"data": score}

@router.get("/")
async def get_available_markets():
    """Get list of available markets for analysis"""
    markets = [
        {"city": "Denver", "state": "CO"},
        {"city": "Boulder", "state": "CO"},
        {"city": "Aurora", "state": "CO"},
        {"city": "Fort Collins", "state": "CO"},
    ]
    return {"data": markets}
