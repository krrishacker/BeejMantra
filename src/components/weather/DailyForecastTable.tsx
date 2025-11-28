import React from 'react';
import { DailyWeatherResponse } from '../../types';

interface DailyForecastTableProps {
  data: DailyWeatherResponse;
}

const DailyForecastTable: React.FC<DailyForecastTableProps> = ({ data }) => {
  const { daily } = data;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (iconCode: string): string => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getPrecipitationIcon = (rain: number, snow: number): string => {
    if (snow > 0) return '❄️';
    if (rain > 0) return '🌧️';
    return '';
  };

  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">16-Day Forecast</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Weather</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Temperature</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Humidity</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Wind</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Precipitation</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Rain Chance</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((day, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-800">
                    {formatDate(day.date)}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={getWeatherIcon(day.icon)}
                      alt={day.description}
                      className="w-10 h-10"
                    />
                    <div>
                      <div className="font-medium text-gray-800 capitalize">
                        {day.description}
                      </div>
                      <div className="text-sm text-gray-500">
                        {day.clouds}% clouds
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-800">
                      {day.temperature.max}° / {day.temperature.min}°
                    </div>
                    <div className="text-sm text-gray-500">
                      Day: {day.temperature.day}° | Night: {day.temperature.night}°
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="font-semibold text-gray-800">
                    {day.humidity}%
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-800">
                      {day.wind_speed} m/s
                    </div>
                    <div className="text-sm text-gray-500">
                      {getWindDirection(day.wind_direction)}
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {getPrecipitationIcon(day.rain, day.snow)}
                    <span className="font-semibold text-gray-800">
                      {day.rain > 0 ? `${day.rain}mm` : day.snow > 0 ? `${day.snow}mm` : '0mm'}
                    </span>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <div className="font-semibold text-gray-800">
                    {day.pop}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Temperature Range</h3>
          <div className="text-sm text-blue-700">
            <div>Highest: {Math.max(...daily.map(d => d.temperature.max))}°C</div>
            <div>Lowest: {Math.min(...daily.map(d => d.temperature.min))}°C</div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Rainy Days</h3>
          <div className="text-sm text-green-700">
            <div>Days with rain: {daily.filter(d => d.rain > 0).length}</div>
            <div>Total rainfall: {daily.reduce((sum, d) => sum + d.rain, 0).toFixed(1)}mm</div>
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <h3 className="font-semibold text-orange-800 mb-2">Wind Conditions</h3>
          <div className="text-sm text-orange-700">
            <div>Average wind: {(daily.reduce((sum, d) => sum + d.wind_speed, 0) / daily.length).toFixed(1)} m/s</div>
            <div>Max wind: {Math.max(...daily.map(d => d.wind_speed)).toFixed(1)} m/s</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyForecastTable;
