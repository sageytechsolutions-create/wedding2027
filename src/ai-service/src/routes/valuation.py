from fastapi import APIRouter
from services.valuation_service import ValuationService, PropertyFeatures, ValuationResult

router = APIRouter()

@router.post("/estimate", response_model=ValuationResult)
async def estimate_property_value(features: PropertyFeatures):
    """
    Estimate property value based on features.

    - **bedrooms**: Number of bedrooms
    - **bathrooms**: Number of bathrooms
    - **square_feet**: Total square footage
    - **lot_size**: Lot size in square feet
    - **year_built**: Year property was built
    - **city**: City name
    - **state**: State abbreviation
    - **zip_code**: ZIP code
    """
    return ValuationService.estimate_value(features)
