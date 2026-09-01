from typing import Dict, List
from dataclasses import dataclass
from enum import Enum

class RiskCategory(str, Enum):
    MARKET_RISK = "market_risk"
    PROPERTY_RISK = "property_risk"
    FINANCIAL_RISK = "financial_risk"
    TENANT_RISK = "tenant_risk"  # For rentals
    ECONOMIC_RISK = "economic_risk"

@dataclass
class RiskAssessment:
    overall_risk_score: float  # 0-100, higher = more risky
    risk_level: str  # Low (0-35), Medium (35-65), High (65-100)
    risk_breakdown: Dict[str, float]  # Breakdown by category
    key_risks: List[str]  # Top 3 risks
    mitigations: List[str]  # Recommended risk mitigation strategies
    recommendation: str  # Risk-based recommendation

class RiskAssessmentModel:
    """
    Comprehensive risk assessment model for real estate investments.
    Evaluates market, property, financial, tenant, and economic risks.
    """

    def __init__(self):
        self.risk_weights = {
            RiskCategory.MARKET_RISK: 0.25,
            RiskCategory.PROPERTY_RISK: 0.20,
            RiskCategory.FINANCIAL_RISK: 0.25,
            RiskCategory.TENANT_RISK: 0.15,
            RiskCategory.ECONOMIC_RISK: 0.15,
        }

    def assess(
        self,
        property_data: Dict,
        market_data: Dict,
        financial_data: Dict,
        investment_style: str = "rental",
    ) -> RiskAssessment:
        """
        Comprehensive risk assessment for property investment.

        Args:
            property_data: Property characteristics (age, size, condition, etc)
            market_data: Market metrics (trends, inventory, competition)
            financial_data: Investment financial metrics (price, down payment, debt ratio)
            investment_style: Type of investment (rental, flip, appreciation)

        Returns:
            RiskAssessment object with detailed risk breakdown
        """

        # Calculate component risk scores
        market_risk = self._assess_market_risk(market_data, investment_style)
        property_risk = self._assess_property_risk(property_data)
        financial_risk = self._assess_financial_risk(property_data, financial_data)
        tenant_risk = self._assess_tenant_risk(property_data, market_data)
        economic_risk = self._assess_economic_risk(market_data)

        # Compile risk breakdown
        risk_breakdown = {
            RiskCategory.MARKET_RISK: market_risk,
            RiskCategory.PROPERTY_RISK: property_risk,
            RiskCategory.FINANCIAL_RISK: financial_risk,
            RiskCategory.TENANT_RISK: tenant_risk,
            RiskCategory.ECONOMIC_RISK: economic_risk,
        }

        # Calculate weighted overall score
        overall_risk_score = (
            market_risk * self.risk_weights[RiskCategory.MARKET_RISK] +
            property_risk * self.risk_weights[RiskCategory.PROPERTY_RISK] +
            financial_risk * self.risk_weights[RiskCategory.FINANCIAL_RISK] +
            tenant_risk * self.risk_weights[RiskCategory.TENANT_RISK] +
            economic_risk * self.risk_weights[RiskCategory.ECONOMIC_RISK]
        )

        overall_risk_score = round(overall_risk_score, 1)
        risk_level = self._get_risk_level(overall_risk_score)

        # Identify key risks
        key_risks = self._identify_key_risks(risk_breakdown)

        # Generate mitigations
        mitigations = self._generate_mitigations(
            property_data, market_data, risk_breakdown
        )

        # Get recommendation
        recommendation = self._get_risk_recommendation(
            overall_risk_score, risk_level, key_risks
        )

        return RiskAssessment(
            overall_risk_score=overall_risk_score,
            risk_level=risk_level,
            risk_breakdown=risk_breakdown,
            key_risks=key_risks,
            mitigations=mitigations,
            recommendation=recommendation,
        )

    def _assess_market_risk(
        self,
        market_data: Dict,
        investment_style: str
    ) -> float:
        """Assess risk from market conditions (0-100)"""

        risk_score = 50  # Base

        # Price trend risk
        trend_12m = market_data.get('price_trend_12m', 0)
        if trend_12m < -3:
            risk_score += 30  # Declining market = high risk
        elif trend_12m < 0:
            risk_score += 15
        elif trend_12m > 5:
            risk_score -= 10  # Strong appreciation reduces risk

        # Inventory risk
        inventory = market_data.get('inventory_level', 150)
        if inventory > 300:
            risk_score += 25
        elif inventory > 200:
            risk_score += 10
        elif inventory < 50:
            risk_score -= 5

        # Market temperature risk
        temp = market_data.get('market_temperature', 'Cool')
        temp_risk = {'Hot': 10, 'Warm': 20, 'Cool': 35, 'Cold': 50}.get(temp, 30)
        risk_score = (risk_score * 0.6) + (temp_risk * 0.4)

        # Days on market risk
        dom = market_data.get('days_on_market', 15)
        if dom > 60:
            risk_score += 20
        elif dom > 45:
            risk_score += 10

        return min(100, max(0, risk_score))

    def _assess_property_risk(self, property_data: Dict) -> float:
        """Assess risk from property characteristics (0-100)"""

        risk_score = 50  # Base

        # Age risk
        age = property_data.get('age', 20)
        if age > 60:
            risk_score += 20
        elif age > 40:
            risk_score += 10
        elif age < 3:
            risk_score -= 5

        # Condition risk
        condition = property_data.get('condition', 'good').lower()
        condition_risk = {
            'excellent': 10,
            'good': 25,
            'fair': 45,
            'poor': 70,
        }.get(condition, 40)
        risk_score = (risk_score * 0.7) + (condition_risk * 0.3)

        # Size risk (very small or very large = more risk)
        sqft = property_data.get('squareFeet', 1500)
        if sqft < 600 or sqft > 4000:
            risk_score += 10

        # Property type risk
        prop_type = property_data.get('propertyType', 'single_family')
        type_risk = {
            'single_family': 20,
            'condo': 30,
            'townhouse': 25,
            'multi_family': 40,
            'land': 50,
        }.get(prop_type, 35)
        risk_score = (risk_score * 0.6) + (type_risk * 0.4)

        return min(100, max(0, risk_score))

    def _assess_financial_risk(
        self,
        property_data: Dict,
        financial_data: Dict
    ) -> float:
        """Assess risk from financial structure (0-100)"""

        risk_score = 50  # Base

        # Loan to value (LTV) risk
        purchase_price = property_data.get('listPrice', 400000)
        down_payment = financial_data.get('down_payment', 80000)
        ltv = ((purchase_price - down_payment) / purchase_price) * 100

        if ltv > 90:
            risk_score += 30  # High leverage = high risk
        elif ltv > 80:
            risk_score += 15
        elif ltv < 60:
            risk_score -= 10  # Low leverage reduces risk

        # Interest rate risk
        interest_rate = financial_data.get('interest_rate', 4.0)
        if interest_rate > 6.0:
            risk_score += 15
        elif interest_rate > 5.0:
            risk_score += 5

        # Cash flow coverage risk
        annual_income = financial_data.get('annual_rental_income', 0)
        annual_expenses = financial_data.get('annual_expenses', 0)
        debt_service = financial_data.get('annual_debt_service', 0)

        if debt_service > 0:
            dscr = (annual_income - annual_expenses) / debt_service
            if dscr < 1.0:
                risk_score += 40  # Negative cash flow = very risky
            elif dscr < 1.2:
                risk_score += 20
            elif dscr < 1.5:
                risk_score += 5
            else:
                risk_score -= 10  # Strong cash flow reduces risk

        return min(100, max(0, risk_score))

    def _assess_tenant_risk(
        self,
        property_data: Dict,
        market_data: Dict
    ) -> float:
        """Assess risk from rental/tenant perspective (0-100)"""

        risk_score = 50  # Base

        # Area crime rate risk
        crime_rate = market_data.get('crime_rate', 40)
        if crime_rate > 60:
            risk_score += 25
        elif crime_rate > 40:
            risk_score += 10
        elif crime_rate < 30:
            risk_score -= 10

        # School rating impact on tenants
        school_rating = market_data.get('school_rating', 6.0)
        if school_rating < 5.0:
            risk_score += 15  # Poor schools = tenant risk
        elif school_rating > 8.0:
            risk_score -= 10  # Good schools = lower risk

        # Walkability and area desirability
        walkability = market_data.get('walkability_score', 50)
        if walkability < 40:
            risk_score += 20  # Low walkability = harder to rent
        elif walkability < 60:
            risk_score += 10
        else:
            risk_score -= 5

        # Property type rental risk
        prop_type = property_data.get('propertyType', 'single_family')
        type_tenant_risk = {
            'single_family': 30,
            'townhouse': 35,
            'condo': 40,
            'multi_family': 25,  # Easier to find tenants
        }.get(prop_type, 35)
        risk_score = (risk_score * 0.6) + (type_tenant_risk * 0.4)

        return min(100, max(0, risk_score))

    def _assess_economic_risk(self, market_data: Dict) -> float:
        """Assess macro-economic risk factors (0-100)"""

        risk_score = 50  # Base

        # Regional economic indicators
        # In production, would use actual economic data
        # For now, infer from market metrics

        # Market temperature as economic indicator
        temp = market_data.get('market_temperature', 'Cool')
        if temp == 'Cold':
            risk_score += 30  # Cold market indicates weakness
        elif temp == 'Cool':
            risk_score += 15
        elif temp == 'Hot':
            risk_score -= 15  # Hot market may indicate bubble risk

        # Interest rate environment (estimated)
        # Current economy ~4% rates
        current_rates = 4.0
        rate_risk_impact = abs(current_rates - 4.0) * 5
        risk_score += min(20, rate_risk_impact)

        # Employment proxy (market health)
        # Infer from days on market
        dom = market_data.get('days_on_market', 15)
        if dom > 45:
            risk_score += 15  # Long listings suggest weak economy

        return min(100, max(0, risk_score))

    def _get_risk_level(self, score: float) -> str:
        """Convert risk score to level"""

        if score < 35:
            return "Low"
        elif score < 65:
            return "Medium"
        else:
            return "High"

    def _identify_key_risks(self, risk_breakdown: Dict[str, float]) -> List[str]:
        """Identify top 3 risk categories"""

        risks = [
            (f"{k.replace('_', ' ').title()}", v)
            for k, v in risk_breakdown.items()
        ]
        risks.sort(key=lambda x: x[1], reverse=True)

        return [risk[0] for risk in risks[:3]]

    def _generate_mitigations(
        self,
        property_data: Dict,
        market_data: Dict,
        risk_breakdown: Dict[str, float]
    ) -> List[str]:
        """Generate risk mitigation recommendations"""

        mitigations = []

        # Market risk mitigations
        if risk_breakdown[RiskCategory.MARKET_RISK] > 60:
            mitigations.append(
                "Consider diversifying across multiple markets or property types"
            )

        # Property risk mitigations
        if risk_breakdown[RiskCategory.PROPERTY_RISK] > 60:
            age = property_data.get('age', 20)
            if age > 50:
                mitigations.append("Budget for major renovations/updates")
            condition = property_data.get('condition', 'good')
            if condition in ['fair', 'poor']:
                mitigations.append("Get professional inspection before purchase")

        # Financial risk mitigations
        if risk_breakdown[RiskCategory.FINANCIAL_RISK] > 60:
            mitigations.append("Consider increasing down payment to reduce leverage")
            mitigations.append("Lock in fixed-rate mortgage to protect from rate increases")

        # Tenant risk mitigations
        if risk_breakdown[RiskCategory.TENANT_RISK] > 60:
            mitigations.append("Implement thorough tenant screening process")
            mitigations.append("Purchase landlord insurance and umbrella coverage")

        # Economic risk mitigations
        if risk_breakdown[RiskCategory.ECONOMIC_RISK] > 60:
            mitigations.append("Maintain 6+ months cash reserves for expenses")
            mitigations.append("Plan for potential rent decreases in softening market")

        return mitigations if mitigations else ["Property meets acceptable risk parameters"]

    def _get_risk_recommendation(
        self,
        score: float,
        level: str,
        key_risks: List[str]
    ) -> str:
        """Get overall risk-based recommendation"""

        if level == "Low":
            return "Low risk property - Good investment candidate"
        elif level == "Medium":
            if score < 50:
                return "Acceptable risk - Suitable for most investors"
            else:
                return "Moderate risk - Consider risk mitigations before purchase"
        else:  # High
            if score > 80:
                return "High risk - Only suitable for experienced investors with risk tolerance"
            else:
                return "High risk - Carefully evaluate mitigations before proceeding"
