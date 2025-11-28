import React from 'react';
import { CurrentWeatherResponse } from '../../types';

interface CurrentWeatherCardProps {
  weather: CurrentWeatherResponse;
}

const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({ weather }) => {
  const { location, current } = weather;

  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWeatherEmoji = (icon: string, description: string): string => {
    const desc = description.toLowerCase();
    
    // Clear sky
    if (icon === '01d') return '☀️';
    if (icon === '01n') return '🌙';
    
    // Few clouds
    if (icon === '02d') return '⛅';
    if (icon === '02n') return '☁️';
    
    // Scattered clouds
    if (icon === '03d' || icon === '03n') return '☁️';
    
    // Broken clouds
    if (icon === '04d' || icon === '04n') return '☁️';
    
    // Shower rain
    if (icon === '09d' || icon === '09n') return '🌦️';
    
    // Rain
    if (icon === '10d' || icon === '10n') return '🌧️';
    
    // Thunderstorm
    if (icon === '11d' || icon === '11n') return '⛈️';
    
    // Snow
    if (icon === '13d' || icon === '13n') return '❄️';
    
    // Mist/Haze
    if (icon === '50d' || icon === '50n') return '🌫️';
    
    // Fallback based on description
    if (desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('thunder')) return '⛈️';
    if (desc.includes('mist') || desc.includes('fog') || desc.includes('haze')) return '🌫️';
    
    return '🌤️'; // Default
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{location.name}</h2>
          <p className="text-gray-600">{location.country}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Last updated</p>
          <p className="text-sm text-gray-600">{formatTime(current.timestamp)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Weather Info */}
        <div className="md:col-span-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="w-24 h-24 flex items-center justify-center text-6xl">
                {getWeatherEmoji(current.icon, current.description)}
              </div>
            </div>
            <div className="text-6xl font-bold text-gray-800 mb-2">
              {current.temperature}°
            </div>
            <p className="text-xl text-gray-600 capitalize">{current.description}</p>
            <p className="text-sm text-gray-500">Feels like {current.feels_like}°</p>
          </div>
        </div>

        {/* Weather Details */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">💧</div>
              <div className="text-sm text-gray-600">Humidity</div>
              <div className="text-lg font-semibold text-gray-800">{current.humidity}%</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">🌬️</div>
              <div className="text-sm text-gray-600">Wind</div>
              <div className="text-lg font-semibold text-gray-800">
                {current.wind_speed} m/s
              </div>
              <div className="text-xs text-gray-500">{getWindDirection(current.wind_direction)}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm text-gray-600">Pressure</div>
              <div className="text-lg font-semibold text-gray-800">{current.pressure} hPa</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">👁️</div>
              <div className="text-sm text-gray-600">Visibility</div>
              <div className="text-lg font-semibold text-gray-800">{current.visibility} km</div>
            </div>
          </div>

          {/* Precipitation */}
          {(current.rain > 0 || current.snow > 0) && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Precipitation</h3>
              <div className="grid grid-cols-2 gap-4">
                {current.rain > 0 && (
                  <div className="text-center">
                    <div className="text-2xl mb-1">🌧️</div>
                    <div className="text-sm text-blue-600">Rain (1h)</div>
                    <div className="text-lg font-semibold text-blue-800">{current.rain} mm</div>
                  </div>
                )}
                {current.snow > 0 && (
                  <div className="text-center">
                    <div className="text-2xl mb-1">❄️</div>
                    <div className="text-sm text-blue-600">Snow (1h)</div>
                    <div className="text-lg font-semibold text-blue-800">{current.snow} mm</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentWeatherCard;
