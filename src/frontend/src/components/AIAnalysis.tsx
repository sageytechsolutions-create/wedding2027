import { useState } from 'react';

interface ValuationData {
  estimated_value: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  valuation_breakdown: Record<string, any>;
}

interface ScoreData {
  overall_score: number;
  roi_score: number;
  cash_flow_score: number;
  appreciation_score: number;
  risk_score: number;
  recommendation: string;
  key_factors: string[];
}

interface AIAnalysisProps {
  propertyId: string;
  features: {
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    lotSize: number;
    yearBuilt: number;
    city: string;
    state: string;
    zipCode: string;
  };
}

export function AIAnalysis({ propertyId, features }: AIAnalysisProps) {
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'valuation' | 'score'>('valuation');

  const analyzeProperty = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call valuation endpoint
      const valuationRes = await fetch('http://localhost:8000/api/ai/valuation/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedrooms: features.bedrooms,
          bathrooms: features.bathrooms,
          square_feet: features.squareFeet,
          lot_size: features.lotSize,
          year_built: features.yearBuilt,
          city: features.city,
          state: features.state,
          zip_code: features.zipCode,
        }),
      });

      if (valuationRes.ok) {
        const valuationData = await valuationRes.json();
        setValuation(valuationData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze property');
    } finally {
      setIsLoading(false);
    }
  };

  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{score.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">AI Analysis</h2>

      {!valuation && !score ? (
        <button
          onClick={analyzeProperty}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Property with AI'}
        </button>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('valuation')}
              className={`px-4 py-2 rounded-md font-medium ${
                activeTab === 'valuation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Valuation
            </button>
            <button
              onClick={() => setActiveTab('score')}
              className={`px-4 py-2 rounded-md font-medium ${
                activeTab === 'score'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Investment Score
            </button>
          </div>

          {activeTab === 'valuation' && valuation && (
            <div>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-2">Estimated Value</p>
                <p className="text-4xl font-bold text-blue-600">
                  ${valuation.estimated_value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Range: ${valuation.confidence_interval_low.toLocaleString()} - $
                  {valuation.confidence_interval_high.toLocaleString()}
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-4">Valuation Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(valuation.valuation_breakdown).map(([key, data]: [string, any]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between">
                      <span className="font-medium">{data.description}</span>
                      <span className={`font-bold ${data.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'score' && score && (
            <div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-2">Overall Investment Score</p>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-5xl font-bold text-blue-600">{score.overall_score.toFixed(1)}</p>
                    <p className="text-sm text-gray-600">/100</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-800 mb-2">{score.recommendation}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
              <ScoreBar score={score.roi_score} label="ROI Potential" />
              <ScoreBar score={score.cash_flow_score} label="Cash Flow" />
              <ScoreBar score={score.appreciation_score} label="Appreciation" />
              <ScoreBar score={score.risk_score} label="Safety" />

              <h3 className="text-lg font-semibold mb-3 mt-6">Key Factors</h3>
              <ul className="space-y-2">
                {score.key_factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
    </div>
  );
}
