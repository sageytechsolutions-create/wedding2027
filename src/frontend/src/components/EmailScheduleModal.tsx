import { useState } from 'react';

interface EmailScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (config: EmailScheduleConfig) => void;
  portfolioName?: string;
}

interface EmailScheduleConfig {
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'once';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  dayOfMonth?: number;
  time: string;
  reportType: 'summary' | 'full' | 'executive';
  recipients: string[];
  nextRun?: Date;
}

export function EmailScheduleModal({ isOpen, onClose, onSchedule, portfolioName = 'Portfolio' }: EmailScheduleModalProps) {
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'once'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('monday');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [time, setTime] = useState('09:00');
  const [reportType, setReportType] = useState<'summary' | 'full' | 'executive'>('summary');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [testEmailSent, setTestEmailSent] = useState(false);

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const handleSchedule = () => {
    const validRecipients = recipients.filter((r) => r.trim().length > 0);
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient email address');
      return;
    }

    onSchedule({
      frequency,
      dayOfWeek: frequency === 'weekly' ? (dayOfWeek as any) : undefined,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
      time,
      reportType,
      recipients: validRecipients,
    });

    resetForm();
    onClose();
  };

  const handleSendTestEmail = () => {
    const validRecipients = recipients.filter((r) => r.trim().length > 0);
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient email address');
      return;
    }

    console.log('Sending test email to:', validRecipients);
    setTestEmailSent(true);
    setTimeout(() => setTestEmailSent(false), 3000);
  };

  const resetForm = () => {
    setFrequency('weekly');
    setDayOfWeek('monday');
    setDayOfMonth(1);
    setTime('09:00');
    setReportType('summary');
    setRecipients(['']);
    setTestEmailSent(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Schedule Report Delivery</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-100 mt-1">Email {portfolioName} reports on a regular schedule</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Report Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['weekly', 'monthly', 'quarterly', 'once'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`p-3 rounded-lg border-2 transition font-medium capitalize ${
                    frequency === freq
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Day/Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Day of Week
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <option key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Day of Month
                </label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Time of Day
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Report Type
            </label>
            <div className="space-y-3">
              {(['summary', 'full', 'executive'] as const).map((type) => (
                <label key={type} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reportType"
                    value={type}
                    checked={reportType === type}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{type} Report</p>
                    <p className="text-sm text-gray-600">
                      {type === 'summary' && 'Key metrics and portfolio overview'}
                      {type === 'full' && 'Complete analysis with all properties and charts'}
                      {type === 'executive' && 'Highlights and recommendations only'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Recipients ({recipients.filter((r) => r.trim().length > 0).length})
            </label>
            <div className="space-y-2 mb-3">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipient}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {recipients.length > 1 && (
                    <button
                      onClick={() => handleRemoveRecipient(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddRecipient}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
            >
              + Add Another Recipient
            </button>
          </div>

          {/* Test Email */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-3">Test Email Delivery</p>
            <button
              onClick={handleSendTestEmail}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {testEmailSent ? '✓ Test Email Sent' : 'Send Test Email'}
            </button>
            <p className="text-xs text-gray-600 mt-2">
              Send a test report to verify recipients and formatting
            </p>
          </div>

          {/* Email Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Email Preview</p>
            <div className="bg-white border border-gray-300 rounded p-4 text-sm">
              <p className="font-semibold text-gray-900">Subject: {portfolioName} - {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                {`Hello,

Your scheduled ${reportType} report for ${portfolioName} is attached.

Report Details:
- Generated: ${new Date().toLocaleDateString()}
- Report Type: ${reportType}
- Frequency: ${frequency}

Best regards,
Investment Platform`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 sticky bottom-0 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
}
