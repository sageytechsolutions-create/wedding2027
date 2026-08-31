import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

interface PropertyRecommendation {
  property_id: string;
  property_address: string;
  match_score: number;
  recommendation_type: string;
  reasoning: string[];
  risk_level: string;
  estimated_annual_return: number;
  estimated_roi: number;
  alignment_score: {
    cashflow: number;
    appreciation: number;
    risk: number;
    diversification: number;
    overall: number;
  };
}

export function DealRecommendations() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<PropertyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [investmentStyle, setInvestmentStyle] = useState<string>('mixed');
  const [scoreFilter, setScoreFilter] = useState<number>(60);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchRecommendations();
  }, [isAuthenticated, navigate, investmentStyle]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockRecs: PropertyRecommendation[] = [
        {
          property_id: 'prop_1',
          property_address: '456 Main St, Denver, CO',
          match_score: 87.3,
          recommendation_type: 'Strong Buy',
          reasoning: [
            'Strong rental income potential (Score: 78)',
            'Strong market appreciation (3.2% annual)',
            'Low market risk',
          ],
          risk_level: 'Medium',
          estimated_annual_return: 8.5,
          estimated_roi: 48.92,
          alignment_score: {
            cashflow: 78.0,
            appreciation: 72.5,
            risk: 75.0,
            diversification: 82.1,
            overall: 87.3,
          },
        },
        {
          property_id: 'prop_2',
          property_address: '789 Oak Ave, Denver, CO',
          match_score: 76.2,
          recommendation_type: 'Buy',
          reasoning: [
            'Good appreciation potential (Score: 75)',
            'Solid rental income (Score: 72)',
            'Moderate market risk',
          ],
          risk_level: 'Medium',
          estimated_annual_return: 7.2,
          estimated_roi: 42.15,
          alignment_score: {
            cashflow: 72.0,
            appreciation: 75.0,
            risk: 70.0,
            diversification: 78.0,
            overall: 76.2,
          },
        },
        {
          property_id: 'prop_3',
          property_address: '321 Pine Rd, Boulder, CO',
          match_score: 68.5,
          recommendation_type: 'Consider',
          reasoning: [
            'High property values in prime location',
            'Limited inventory (competitive market)',
            'Strong school district',
          ],
          risk_level: 'High',
          estimated_annual_return: 5.8,
          estimated_roi: 31.42,
          alignment_score: {
            cashflow: 62.0,
            appreciation: 78.0,
            risk: 58.0,
            diversification: 68.0,
            overall: 68.5,
          },
        },
      ];

      setRecommendations(mockRecs.filter(r => r.alignment_score.overall >= scoreFilter));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'Low':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'High':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationColor = (type: string): string => {
    switch (type) {
      case 'Strong Buy':
        return 'border-green-400 bg-green-50';
      case 'Buy':
        return 'border-blue-400 bg-blue-50';
      case 'Consider':
        return 'border-yellow-400 bg-yellow-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Deal Recommendations</h1>
          <p className="text-gray-600">
            AI-powered property recommendations matched to your investment profile
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Style
              </label>
              <select
                value={investmentStyle}
                onChange={(e) => setInvestmentStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mixed">Mixed (Balanced)</option>
                <option value="rental">Rental (Cash Flow)</option>
                <option value="flip">Flip (Quick Returns)</option>
                <option value="appreciation">Appreciation (Long-term Growth)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Match Score: {scoreFilter}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={scoreFilter}
                onChange={(e) => setScoreFilter(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">
              No recommendations match your criteria. Try adjusting filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {recommendations.map((rec) => (
              <div
                key={rec.property_id}
                className={`border-l-4 rounded-lg shadow-md p-6 ${getRecommendationColor(
                  rec.recommendation_type
                )}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Property Info */}
                  <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {rec.property_address}
                    </h3>
                    <div className="mb-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(
                          rec.risk_level
                        )}`}
                      >
                        {rec.risk_level} Risk
                      </span>
                      <span className="ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {rec.recommendation_type}
                      </span>
                    </div>

                    {/* Reasoning */}
                    <div className="bg-white bg-opacity-50 rounded p-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Why we recommend this:</h4>
                      <ul className="space-y-1">
                        {rec.reasoning.map((reason, idx) => (
                          <li key={idx} className="text-sm text-gray-700">
                            • {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Score & Returns */}
                  <div className="lg:col-span-2">
                    {/* Overall Score */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-4xl font-bold ${getScoreColor(
                          rec.alignment_score.overall
                        )}`}>
                          {rec.alignment_score.overall.toFixed(1)}
                        </span>
                        <span className="text-gray-600">/ 100</span>
                      </div>
                      <p className="text-sm text-gray-600">Match Score</p>
                    </div>

                    {/* Mini Score Breakdown */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Cash Flow</span>
                        <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${rec.alignment_score.cashflow}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 ml-2">
                          {rec.alignment_score.cashflow.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Appreciation</span>
                        <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${rec.alignment_score.appreciation}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 ml-2">
                          {rec.alignment_score.appreciation.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Financial Returns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white bg-opacity-50 rounded p-3">
                        <p className="text-xs text-gray-600">Annual Return</p>
                        <p className="text-2xl font-bold text-green-600">
                          {rec.estimated_annual_return.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-50 rounded p-3">
                        <p className="text-xs text-gray-600">5-Year ROI</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {rec.estimated_roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/properties/${rec.property_id}`)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    View Details
                  </button>
                  <button className="flex-1 border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition">
                    Add to Portfolio
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
