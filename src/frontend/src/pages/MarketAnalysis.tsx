import { useState } from 'react';

interface MarketTrend {
  location: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  priceChange6m: number;
  priceChange12m: number;
  temperature: 'hot' | 'warm' | 'cool' | 'cold';
  daysOnMarket: number;
  inventoryLevel: number;
}

// Mock market data
const MARKET_DATA: MarketTrend[] = [
  {
    location: 'Denver, CO',
    trend: 'increasing',
    priceChange6m: 3.2,
    priceChange12m: 6.8,
    temperature: 'hot',
    daysOnMarket: 28,
    inventoryLevel: 2.5,
  },
  {
    location: 'Boulder, CO',
    trend: 'increasing',
    priceChange6m: 2.1,
    priceChange12m: 5.2,
    temperature: 'warm',
    daysOnMarket: 35,
    inventoryLevel: 2.1,
  },
  {
    location: 'Fort Collins, CO',
    trend: 'stable',
    priceChange6m: 1.2,
    priceChange12m: 3.4,
    temperature: 'warm',
    daysOnMarket: 42,
    inventoryLevel: 3.2,
  },
  {
    location: 'Aurora, CO',
    trend: 'increasing',
    priceChange6m: 2.8,
    priceChange12m: 5.9,
    temperature: 'hot',
    daysOnMarket: 25,
    inventoryLevel: 2.8,
  },
];

export function MarketAnalysis() {
  const [selectedLocation, setSelectedLocation] = useState<MarketTrend | null>(null);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'hot':
        return 'bg-red-100 text-red-800';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'cool':
        return 'bg-blue-100 text-blue-800';
      case 'cold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Market Analysis</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-semibold">Market Trends</h2>
            </div>

            <div className="divide-y">
              {MARKET_DATA.map((market) => (
                <div
                  key={market.location}
                  onClick={() => setSelectedLocation(market)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{market.location}</h3>
                      <p className="text-gray-600 text-sm">
                        {market.trend === 'increasing' && '✓ Market is appreciating'}
                        {market.trend === 'decreasing' && '⚠ Market is declining'}
                        {market.trend === 'stable' && '~ Market is stable'}
                      </p>
                    </div>
                    <div className="text-3xl">{getTrendIcon(market.trend)}</div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">6-Month Change</p>
                      <p className={`text-xl font-bold ${market.priceChange6m >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {market.priceChange6m > 0 ? '+' : ''}{market.priceChange6m}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">12-Month Change</p>
                      <p className={`text-xl font-bold ${market.priceChange12m >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {market.priceChange12m > 0 ? '+' : ''}{market.priceChange12m}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Days on Market</p>
                      <p className="text-xl font-bold">{market.daysOnMarket}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Inventory Level</p>
                      <p className="text-xl font-bold">{market.inventoryLevel}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getTemperatureColor(market.temperature)}`}>
                      {market.temperature} Market
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedLocation ? (
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h3 className="text-xl font-semibold mb-4">{selectedLocation.location}</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Market Trend</p>
                  <p className="text-lg font-semibold capitalize">
                    {getTrendIcon(selectedLocation.trend)} {selectedLocation.trend}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm">Market Temperature</p>
                  <p className={`text-lg font-semibold capitalize px-3 py-2 rounded-md inline-block ${getTemperatureColor(selectedLocation.temperature)}`}>
                    {selectedLocation.temperature}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">Price Appreciation</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-blue-700">Last 6 Months</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedLocation.priceChange6m > 0 ? '+' : ''}{selectedLocation.priceChange6m}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Last 12 Months</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedLocation.priceChange12m > 0 ? '+' : ''}{selectedLocation.priceChange12m}%
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-gray-600 text-sm">Average Days on Market</p>
                  <p className="text-lg font-semibold">{selectedLocation.daysOnMarket} days</p>
                </div>

                <div>
                  <p className="text-gray-600 text-sm">Months of Inventory</p>
                  <p className="text-lg font-semibold">{selectedLocation.inventoryLevel} months</p>
                </div>

                <div className="bg-green-50 p-3 rounded-md text-sm text-green-800">
                  {selectedLocation.temperature === 'hot' && '🔥 Hot market - low inventory, high demand'}
                  {selectedLocation.temperature === 'warm' && '☀️ Warm market - good opportunities'}
                  {selectedLocation.temperature === 'cool' && '❄️ Cool market - buyer favorable'}
                  {selectedLocation.temperature === 'cold' && '🥶 Cold market - plenty of inventory'}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center sticky top-20">
              <p className="text-gray-600">Click on a market to see detailed analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
