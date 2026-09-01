import numpy as np
from typing import Dict, Any
from pydantic import BaseModel

class PropertyFeatures(BaseModel):
    bedrooms: int
    bathrooms: float
    square_feet: int
    lot_size: float
    year_built: int
    city: str
    state: str
    zip_code: str

class ValuationResult(BaseModel):
    estimated_value: float
    confidence_interval_low: float
    confidence_interval_high: float
    valuation_breakdown: Dict[str, Any]

class ValuationService:
    """Simple property valuation service using heuristic pricing."""

    # Base prices per sqft by city (simplified)
    CITY_PRICE_MULTIPLIER = {
        "Denver": 250,
        "Boulder": 320,
        "Aurora": 200,
        "Fort Collins": 210,
        "Colorado Springs": 180,
    }

    # Feature adjustments
    BEDROOM_PREMIUM = 50000  # $50k per bedroom
    BATHROOM_PREMIUM = 30000  # $30k per bathroom
    YEAR_AGE_PENALTY = 1500  # $1.5k per year old (depreciation)

    @classmethod
    def estimate_value(cls, features: PropertyFeatures) -> ValuationResult:
        """Estimate property value based on features."""

        # Get base price per sqft for city
        base_price_sqft = cls.CITY_PRICE_MULTIPLIER.get(
            features.city, 250
        )

        # Calculate base value from square footage
        base_value = features.square_feet * base_price_sqft

        # Add bedroom premium
        bedroom_adjustment = features.bedrooms * cls.BEDROOM_PREMIUM

        # Add bathroom premium
        bathroom_adjustment = features.bathrooms * cls.BATHROOM_PREMIUM

        # Calculate age and apply depreciation
        import datetime
        current_year = datetime.datetime.now().year
        age = current_year - features.year_built
        age_adjustment = max(-age * cls.YEAR_AGE_PENALTY, -150000)  # Cap depreciation

        # Lot size bonus (every 1000 sqft adds 10% value)
        lot_bonus = (features.lot_size / 1000) * (base_value * 0.001)

        # Calculate total estimated value
        estimated_value = (
            base_value +
            bedroom_adjustment +
            bathroom_adjustment +
            age_adjustment +
            lot_bonus
        )

        # Add confidence interval (±10%)
        confidence_interval = estimated_value * 0.10

        # Breakdown
        valuation_breakdown = {
            "base_value_sqft": {
                "amount": base_value,
                "description": f"{features.square_feet} sqft × ${base_price_sqft}/sqft"
            },
            "bedroom_adjustment": {
                "amount": bedroom_adjustment,
                "description": f"{features.bedrooms} bedrooms × ${cls.BEDROOM_PREMIUM}"
            },
            "bathroom_adjustment": {
                "amount": bathroom_adjustment,
                "description": f"{features.bathrooms} bathrooms × ${cls.BATHROOM_PREMIUM}"
            },
            "age_adjustment": {
                "amount": age_adjustment,
                "description": f"{age} years old (depreciation)"
            },
            "lot_bonus": {
                "amount": lot_bonus,
                "description": f"Lot size bonus ({features.lot_size} sqft)"
            }
        }

        return ValuationResult(
            estimated_value=round(estimated_value, 2),
            confidence_interval_low=round(estimated_value - confidence_interval, 2),
            confidence_interval_high=round(estimated_value + confidence_interval, 2),
            valuation_breakdown=valuation_breakdown
        )
