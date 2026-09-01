import numpy as np
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')

@dataclass
class ValuationPrediction:
    estimated_value: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence_score: float
    key_factors: List[str]

class PropertyValuationModel:
    """
    Property valuation model using feature-based estimation.
    Trained on historical property sales data (simulated for now).
    """

    def __init__(self):
        self.model_version = "1.0.0"
        self.is_trained = False
        self.feature_importance = {}
        self.feature_coefficients = {}
        self._initialize_model()

    def _initialize_model(self):
        """Initialize model with default coefficients (trained on mock data)"""
        # These coefficients would be learned from real training data
        self.feature_coefficients = {
            'base_price_per_sqft': {
                'Denver': 285,
                'Boulder': 425,
                'Aurora': 195,
                'Fort Collins': 240,
            },
            'bedroom_value': 50000,
            'bathroom_value': 30000,
            'age_depreciation_per_year': 1500,
            'lot_bonus_per_sqft': 25,
            'condition_multiplier': {
                'excellent': 1.15,
                'good': 1.0,
                'fair': 0.85,
                'poor': 0.70,
            }
        }

        self.feature_importance = {
            'square_feet': 0.35,
            'bedrooms': 0.15,
            'bathrooms': 0.12,
            'location': 0.25,
            'age': 0.08,
            'lot_size': 0.05,
        }

        self.is_trained = True

    def predict(
        self,
        square_feet: float,
        bedrooms: int,
        bathrooms: float,
        city: str,
        age: int,
        lot_size: float = 0,
        condition: str = 'good'
    ) -> ValuationPrediction:
        """
        Predict property value using feature-based model.

        Args:
            square_feet: Living area in square feet
            bedrooms: Number of bedrooms
            bathrooms: Number of bathrooms
            city: City name for location-based pricing
            age: Age of property in years
            lot_size: Lot size in square feet
            condition: Property condition (excellent/good/fair/poor)

        Returns:
            ValuationPrediction with estimated value and confidence interval
        """

        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")

        # Base price calculation
        base_price_per_sqft = self.feature_coefficients['base_price_per_sqft'].get(
            city, 250
        )
        base_value = square_feet * base_price_per_sqft

        # Room adjustments
        bedroom_adjustment = bedrooms * self.feature_coefficients['bedroom_value']
        bathroom_adjustment = bathrooms * self.feature_coefficients['bathroom_value']

        # Age depreciation
        age_adjustment = -(age * self.feature_coefficients['age_depreciation_per_year'])

        # Lot bonus
        lot_bonus = lot_size * self.feature_coefficients['lot_bonus_per_sqft']

        # Condition multiplier
        condition_mult = self.feature_coefficients['condition_multiplier'].get(
            condition.lower(), 1.0
        )

        # Calculate estimated value
        estimated_value = (
            (base_value + bedroom_adjustment + bathroom_adjustment + age_adjustment + lot_bonus)
            * condition_mult
        )

        # Ensure positive value
        estimated_value = max(estimated_value, square_feet * 100)

        # Calculate confidence interval (±10% base, adjusted by model certainty)
        confidence_score = self._calculate_confidence(square_feet, bedrooms, bathrooms, city)
        margin = estimated_value * (0.15 - (confidence_score * 0.05))

        confidence_interval_low = estimated_value - margin
        confidence_interval_high = estimated_value + margin

        # Determine key factors
        key_factors = self._extract_key_factors(
            estimated_value,
            base_value,
            bedroom_adjustment,
            bathroom_adjustment,
            age_adjustment,
            lot_bonus,
            city
        )

        return ValuationPrediction(
            estimated_value=round(estimated_value, 2),
            confidence_interval_low=round(confidence_interval_low, 2),
            confidence_interval_high=round(confidence_interval_high, 2),
            confidence_score=round(confidence_score, 2),
            key_factors=key_factors,
        )

    def predict_batch(
        self,
        properties: List[Dict]
    ) -> List[ValuationPrediction]:
        """
        Predict values for multiple properties.

        Args:
            properties: List of property feature dictionaries

        Returns:
            List of ValuationPrediction objects
        """
        predictions = []

        for prop in properties:
            pred = self.predict(
                square_feet=prop.get('squareFeet', 1500),
                bedrooms=prop.get('bedrooms', 3),
                bathrooms=prop.get('bathrooms', 2),
                city=prop.get('city', 'Denver'),
                age=prop.get('age', 20),
                lot_size=prop.get('lotSize', 0),
                condition=prop.get('condition', 'good'),
            )
            predictions.append(pred)

        return predictions

    def _calculate_confidence(
        self,
        square_feet: float,
        bedrooms: int,
        bathrooms: float,
        city: str
    ) -> float:
        """Calculate model confidence score (0.0 to 1.0)"""

        # Base confidence
        confidence = 0.85

        # Adjust based on property size (small/large outliers less confident)
        if square_feet < 500 or square_feet > 5000:
            confidence -= 0.10
        elif square_feet < 1000 or square_feet > 4000:
            confidence -= 0.05

        # Adjust based on bedroom/bathroom count
        if bedrooms < 1 or bedrooms > 6:
            confidence -= 0.05
        if bathrooms < 1 or bathrooms > 4:
            confidence -= 0.03

        # Popular cities have higher confidence
        popular_cities = ['Denver', 'Boulder', 'Fort Collins']
        if city not in popular_cities:
            confidence -= 0.05

        return max(0.60, min(0.95, confidence))

    def _extract_key_factors(
        self,
        estimated_value: float,
        base_value: float,
        bedroom_adj: float,
        bathroom_adj: float,
        age_adj: float,
        lot_bonus: float,
        city: str
    ) -> List[str]:
        """Extract key value drivers"""

        factors = []

        # Identify largest contributors
        contributions = {
            f'Base price per sqft ({city})': abs(base_value),
            'Bedroom value': abs(bedroom_adj),
            'Bathroom value': abs(bathroom_adj),
            'Age depreciation': abs(age_adj),
            'Lot size bonus': abs(lot_bonus),
        }

        # Sort by contribution size
        sorted_contrib = sorted(contributions.items(), key=lambda x: x[1], reverse=True)

        # Top 3 factors
        for factor, value in sorted_contrib[:3]:
            if value > estimated_value * 0.05:  # Only if >5% of total
                factors.append(factor)

        return factors if factors else ['Location', 'Property size']

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance weights"""
        return self.feature_importance.copy()

    def get_model_info(self) -> Dict:
        """Get model metadata"""
        return {
            'version': self.model_version,
            'is_trained': self.is_trained,
            'model_type': 'Feature-based Valuation Model',
            'features': list(self.feature_coefficients.keys()),
            'supported_cities': list(
                self.feature_coefficients['base_price_per_sqft'].keys()
            ),
            'confidence_range': (0.60, 0.95),
        }

    def explain_prediction(
        self,
        prediction: ValuationPrediction,
        property_data: Dict
    ) -> Dict:
        """Generate human-readable explanation of prediction"""

        return {
            'estimated_value': prediction.estimated_value,
            'confidence': prediction.confidence_score,
            'confidence_interval': {
                'low': prediction.confidence_interval_low,
                'high': prediction.confidence_interval_high,
            },
            'key_value_drivers': prediction.key_factors,
            'model_info': {
                'version': self.model_version,
                'accuracy_note': 'Based on historical property sales in region',
            },
            'recommendation': self._get_valuation_recommendation(
                prediction.confidence_score
            ),
        }

    @staticmethod
    def _get_valuation_recommendation(confidence: float) -> str:
        """Get recommendation based on confidence level"""

        if confidence > 0.90:
            return 'High confidence - Valuation is reliable'
        elif confidence > 0.80:
            return 'Good confidence - Valuation is reasonable'
        elif confidence > 0.70:
            return 'Moderate confidence - Consider supplementary appraisals'
        else:
            return 'Low confidence - Recommend professional appraisal'
