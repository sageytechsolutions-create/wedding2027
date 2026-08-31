from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class InvestmentStyle(str, Enum):
    RENTAL = "rental"
    FLIP = "flip"
    APPRECIATION = "appreciation"
    MIXED = "mixed"

@dataclass
class PropertyRecommendation:
    property_id: str
    property_address: str
    match_score: float  # 0-100
    recommendation_type: str  # Strong Buy, Buy, Hold, Pass
    reasoning: List[str]
    risk_level: str  # Low, Medium, High
    estimated_annual_return: float
    estimated_roi: float
    alignment_score: Dict[str, float]  # Breakdown of scores

class RecommendationEngine:
    """
    Investment recommendation engine that matches properties to investor profiles.
    Uses multi-factor scoring based on investment style, market conditions, and property metrics.
    """

    def __init__(self):
        self.min_score_for_recommendation = 60.0
        self.investment_styles = {
            InvestmentStyle.RENTAL: {
                'weight': {
                    'cashflow': 0.40,
                    'appreciation': 0.20,
                    'risk': 0.20,
                    'diversification': 0.20,
                }
            },
            InvestmentStyle.FLIP: {
                'weight': {
                    'cashflow': 0.10,
                    'appreciation': 0.50,
                    'risk': 0.25,
                    'diversification': 0.15,
                }
            },
            InvestmentStyle.APPRECIATION: {
                'weight': {
                    'cashflow': 0.05,
                    'appreciation': 0.60,
                    'risk': 0.20,
                    'diversification': 0.15,
                }
            },
            InvestmentStyle.MIXED: {
                'weight': {
                    'cashflow': 0.30,
                    'appreciation': 0.35,
                    'risk': 0.20,
                    'diversification': 0.15,
                }
            },
        }

    def recommend(
        self,
        investor_profile: Dict,
        available_properties: List[Dict],
        market_data: Dict,
        portfolio_context: Optional[Dict] = None,
        max_recommendations: int = 10
    ) -> List[PropertyRecommendation]:
        """
        Generate property recommendations for investor.

        Args:
            investor_profile: Dict with investment_style, target_roi, risk_tolerance, budget
            available_properties: List of property data dictionaries
            market_data: Market analysis data by city
            portfolio_context: Current portfolio composition
            max_recommendations: Max number to return

        Returns:
            Ranked list of PropertyRecommendation objects
        """

        recommendations = []

        for prop in available_properties:
            if not self._passes_basic_filters(prop, investor_profile):
                continue

            # Calculate component scores
            cashflow_score = self._score_cashflow(
                prop, investor_profile, market_data
            )
            appreciation_score = self._score_appreciation(
                prop, market_data
            )
            risk_score = self._score_risk(prop, market_data)
            diversification_score = self._score_diversification(
                prop, portfolio_context or {}
            )

            # Get investment style
            style = InvestmentStyle(investor_profile.get('investment_style', 'mixed'))
            weights = self.investment_styles[style]['weight']

            # Calculate overall score
            overall_score = (
                cashflow_score * weights['cashflow'] +
                appreciation_score * weights['appreciation'] +
                (100 - risk_score) * weights['risk'] +
                diversification_score * weights['diversification']
            )

            if overall_score < self.min_score_for_recommendation:
                continue

            # Generate recommendation
            recommendation = PropertyRecommendation(
                property_id=prop.get('id', ''),
                property_address=f"{prop.get('address')} {prop.get('city')}, {prop.get('state')}",
                match_score=round(overall_score, 1),
                recommendation_type=self._get_recommendation_type(overall_score),
                reasoning=self._generate_reasoning(
                    prop, cashflow_score, appreciation_score, risk_score, market_data
                ),
                risk_level=self._get_risk_level(risk_score),
                estimated_annual_return=self._estimate_annual_return(
                    prop, cashflow_score, appreciation_score
                ),
                estimated_roi=self._estimate_roi(prop, cashflow_score, appreciation_score),
                alignment_score={
                    'cashflow': round(cashflow_score, 1),
                    'appreciation': round(appreciation_score, 1),
                    'risk': round(100 - risk_score, 1),
                    'diversification': round(diversification_score, 1),
                    'overall': round(overall_score, 1),
                },
            )

            recommendations.append(recommendation)

        # Sort by score and return top N
        recommendations.sort(key=lambda x: x.match_score, reverse=True)
        return recommendations[:max_recommendations]

    def _passes_basic_filters(self, prop: Dict, investor_profile: Dict) -> bool:
        """Check if property passes basic investor filters"""

        # Budget check
        budget = investor_profile.get('max_budget', float('inf'))
        if prop.get('listPrice', 0) > budget:
            return False

        # Min/max property size
        min_sqft = investor_profile.get('min_sqft', 800)
        max_sqft = investor_profile.get('max_sqft', 5000)
        sqft = prop.get('squareFeet', 1500)
        if sqft < min_sqft or sqft > max_sqft:
            return False

        # Geographic preference
        preferred_cities = investor_profile.get('preferred_cities', [])
        if preferred_cities and prop.get('city') not in preferred_cities:
            return False

        return True

    def _score_cashflow(
        self,
        prop: Dict,
        investor_profile: Dict,
        market_data: Dict
    ) -> float:
        """Score property for rental income potential (0-100)"""

        # Estimate monthly rental income based on property characteristics
        bedrooms = prop.get('bedrooms', 3)
        bathrooms = prop.get('bathrooms', 2)
        sqft = prop.get('squareFeet', 1500)
        city = prop.get('city', 'Denver')

        # Base rent calculation
        price_per_sqft = market_data.get(f'{city}, CO', {}).get('price_per_sqft', 250)
        base_rent = (sqft * price_per_sqft) / 250  # Rough rental ratio

        # Adjust for bedrooms/bathrooms
        base_rent += (bedrooms * 500) + (bathrooms * 300)

        # Annual rental income
        annual_rent = base_rent * 12

        # Calculate cap rate
        purchase_price = prop.get('listPrice', 400000)
        cap_rate = (annual_rent / purchase_price) * 100

        # Score based on target ROI
        target_roi = investor_profile.get('target_roi', 6.0)
        if cap_rate >= target_roi:
            score = min(100, (cap_rate / target_roi) * 70 + 30)
        else:
            score = max(0, (cap_rate / target_roi) * 70)

        return score

    def _score_appreciation(
        self,
        prop: Dict,
        market_data: Dict
    ) -> float:
        """Score property for appreciation potential (0-100)"""

        city = prop.get('city', 'Denver')
        market = market_data.get(f'{city}, CO', {})

        # Market trend score
        trend_12m = market.get('price_trend_12m', 0)
        trend_score = min(100, max(0, 50 + (trend_12m * 10)))

        # Property age factor (newer = better appreciation)
        age = prop.get('age', 20)
        age_score = min(100, max(40, 100 - (age * 1.5)))

        # Market temperature bonus
        temp = market.get('market_temperature', 'Cool')
        temp_bonus = {'Hot': 20, 'Warm': 10, 'Cool': 0, 'Cold': -10}.get(temp, 0)

        appreciation_score = (trend_score * 0.4 + age_score * 0.4 + 50 + temp_bonus * 0.2)

        return min(100, appreciation_score)

    def _score_risk(
        self,
        prop: Dict,
        market_data: Dict
    ) -> float:
        """Score property risk level (0-100, higher = more risky)"""

        city = prop.get('city', 'Denver')
        market = market_data.get(f'{city}, CO', {})

        risk_score = 50  # Base risk

        # Market inventory risk (high inventory = more risk)
        inventory = market.get('inventory_level', 150)
        if inventory > 250:
            risk_score += 20
        elif inventory > 200:
            risk_score += 10

        # Market trend risk (declining = more risk)
        trend = market.get('price_trend_12m', 0)
        if trend < 0:
            risk_score += 25
        elif trend < 2:
            risk_score += 10

        # Property age risk (very old = more risk)
        age = prop.get('age', 20)
        if age > 50:
            risk_score += 15
        elif age > 30:
            risk_score += 8

        # Days on market risk (long listing = more risk)
        dom = market.get('days_on_market', 15)
        if dom > 45:
            risk_score += 15
        elif dom > 30:
            risk_score += 8

        return min(100, max(0, risk_score))

    def _score_diversification(
        self,
        prop: Dict,
        portfolio_context: Dict
    ) -> float:
        """Score property for portfolio diversification (0-100)"""

        if not portfolio_context.get('properties'):
            return 90  # First property is ideal for diversification

        city = prop.get('city')
        prop_type = prop.get('propertyType', 'single_family')

        portfolio = portfolio_context.get('properties', [])
        city_concentration = sum(
            1 for p in portfolio if p.get('city') == city
        ) / len(portfolio)
        type_concentration = sum(
            1 for p in portfolio if p.get('propertyType') == prop_type
        ) / len(portfolio)

        # Lower concentration = higher score
        diversification_score = (
            (1 - city_concentration) * 50 +
            (1 - type_concentration) * 50
        )

        return min(100, max(20, diversification_score))

    def _get_recommendation_type(self, score: float) -> str:
        """Get recommendation type based on score"""

        if score >= 85:
            return "Strong Buy"
        elif score >= 75:
            return "Buy"
        elif score >= 60:
            return "Consider"
        else:
            return "Pass"

    def _get_risk_level(self, risk_score: float) -> str:
        """Get risk level based on risk score"""

        if risk_score < 35:
            return "Low"
        elif risk_score < 65:
            return "Medium"
        else:
            return "High"

    def _generate_reasoning(
        self,
        prop: Dict,
        cashflow_score: float,
        appreciation_score: float,
        risk_score: float,
        market_data: Dict
    ) -> List[str]:
        """Generate reasoning for recommendation"""

        reasons = []

        # Cashflow reasoning
        if cashflow_score > 70:
            reasons.append(f"Strong rental income potential (Score: {cashflow_score:.0f})")
        elif cashflow_score > 55:
            reasons.append(f"Solid rental income potential (Score: {cashflow_score:.0f})")

        # Appreciation reasoning
        market = market_data.get(f"{prop.get('city')}, CO", {})
        trend = market.get('price_trend_12m', 0)
        if appreciation_score > 70:
            if trend > 3:
                reasons.append(f"Strong market appreciation ({trend:.1f}% annual)")
            else:
                reasons.append(f"Good appreciation potential (Score: {appreciation_score:.0f})")

        # Risk reasoning
        if risk_score < 40:
            reasons.append("Low market risk")
        elif risk_score > 65:
            reasons.append(f"Higher risk due to market conditions (Risk: {risk_score:.0f})")

        # Property specific
        age = prop.get('age', 20)
        if age < 5:
            reasons.append("Newer property with minimal maintenance")
        elif age > 40:
            reasons.append("Older property - factor in potential renovations")

        return reasons if reasons else ["Meets investment criteria"]

    def _estimate_annual_return(
        self,
        prop: Dict,
        cashflow_score: float,
        appreciation_score: float
    ) -> float:
        """Estimate annual return percentage"""

        # Rough estimate: combine rental yield and appreciation
        cashflow_yield = (cashflow_score / 100) * 6  # 0-6%
        appreciation_yield = (appreciation_score / 100) * 4  # 0-4%

        return round(cashflow_yield + appreciation_yield, 2)

    def _estimate_roi(
        self,
        prop: Dict,
        cashflow_score: float,
        appreciation_score: float
    ) -> float:
        """Estimate 5-year ROI"""

        purchase_price = prop.get('listPrice', 400000)
        annual_return = self._estimate_annual_return(prop, cashflow_score, appreciation_score)

        # Compound 5-year return
        roi_5yr = (((1 + (annual_return / 100)) ** 5) - 1) * 100

        return round(roi_5yr, 2)
