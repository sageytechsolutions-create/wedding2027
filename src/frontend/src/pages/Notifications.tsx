import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { metricsService } from '../services/metricsService';

interface NotificationItem {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    text: string;
    link: string;
  };
}

export function Notifications() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchNotifications();
  }, [isAuthenticated, navigate]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const alertsResponse = await metricsService.getAlerts().catch(() => ({ alerts: [] }));

      if (alertsResponse?.alerts) {
        const alertNotifications: NotificationItem[] = alertsResponse.alerts.map((alert: any) => ({
          id: alert.id,
          type: alert.breach_direction === 'above' ? 'warning' : 'alert',
          title: `Metric Alert: ${alert.breach_direction === 'above' ? 'Above' : 'Below'} Threshold`,
          message: `Current value: ${alert.current_value?.toFixed(2)} vs threshold: ${alert.threshold_value?.toFixed(2)}`,
          timestamp: new Date(alert.created_at),
          read: !!alert.acknowledged_at,
          action: {
            text: 'Acknowledge',
            link: `#alert-${alert.id}`,
          },
        }));

        setAlerts(alertsResponse.alerts);

        // Add some mock system notifications
        const systemNotifications: NotificationItem[] = [
          {
            id: 'sys-1',
            type: 'success',
            title: 'Report Generated Successfully',
            message: 'Your monthly portfolio report has been generated and is ready for download.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: false,
            action: {
              text: 'View Report',
              link: '/analytics',
            },
          },
          {
            id: 'sys-2',
            type: 'info',
            title: 'Schedule Created',
            message: 'Your weekly email schedule for portfolio updates has been created successfully.',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            read: true,
          },
        ];

        setNotifications([...alertNotifications, ...systemNotifications].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await metricsService.acknowledgeAlert(alertId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === alertId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const filteredNotifications = filterType === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return '🔴';
      case 'warning': return '🟠';
      case 'info': return '🔵';
      case 'success': return '🟢';
      default: return '⚫';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'alert': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'alert': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Stay updated with portfolio alerts and system notifications</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-medium">Total Notifications</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{notifications.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-medium">Unread</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{unreadCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm font-medium">Active Alerts</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{alerts.filter((a) => !a.acknowledged_at).length}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterType === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">
              {filterType === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 rounded-lg p-4 ${getNotificationColor(notification.type)} ${
                  !notification.read ? 'ring-1 ring-offset-1 ring-gray-300' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className="text-2xl mt-0.5">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${getTextColor(notification.type)}`}>
                        {notification.title}
                        {!notification.read && (
                          <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </h3>
                      <p className={`text-sm mt-1 ${getTextColor(notification.type)}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {notification.action && (
                      <a
                        href={notification.action.link}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition whitespace-nowrap"
                        onClick={(e) => {
                          if (notification.type === 'alert' || notification.type === 'warning') {
                            e.preventDefault();
                            const alertId = notification.id;
                            handleAcknowledgeAlert(alertId);
                          } else if (notification.action?.link.startsWith('/')) {
                            e.preventDefault();
                            navigate(notification.action.link);
                          }
                        }}
                      >
                        {notification.action.text}
                      </a>
                    )}
                    {!notification.read && (
                      <button
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((notif) =>
                              notif.id === notification.id ? { ...notif, read: true } : notif
                            )
                          );
                        }}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
