from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json

@dataclass
class MarketTrend:
    month: str
    price: float
    inventory: int
    days_on_market: int
    price_change_percent: float

@dataclass
class MarketAnalysis:
    location: str
    city: str
    state: str
    analysis_date: str
    average_price: float
    median_price: float
    price_per_sqft: float
    inventory_level: int
    days_on_market: int
    price_trend_6m: float
    price_trend_12m: float
    market_temperature: str
    median_home_age: int
    school_rating: Optional[float] = None
    crime_rate: Optional[float] = None
    walkability_score: Optional[int] = None

@dataclass
class PriceHistoryPoint:
    date: str
    price: float
    price_per_sqft: float
    transactions: int

class MarketAnalysisService:
    def __init__(self):
        self.market_data = self._initialize_market_data()

    def _initialize_market_data(self) -> Dict[str, Dict]:
        """Initialize market data for Colorado markets"""
        return {
            'Denver, CO': {
                'avg_price': 625000,
                'median_price': 580000,
                'price_per_sqft': 285,
                'inventory': 145,
                'days_on_market': 16,
                'price_trend_6m': 2.1,
                'price_trend_12m': 5.3,
                'price_history': [
                    {'date': '2024-01-01', 'price': 580000, 'ppsf': 265},
                    {'date': '2024-02-01', 'price': 595000, 'ppsf': 272},
                    {'date': '2024-03-01', 'price': 610000, 'ppsf': 278},
                    {'date': '2024-04-01', 'price': 615000, 'ppsf': 282},
                    {'date': '2024-05-01', 'price': 620000, 'ppsf': 283},
                    {'date': '2024-06-01', 'price': 625000, 'ppsf': 285},
                    {'date': '2024-07-01', 'price': 632000, 'ppsf': 289},
                    {'date': '2024-08-01', 'price': 640000, 'ppsf': 291},
                ],
                'median_home_age': 28,
                'school_rating': 7.2,
                'crime_rate': 45.2,
                'walkability': 72,
            },
            'Boulder, CO': {
                'avg_price': 875000,
                'median_price': 820000,
                'price_per_sqft': 425,
                'inventory': 42,
                'days_on_market': 12,
                'price_trend_6m': 3.4,
                'price_trend_12m': 7.8,
                'price_history': [
                    {'date': '2024-01-01', 'price': 750000, 'ppsf': 390},
                    {'date': '2024-02-01', 'price': 770000, 'ppsf': 398},
                    {'date': '2024-03-01', 'price': 795000, 'ppsf': 410},
                    {'date': '2024-04-01', 'price': 820000, 'ppsf': 420},
                    {'date': '2024-05-01', 'price': 835000, 'ppsf': 425},
                    {'date': '2024-06-01', 'price': 850000, 'ppsf': 428},
                    {'date': '2024-07-01', 'price': 865000, 'ppsf': 432},
                    {'date': '2024-08-01', 'price': 875000, 'ppsf': 425},
                ],
                'median_home_age': 22,
                'school_rating': 8.5,
                'crime_rate': 28.1,
                'walkability': 85,
            },
            'Aurora, CO': {
                'avg_price': 425000,
                'median_price': 390000,
                'price_per_sqft': 195,
                'inventory': 230,
                'days_on_market': 22,
                'price_trend_6m': 1.2,
                'price_trend_12m': 2.1,
                'price_history': [
                    {'date': '2024-01-01', 'price': 375000, 'ppsf': 185},
                    {'date': '2024-02-01', 'price': 378000, 'ppsf': 187},
                    {'date': '2024-03-01', 'price': 382000, 'ppsf': 189},
                    {'date': '2024-04-01', 'price': 385000, 'ppsf': 191},
                    {'date': '2024-05-01', 'price': 388000, 'ppsf': 192},
                    {'date': '2024-06-01', 'price': 392000, 'ppsf': 194},
                    {'date': '2024-07-01', 'price': 415000, 'ppsf': 196},
                    {'date': '2024-08-01', 'price': 425000, 'ppsf': 195},
                ],
                'median_home_age': 32,
                'school_rating': 6.8,
                'crime_rate': 52.3,
                'walkability': 58,
            },
            'Fort Collins, CO': {
                'avg_price': 525000,
                'median_price': 485000,
                'price_per_sqft': 240,
                'inventory': 98,
                'days_on_market': 18,
                'price_trend_6m': 2.8,
                'price_trend_12m': 4.5,
                'price_history': [
                    {'date': '2024-01-01', 'price': 450000, 'ppsf': 220},
                    {'date': '2024-02-01', 'price': 460000, 'ppsf': 225},
                    {'date': '2024-03-01', 'price': 470000, 'ppsf': 230},
                    {'date': '2024-04-01', 'price': 478000, 'ppsf': 235},
                    {'date': '2024-05-01', 'price': 485000, 'ppsf': 238},
                    {'date': '2024-06-01', 'price': 495000, 'ppsf': 240},
                    {'date': '2024-07-01', 'price': 510000, 'ppsf': 242},
                    {'date': '2024-08-01', 'price': 525000, 'ppsf': 240},
                ],
                'median_home_age': 25,
                'school_rating': 7.8,
                'crime_rate': 35.1,
                'walkability': 68,
            },
        }

    def analyze_market(self, city: str, state: str) -> Optional[MarketAnalysis]:
        """Analyze market for a specific city and state"""
        location = f"{city}, {state}"
        market_data = self.market_data.get(location)

        if not market_data:
            return None

        temperature = self._determine_market_temperature(
            market_data['price_trend_6m'],
            market_data['inventory']
        )

        return MarketAnalysis(
            location=location,
            city=city,
            state=state,
            analysis_date=datetime.now().isoformat(),
            average_price=market_data['avg_price'],
            median_price=market_data['median_price'],
            price_per_sqft=market_data['price_per_sqft'],
            inventory_level=market_data['inventory'],
            days_on_market=market_data['days_on_market'],
            price_trend_6m=market_data['price_trend_6m'],
            price_trend_12m=market_data['price_trend_12m'],
            market_temperature=temperature,
            median_home_age=market_data['median_home_age'],
            school_rating=market_data.get('school_rating'),
            crime_rate=market_data.get('crime_rate'),
            walkability_score=market_data.get('walkability'),
        )

    def get_price_trends(self, city: str, state: str, months: int = 12) -> List[MarketTrend]:
        """Get price trends over specified months"""
        location = f"{city}, {state}"
        market_data = self.market_data.get(location)

        if not market_data:
            return []

        price_history = market_data['price_history']
        cutoff_index = max(0, len(price_history) - months)
        recent_history = price_history[cutoff_index:]

        trends = []
        for i, entry in enumerate(recent_history):
            price_change = 0.0
            if i > 0:
                prev_price = recent_history[i-1]['price']
                price_change = ((entry['price'] - prev_price) / prev_price) * 100

            trends.append(MarketTrend(
                month=entry['date'],
                price=entry['price'],
                inventory=market_data['inventory'],
                days_on_market=market_data['days_on_market'],
                price_change_percent=price_change,
            ))

        return trends

    def forecast_prices(self, city: str, state: str, months: int = 6) -> List[Dict]:
        """Forecast future prices using trend analysis"""
        location = f"{city}, {state}"
        market_data = self.market_data.get(location)

        if not market_data:
            return []

        price_history = market_data['price_history']
        last_price = price_history[-1]['price']
        trend_rate = market_data['price_trend_6m'] / 100  # Convert percentage to decimal

        forecasts = []
        for month in range(1, months + 1):
            forecast_price = last_price * (1 + trend_rate) ** (month / 6)
            forecast_date = (datetime.now() + timedelta(days=30 * month)).isoformat()

            forecasts.append({
                'date': forecast_date,
                'forecasted_price': round(forecast_price, 2),
                'confidence': max(0.5, 0.95 - (month * 0.05)),  # Decreasing confidence over time
            })

        return forecasts

    def get_market_comparison(self, cities: List[Tuple[str, str]]) -> Dict:
        """Compare markets across multiple cities"""
        comparison = {}

        for city, state in cities:
            analysis = self.analyze_market(city, state)
            if analysis:
                comparison[f"{city}, {state}"] = asdict(analysis)

        return comparison

    def _determine_market_temperature(self, price_trend: float, inventory: int) -> str:
        """Determine market temperature based on price trends and inventory"""
        if price_trend > 3.0 and inventory < 150:
            return 'Hot'
        elif price_trend > 1.5 and inventory < 200:
            return 'Warm'
        elif price_trend < 0.5 and inventory > 250:
            return 'Cold'
        else:
            return 'Cool'

    def get_investment_score(
        self,
        city: str,
        state: str,
        property_price: float,
        annual_rent: float,
    ) -> Dict:
        """Calculate investment score based on market and property metrics"""
        analysis = self.analyze_market(city, state)

        if not analysis:
            return {'error': 'Market not found'}

        cap_rate = (annual_rent / property_price) * 100
        price_per_sqft_deviation = (
            (analysis.price_per_sqft - analysis.price_per_sqft) /
            analysis.price_per_sqft * 100
        ) if analysis.price_per_sqft else 0

        trend_score = min(100, max(0, 50 + (analysis.price_trend_12m * 10)))
        cap_rate_score = min(100, max(0, cap_rate * 10))
        inventory_score = min(100, max(0, 100 - (analysis.inventory_level / 5)))

        overall_score = (trend_score * 0.3 + cap_rate_score * 0.4 + inventory_score * 0.3)

        return {
            'overall_score': round(overall_score, 1),
            'trend_score': round(trend_score, 1),
            'cap_rate_score': round(cap_rate_score, 1),
            'inventory_score': round(inventory_score, 1),
            'market_temperature': analysis.market_temperature,
            'estimated_cap_rate': round(cap_rate, 2),
        }
