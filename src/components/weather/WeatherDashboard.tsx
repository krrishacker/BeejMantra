import React, { useState, useEffect } from 'react';
import { weatherService, SAMPLE_COORDINATES } from '../../services/weatherService';
import {
  CurrentWeatherResponse,
  HourlyWeatherResponse,
  DailyWeatherResponse,
  WeatherAlertsResponse
} from '../../types';
import CurrentWeatherCard from './CurrentWeatherCard';
import HourlyForecastChart from './HourlyForecastChart';
import DailyForecastTable from './DailyForecastTable';
import WeatherAlerts from './WeatherAlerts';
import LocationSelector from './LocationSelector';

const WeatherDashboard: React.FC = () => {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherResponse | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyWeatherResponse | null>(null);
  const [dailyForecast, setDailyForecast] = useState<DailyWeatherResponse | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(SAMPLE_COORDINATES.punjab);

  const fetchWeatherData = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const [current, hourly, daily, alerts] = await Promise.all([
        weatherService.getCurrentWeather(lat, lon),
        weatherService.getHourlyForecast(lat, lon),
        weatherService.getDailyForecast(lat, lon),
        weatherService.getWeatherAlerts(lat, lon)
      ]);

      setCurrentWeather(current);
      setHourlyForecast(hourly);
      setDailyForecast(daily);
      setWeatherAlerts(alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData(selectedLocation.lat, selectedLocation.lon);
  }, [selectedLocation.lat, selectedLocation.lon, selectedLocation.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocationChange = (location: typeof SAMPLE_COORDINATES.delhi) => {
    setSelectedLocation(location);
  };

  if (loading && !currentWeather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Weather Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time weather data for farmers' planning and decision making
          </p>
        </div>

        {/* Location Selector */}
        <div className="mb-6">
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={handleLocationChange}
            coordinates={SAMPLE_COORDINATES}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weather Alerts - Always show for testing */}
        {weatherAlerts && (
          <div className="mb-6">
            {weatherAlerts.alerts.length > 0 ? (
              <WeatherAlerts alerts={weatherAlerts.alerts} />
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-600">No weather alerts at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* Current Weather */}
        {currentWeather && (
          <div className="mb-8">
            <CurrentWeatherCard weather={currentWeather} />
          </div>
        )}

        {/* Charts and Forecasts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Forecast Chart */}
          {hourlyForecast && (
            <div className="lg:col-span-2">
              <HourlyForecastChart data={hourlyForecast} />
            </div>
          )}

          {/* Daily Forecast Table */}
          {dailyForecast && (
            <div className="lg:col-span-2">
              <DailyForecastTable data={dailyForecast} />
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => fetchWeatherData(selectedLocation.lat, selectedLocation.lon)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Refreshing...' : 'Refresh Weather Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboard;
