import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface MarketArea {
  id: string;
  name: string;
  zipCode: string;
  temperature: 'Hot' | 'Warm' | 'Cool' | 'Cold';
  avgPrice: number;
  pricePerSqft: number;
  appreciation6m: number;
  appreciation12m: number;
  inventory: number;
  daysOnMarket: number;
  schoolRating: number;
  crimeRate: number;
  walkability: number;
  x: number;
  y: number;
}

const marketData: MarketArea[] = [
  {
    id: 'denver_downtown',
    name: 'Downtown Denver',
    zipCode: '80202',
    temperature: 'Warm',
    avgPrice: 625000,
    pricePerSqft: 285,
    appreciation6m: 2.1,
    appreciation12m: 5.3,
    inventory: 145,
    daysOnMarket: 16,
    schoolRating: 7.2,
    crimeRate: 45.2,
    walkability: 72,
    x: 50,
    y: 50,
  },
  {
    id: 'denver_southwest',
    name: 'Southwest Denver',
    zipCode: '80219',
    temperature: 'Cool',
    avgPrice: 450000,
    pricePerSqft: 240,
    appreciation6m: 0.8,
    appreciation12m: 2.1,
    inventory: 180,
    daysOnMarket: 22,
    schoolRating: 6.8,
    crimeRate: 52.3,
    walkability: 58,
    x: 35,
    y: 65,
  },
  {
    id: 'boulder',
    name: 'Boulder',
    zipCode: '80302',
    temperature: 'Hot',
    avgPrice: 875000,
    pricePerSqft: 425,
    appreciation6m: 3.4,
    appreciation12m: 7.8,
    inventory: 42,
    daysOnMarket: 12,
    schoolRating: 8.5,
    crimeRate: 28.1,
    walkability: 85,
    x: 48,
    y: 25,
  },
  {
    id: 'fort_collins',
    name: 'Fort Collins',
    zipCode: '80521',
    temperature: 'Warm',
    avgPrice: 525000,
    pricePerSqft: 240,
    appreciation6m: 2.8,
    appreciation12m: 4.5,
    inventory: 98,
    daysOnMarket: 18,
    schoolRating: 7.8,
    crimeRate: 35.1,
    walkability: 68,
    x: 52,
    y: 15,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    zipCode: '80010',
    temperature: 'Cold',
    avgPrice: 425000,
    pricePerSqft: 195,
    appreciation6m: 1.2,
    appreciation12m: 2.1,
    inventory: 230,
    daysOnMarket: 28,
    schoolRating: 6.8,
    crimeRate: 52.3,
    walkability: 58,
    x: 65,
    y: 55,
  },
  {
    id: 'littleton',
    name: 'Littleton',
    zipCode: '80120',
    temperature: 'Cool',
    avgPrice: 550000,
    pricePerSqft: 260,
    appreciation6m: 1.5,
    appreciation12m: 3.2,
    inventory: 105,
    daysOnMarket: 20,
    schoolRating: 7.5,
    crimeRate: 38.2,
    walkability: 65,
    x: 40,
    y: 75,
  },
];

export function MarketHeatmap() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [selectedArea, setSelectedArea] = useState<MarketArea | null>(null);
  const [metricFilter, setMetricFilter] = useState<string>('temperature');

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const getTemperatureColor = (temp: string): string => {
    switch (temp) {
      case 'Hot':
        return '#EF4444';
      case 'Warm':
        return '#F97316';
      case 'Cool':
        return '#3B82F6';
      case 'Cold':
        return '#0EA5E9';
      default:
        return '#6B7280';
    }
  };

  const getMetricValue = (area: MarketArea): number => {
    switch (metricFilter) {
      case 'temperature':
        const tempMap = { Hot: 100, Warm: 75, Cool: 50, Cold: 25 };
        return tempMap[area.temperature];
      case 'appreciation':
        return Math.min(100, area.appreciation12m * 15);
      case 'inventory':
        return Math.min(100, 100 - (area.inventory / 3));
      case 'pricePerSqft':
        return Math.min(100, (area.pricePerSqft / 425) * 100);
      case 'walkability':
        return area.walkability;
      default:
        return 50;
    }
  };

  const getMetricColor = (value: number): string => {
    if (value >= 80) return '#22C55E';
    if (value >= 60) return '#3B82F6';
    if (value >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Market Heatmap</h1>
          <p className="text-gray-600">
            Visualize market conditions across Colorado regions
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Display Metric
          </label>
          <select
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="temperature">Market Temperature</option>
            <option value="appreciation">12-Month Appreciation</option>
            <option value="inventory">Inventory Level</option>
            <option value="pricePerSqft">Price per Sqft</option>
            <option value="walkability">Walkability Score</option>
          </select>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <svg
            viewBox="0 0 800 600"
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: '600px' }}
          >
            {/* Background */}
            <rect width="800" height="600" fill="#F3F4F6" />

            {/* Bubbles */}
            {marketData.map((area) => {
              const metricValue = getMetricValue(area);
              const radius = metricFilter === 'temperature' ? 40 : 35;
              const color =
                metricFilter === 'temperature'
                  ? getTemperatureColor(area.temperature)
                  : getMetricColor(metricValue);

              return (
                <g key={area.id}>
                  {/* Bubble */}
                  <circle
                    cx={area.x * 8}
                    cy={area.y * 8}
                    r={radius}
                    fill={color}
                    opacity={0.7}
                    stroke="white"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'opacity 0.3s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute('opacity', '0.9');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.setAttribute('opacity', '0.7');
                    }}
                    onClick={() => setSelectedArea(area)}
                  />

                  {/* Label */}
                  <text
                    x={area.x * 8}
                    y={area.y * 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold"
                    fill="white"
                    pointerEvents="none"
                  >
                    {area.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricFilter === 'temperature' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-700">Hot (High Demand)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-gray-700">Warm (Stable)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Cool (Moderate)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500"></div>
                  <span className="text-sm text-gray-700">Cold (Low Demand)</span>
                </div>
              </>
            )}
            {metricFilter !== 'temperature' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700">Excellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-gray-700">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-700">Poor</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Area Details */}
        {selectedArea && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedArea.name}</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-700">ZIP Code:</span>
                    <span className="font-semibold text-gray-900">{selectedArea.zipCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Market Temperature:</span>
                    <span
                      className="font-semibold px-3 py-1 rounded-full text-white text-sm"
                      style={{ backgroundColor: getTemperatureColor(selectedArea.temperature) }}
                    >
                      {selectedArea.temperature}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Average Price:</span>
                    <span className="font-semibold text-gray-900">
                      ${selectedArea.avgPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Price per Sqft:</span>
                    <span className="font-semibold text-gray-900">
                      ${selectedArea.pricePerSqft}/sqft
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3">Market Trends</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">6-Month Appreciation</span>
                      <span className="text-sm font-semibold text-green-600">
                        +{selectedArea.appreciation6m.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(100, selectedArea.appreciation6m * 30)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-700">12-Month Appreciation</span>
                      <span className="text-sm font-semibold text-green-600">
                        +{selectedArea.appreciation12m.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(100, selectedArea.appreciation12m * 15)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Market Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Inventory Level</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedArea.inventory} homes
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(100, (selectedArea.inventory / 250) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Days on Market</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedArea.daysOnMarket} days
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${Math.min(100, (selectedArea.daysOnMarket / 60) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">School Rating</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedArea.schoolRating}/10
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(selectedArea.schoolRating / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Walkability Score</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedArea.walkability}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${selectedArea.walkability}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Crime Rate</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedArea.crimeRate}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${selectedArea.crimeRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
