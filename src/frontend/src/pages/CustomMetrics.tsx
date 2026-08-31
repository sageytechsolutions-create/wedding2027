import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useMetricsStore, CustomMetric } from '../store/metricsStore';

export function CustomMetrics() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { metrics, addMetric, updateMetric, deleteMetric, selectMetric } = useMetricsStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formulaType: 'ratio' as const,
    field: '',
    numeratorField: '',
    denominatorField: '',
    formula: '',
    displayFormat: 'percentage' as const,
    thresholdAlert: '',
  });

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleAddMetric = () => {
    if (!formData.name) {
      alert('Please enter a metric name');
      return;
    }

    const newMetric: Omit<CustomMetric, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name,
      description: formData.description,
      formulaType: formData.formulaType,
      ...(formData.formulaType === 'sum' && { field: formData.field }),
      ...(formData.formulaType === 'average' && { field: formData.field }),
      ...(formData.formulaType === 'ratio' && {
        numeratorField: formData.numeratorField,
        denominatorField: formData.denominatorField,
      }),
      ...(formData.formulaType === 'formula' && { formula: formData.formula }),
      displayFormat: formData.displayFormat,
      ...(formData.thresholdAlert && { thresholdAlert: parseFloat(formData.thresholdAlert) }),
    };

    if (editingId) {
      updateMetric(editingId, newMetric);
      setEditingId(null);
    } else {
      addMetric(newMetric);
    }

    resetForm();
  };

  const handleEditMetric = (metric: CustomMetric) => {
    setFormData({
      name: metric.name,
      description: metric.description,
      formulaType: metric.formulaType,
      field: metric.field || '',
      numeratorField: metric.numeratorField || '',
      denominatorField: metric.denominatorField || '',
      formula: metric.formula || '',
      displayFormat: metric.displayFormat,
      thresholdAlert: metric.thresholdAlert?.toString() || '',
    });
    setEditingId(metric.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      formulaType: 'ratio',
      field: '',
      numeratorField: '',
      denominatorField: '',
      formula: '',
      displayFormat: 'percentage',
      thresholdAlert: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const formulaTypeDescriptions = {
    sum: 'Sum a single field across all properties',
    average: 'Calculate average of a single field',
    ratio: 'Divide one field by another',
    formula: 'Custom mathematical formula',
  };

  const formulaExamples = {
    sum: 'Total annual rent income',
    average: 'Average property value',
    ratio: 'Debt Service Coverage Ratio = NOI / Annual Debt Payment',
    formula: '(totalValue - totalDebt) / totalValue',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Custom Metrics</h1>
          <p className="text-gray-600">Create and manage custom investment metrics tailored to your analysis</p>
        </div>

        {/* Create Metric Button */}
        <button
          onClick={() => setShowForm(true)}
          className="mb-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Create New Metric
        </button>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Metric' : 'Create New Metric'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Metric Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Debt Service Coverage Ratio"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Formula Type
                  </label>
                  <select
                    value={formData.formulaType}
                    onChange={(e) => setFormData({ ...formData, formulaType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="ratio">Ratio</option>
                    <option value="formula">Custom Formula</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Explain what this metric measures and how it's useful"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type-specific inputs */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Help:</strong> {formulaTypeDescriptions[formData.formulaType]}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Example:</strong> {formulaExamples[formData.formulaType]}
                </p>

                {(formData.formulaType === 'sum' || formData.formulaType === 'average') && (
                  <input
                    type="text"
                    placeholder="Field name (e.g., totalRentIncome)"
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {formData.formulaType === 'ratio' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Numerator field (e.g., noi)"
                      value={formData.numeratorField}
                      onChange={(e) => setFormData({ ...formData, numeratorField: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-center">
                      <div className="flex-1 border-t border-gray-300"></div>
                      <span className="px-3 text-gray-600 font-bold">÷</span>
                      <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                    <input
                      type="text"
                      placeholder="Denominator field (e.g., annualDebtPayment)"
                      value={formData.denominatorField}
                      onChange={(e) => setFormData({ ...formData, denominatorField: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {formData.formulaType === 'formula' && (
                  <input
                    type="text"
                    placeholder="e.g., (totalValue - totalDebt) / totalValue"
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                )}
              </div>

              {/* Display Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Display Format
                  </label>
                  <select
                    value={formData.displayFormat}
                    onChange={(e) => setFormData({ ...formData, displayFormat: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="currency">Currency ($)</option>
                    <option value="number">Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Alert Threshold (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Alert when value falls below this"
                    value={formData.thresholdAlert}
                    onChange={(e) => setFormData({ ...formData, thresholdAlert: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleAddMetric}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingId ? 'Update Metric' : 'Create Metric'}
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metrics List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Metrics ({metrics.length})
          </h2>

          {metrics.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg">No custom metrics yet</p>
              <p className="text-gray-500 mt-2">Create your first metric to get started</p>
            </div>
          ) : (
            metrics.map((metric) => (
              <div key={metric.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{metric.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{metric.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditMetric(metric)}
                      className="px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMetric(metric.id)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Type</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{metric.formulaType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Format</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{metric.displayFormat}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Alert Threshold</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{metric.thresholdAlert ? metric.thresholdAlert.toString() : 'None'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Created</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(metric.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {(metric.formulaType === 'sum' || metric.formulaType === 'average') && metric.field && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
                    Field: <span className="font-semibold">{metric.field}</span>
                  </div>
                )}

                {metric.formulaType === 'ratio' && metric.numeratorField && metric.denominatorField && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
                    {metric.numeratorField} ÷ {metric.denominatorField}
                  </div>
                )}

                {metric.formulaType === 'formula' && metric.formula && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
                    {metric.formula}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Templates Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Popular Metric Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'Cash-on-Cash Return',
                formula: 'Annual Cash Flow ÷ Invested Capital',
                desc: 'Annual return on actual cash invested',
              },
              {
                name: 'Debt Service Coverage',
                formula: 'Net Operating Income ÷ Annual Debt Payment',
                desc: 'Ability to cover debt with income',
              },
              {
                name: 'Equity Build Rate',
                formula: '(Appreciation + Principal Paydown) ÷ Property Value',
                desc: 'Annual growth in equity percentage',
              },
              {
                name: 'Portfolio Stability',
                formula: '(Geographic Diversity + Asset Variety) ÷ 2',
                desc: 'Overall portfolio diversification score',
              },
            ].map((template) => (
              <div key={template.name} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.desc}</p>
                <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">{template.formula}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
