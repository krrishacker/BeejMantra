import React, { useEffect } from 'react';
import { WeatherAlert } from '../../types';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts }) => {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Send push notifications for alerts
    if (alerts.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      alerts.forEach((alert) => {
        const notification = new Notification(`Weather Alert: ${alert.event}`, {
          body: alert.description,
          icon: '/favicon.ico',
          tag: alert.id,
          requireInteraction: true
        });

        // Auto-close notification after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      });
    }
  }, [alerts]);

  const getAlertIcon = (event: string): string => {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('storm') || eventLower.includes('thunder')) return '⛈️';
    if (eventLower.includes('rain') || eventLower.includes('flood')) return '🌧️';
    if (eventLower.includes('heat') || eventLower.includes('hot')) return '🌡️';
    if (eventLower.includes('drought') || eventLower.includes('dry')) return '🏜️';
    if (eventLower.includes('wind') || eventLower.includes('gale')) return '💨';
    if (eventLower.includes('snow') || eventLower.includes('ice')) return '❄️';
    return '⚠️';
  };

  const getAlertColor = (event: string): string => {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('warning') || eventLower.includes('severe')) return 'red';
    if (eventLower.includes('watch') || eventLower.includes('advisory')) return 'yellow';
    return 'blue';
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No weather alerts at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => {
        const alertColor = getAlertColor(alert.event);
        const bgColor = alertColor === 'red' ? 'bg-red-50 border-red-200' : 
                       alertColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 
                       'bg-blue-50 border-blue-200';
        const textColor = alertColor === 'red' ? 'text-red-800' : 
                         alertColor === 'yellow' ? 'text-yellow-800' : 
                         'text-blue-800';
        const iconColor = alertColor === 'red' ? 'text-red-600' : 
                         alertColor === 'yellow' ? 'text-yellow-600' : 
                         'text-blue-600';

        return (
          <div key={alert.id} className={`border rounded-lg p-4 ${bgColor}`}>
            <div className="flex items-start space-x-3">
              <div className={`text-2xl ${iconColor}`}>
                {getAlertIcon(alert.event)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold text-lg ${textColor}`}>
                    {alert.event}
                  </h3>
                  <span className={`text-sm ${textColor} opacity-75`}>
                    {formatDateTime(alert.start)} - {formatDateTime(alert.end)}
                  </span>
                </div>
                
                <p className={`text-sm ${textColor} mb-3 leading-relaxed`}>
                  {alert.description}
                </p>
                
                {alert.tags && alert.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {alert.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${textColor} bg-white bg-opacity-50`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Notification Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="text-gray-600">🔔</div>
          <div className="text-sm text-gray-600">
            {Notification.permission === 'granted' 
              ? 'Push notifications are enabled for weather alerts'
              : Notification.permission === 'denied'
              ? 'Push notifications are blocked. Please enable them in your browser settings.'
              : 'Click "Allow" when prompted to receive weather alert notifications'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherAlerts;
