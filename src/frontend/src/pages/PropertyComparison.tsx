import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface PropertyData {
  id: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  pricePerSqft: number;
  investmentScore: number;
  cashflowScore: number;
  appreciationScore: number;
  riskScore: number;
  annualRent: number;
  annualExpenses: number;
}

const mockProperties: PropertyData[] = [
  {
    id: 'prop_1',
    address: '456 Main St',
    city: 'Denver',
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    pricePerSqft: 250,
    investmentScore: 87.3,
    cashflowScore: 78,
    appreciationScore: 72.5,
    riskScore: 75,
    annualRent: 30000,
    annualExpenses: 9000,
  },
  {
    id: 'prop_2',
    address: '789 Oak Ave',
    city: 'Denver',
    price: 425000,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1400,
    pricePerSqft: 304,
    investmentScore: 76.2,
    cashflowScore: 72,
    appreciationScore: 75,
    riskScore: 70,
    annualRent: 25000,
    annualExpenses: 8000,
  },
  {
    id: 'prop_3',
    address: '321 Pine Rd',
    city: 'Boulder',
    price: 625000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2200,
    pricePerSqft: 284,
    investmentScore: 68.5,
    cashflowScore: 62,
    appreciationScore: 78,
    riskScore: 58,
    annualRent: 35000,
    annualExpenses: 12000,
  },
];

export function PropertyComparison() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handlePropertySelect = (id: string) => {
    if (selectedProperties.includes(id)) {
      setSelectedProperties(selectedProperties.filter((p) => p !== id));
    } else if (selectedProperties.length < 5) {
      setSelectedProperties([...selectedProperties, id]);
    }
  };

  const selectedData = mockProperties.filter((p) => selectedProperties.includes(p.id));

  const getMetricColor = (value: number, max: number = 100): string => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Property Comparison</h1>
          <p className="text-gray-600">
            Compare up to 5 properties side-by-side to make better investment decisions
          </p>
        </div>

        {/* Property Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Select Properties to Compare ({selectedProperties.length}/5)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockProperties.map((prop) => (
              <label
                key={prop.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedProperties.includes(prop.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedProperties.includes(prop.id)}
                  onChange={() => handlePropertySelect(prop.id)}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold text-gray-900">{prop.address}</p>
                  <p className="text-sm text-gray-600">{prop.city}, CO</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    {formatCurrency(prop.price)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        {selectedData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">Metric</th>
                    {selectedData.map((prop) => (
                      <th
                        key={prop.id}
                        className="px-6 py-4 text-center font-semibold text-gray-900"
                      >
                        <div>{prop.address}</div>
                        <div className="text-xs text-gray-600 font-normal">{prop.city}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Price */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Purchase Price</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-bold text-gray-900">{formatCurrency(prop.price)}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Price per Sqft */}
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Price per Sqft</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-gray-700">
                          ${prop.pricePerSqft}/sqft
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Property Details */}
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900" colSpan={selectedData.length + 1}>
                      Property Details
                    </td>
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Bedrooms</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-gray-700">{prop.bedrooms}</div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Bathrooms</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-gray-700">{prop.bathrooms}</div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Square Feet</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-gray-700">
                          {prop.squareFeet.toLocaleString()} sqft
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Financial Metrics */}
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900" colSpan={selectedData.length + 1}>
                      Financial Metrics
                    </td>
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Annual Rent</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(prop.annualRent)}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Annual Expenses</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(prop.annualExpenses)}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Annual Net Income</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="font-bold text-green-600">
                          {formatCurrency(prop.annualRent - prop.annualExpenses)}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Cap Rate</td>
                    {selectedData.map((prop) => {
                      const capRate = ((prop.annualRent - prop.annualExpenses) / prop.price) * 100;
                      return (
                        <td key={prop.id} className="px-6 py-4 text-center">
                          <div className="font-bold text-blue-600">{capRate.toFixed(2)}%</div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Investment Scores */}
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900" colSpan={selectedData.length + 1}>
                      AI Investment Scores (0-100)
                    </td>
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Overall Score</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${getMetricColor(
                              prop.investmentScore
                            )}`}
                          >
                            {prop.investmentScore.toFixed(1)}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Cash Flow Score</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div
                              className={`h-full ${getMetricColor(prop.cashflowScore)}`}
                              style={{ width: `${prop.cashflowScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">{prop.cashflowScore}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Appreciation Score</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div
                              className={`h-full ${getMetricColor(prop.appreciationScore)}`}
                              style={{ width: `${prop.appreciationScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">{prop.appreciationScore}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">Risk Level</td>
                    {selectedData.map((prop) => (
                      <td key={prop.id} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                            <div
                              className="h-full bg-yellow-500"
                              style={{ width: `${prop.riskScore}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">{prop.riskScore}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedData.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">
              Select properties above to begin comparison
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
