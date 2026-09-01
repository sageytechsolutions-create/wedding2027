from typing import Dict, Any
from pydantic import BaseModel

class InvestmentProfile(BaseModel):
    investment_style: str  # "rental", "fix_flip", "long_term"
    target_roi: float
    risk_tolerance: str  # "conservative", "moderate", "aggressive"

class PropertyValuationData(BaseModel):
    acquisition_price: float
    estimated_value: float
    annual_rental_income: float = 0
    annual_expenses: float
    bedrooms: int
    bathrooms: float
    square_feet: int
    market_appreciation_rate: float = 0.03  # 3% default

class InvestmentScoreResult(BaseModel):
    overall_score: float
    roi_score: float
    cash_flow_score: float
    appreciation_score: float
    risk_score: float
    recommendation: str
    key_factors: list[str]

class ScoringService:
    """Investment property scoring service."""

    @classmethod
    def score_property(
        cls,
        profile: InvestmentProfile,
        property_data: PropertyValuationData
    ) -> InvestmentScoreResult:
        """Score a property based on investment profile."""

        # Calculate key metrics
        initial_equity = property_data.estimated_value - property_data.acquisition_price
        annual_cash_flow = property_data.annual_rental_income - property_data.annual_expenses
        roi = (annual_cash_flow / property_data.acquisition_price * 100) if property_data.acquisition_price > 0 else 0
        appreciation_gain = property_data.estimated_value * property_data.market_appreciation_rate

        # Score components (0-100)

        # ROI Score
        target_roi = profile.target_roi
        if roi >= target_roi:
            roi_score = 100
        elif roi >= target_roi * 0.75:
            roi_score = 80
        elif roi >= target_roi * 0.5:
            roi_score = 60
        elif roi >= target_roi * 0.25:
            roi_score = 40
        else:
            roi_score = max(0, roi * 10)  # Scale smaller ROIs

        # Cash Flow Score
        if annual_cash_flow > 0:
            cash_flow_ratio = annual_cash_flow / property_data.acquisition_price
            if cash_flow_ratio >= 0.08:  # 8% cash on cash
                cash_flow_score = 100
            elif cash_flow_ratio >= 0.06:
                cash_flow_score = 80
            elif cash_flow_ratio >= 0.04:
                cash_flow_score = 60
            elif cash_flow_ratio >= 0.02:
                cash_flow_score = 40
            else:
                cash_flow_score = 20
        else:
            cash_flow_score = 0

        # Appreciation Score
        total_appreciation = appreciation_gain + initial_equity
        if total_appreciation > property_data.acquisition_price * 0.3:
            appreciation_score = 100
        elif total_appreciation > property_data.acquisition_price * 0.2:
            appreciation_score = 80
        elif total_appreciation > property_data.acquisition_price * 0.1:
            appreciation_score = 60
        elif total_appreciation > 0:
            appreciation_score = 40
        else:
            appreciation_score = 20

        # Risk Score (inverse - lower is better)
        expense_ratio = property_data.annual_expenses / (property_data.annual_rental_income + 1)
        if expense_ratio > 0.7:
            risk_score = 80  # High risk
        elif expense_ratio > 0.5:
            risk_score = 60
        elif expense_ratio > 0.3:
            risk_score = 40
        else:
            risk_score = 20  # Low risk

        # Adjust risk score based on profile
        if profile.risk_tolerance == "conservative":
            risk_score *= 1.2  # More penalizing
        elif profile.risk_tolerance == "aggressive":
            risk_score *= 0.8  # More forgiving

        risk_score = min(100, risk_score)

        # Calculate overall score (weighted average)
        weights = {
            "roi": 0.35,
            "cash_flow": 0.30,
            "appreciation": 0.20,
            "risk": 0.15  # Inverted (lower is better)
        }

        overall_score = (
            roi_score * weights["roi"] +
            cash_flow_score * weights["cash_flow"] +
            appreciation_score * weights["appreciation"] +
            (100 - risk_score) * weights["risk"]  # Invert risk
        )

        # Generate key factors
        key_factors = []
        if roi >= target_roi:
            key_factors.append(f"Strong ROI: {roi:.1f}%")
        if annual_cash_flow > 0:
            key_factors.append(f"Positive cash flow: ${annual_cash_flow:,.0f}/year")
        if initial_equity > 0:
            key_factors.append(f"Positive equity: ${initial_equity:,.0f}")
        if expense_ratio < 0.5:
            key_factors.append("Low expense ratio")
        if property_data.square_feet > 2000:
            key_factors.append("Spacious property")

        # Generate recommendation
        if overall_score >= 80:
            recommendation = "Excellent investment opportunity"
        elif overall_score >= 70:
            recommendation = "Good investment potential"
        elif overall_score >= 60:
            recommendation = "Fair investment - review carefully"
        elif overall_score >= 50:
            recommendation = "Moderate risk - consider alternatives"
        else:
            recommendation = "Poor investment profile"

        return InvestmentScoreResult(
            overall_score=round(overall_score, 2),
            roi_score=round(roi_score, 2),
            cash_flow_score=round(cash_flow_score, 2),
            appreciation_score=round(appreciation_score, 2),
            risk_score=round(100 - risk_score, 2),  # Return as safety score
            recommendation=recommendation,
            key_factors=key_factors
        )
