import React from 'react';
import { useTranslation } from 'react-i18next';
import { demoWeatherData, demoAdvisoryAlerts, demoYieldData } from '../data/demoData';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';

interface DemoSnapshotProps {
  currentLanguage: string;
  onNavigateToWeather?: () => void;
}

const DemoSnapshot: React.FC<DemoSnapshotProps> = ({ currentLanguage, onNavigateToWeather }) => {
  const { t, i18n } = useTranslation();
  
  // Sync i18n with currentLanguage prop
  React.useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('demo.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('demo.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weather Forecast */}
          <div 
            className="card cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
            onClick={onNavigateToWeather}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{t('demo.weatherForecast')}</h3>
              <div className="text-sm text-blue-600 font-medium hover:text-blue-800">
                {t('demo.viewFullDashboard')}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {demoWeatherData.map((day, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {day.date}
                  </div>
                  <div className="text-2xl mb-1">
                    {day.icon}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {day.temperature}°C
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.condition}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {t('demo.clickToAccess')}
              </p>
            </div>
          </div>

          {/* Yield Prediction Chart */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('demo.yieldTrend')}</h3>
            <div className="flex items-end justify-between h-32 mb-4">
              {demoYieldData.map((data, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-8 bg-primary-500 rounded-t-sm transition-all duration-300 hover:bg-primary-600"
                    style={{ height: `${(data.yield / 100) * 80}px` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2">
                    {data.month}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span>{t('demo.expectedYield')}</span>
            </div>
          </div>
        </div>

        {/* Advisory Alerts */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">{t('demo.recentAlerts')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoAdvisoryAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 mb-1">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {alert.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSnapshot;
