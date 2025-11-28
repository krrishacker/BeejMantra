import React, { useState } from 'react';

// TODO: Replace with actual API data fetching
// import { fetchWeather } from '../services/weatherService';
// import { fetchCrops } from '../services/cropService';
// import { fetchAlerts } from '../services/alertService';

// Dummy data - replace with API calls
const dummyData = {
  farmerName: 'Ramesh',
  lastUpdated: new Date().toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }),
  weather: {
    temperature: 28,
    humidity: 65,
    rainForecast: 'Light rain expected',
    forecast: [
      { day: 'Mon', temp: 26, rain: 20 },
      { day: 'Tue', temp: 27, rain: 40 },
      { day: 'Wed', temp: 28, rain: 15 },
      { day: 'Thu', temp: 29, rain: 5 },
      { day: 'Fri', temp: 30, rain: 0 }
    ]
  },
  crops: [
    {
      id: 1,
      name: 'Wheat',
      stage: 'Vegetative',
      healthScore: 85,
      soilMoisture: 72,
      area: '2.5 acres'
    },
    {
      id: 2,
      name: 'Rice',
      stage: 'Flowering',
      healthScore: 92,
      soilMoisture: 68,
      area: '1.8 acres'
    },
    {
      id: 3,
      name: 'Cotton',
      stage: 'Boll Development',
      healthScore: 78,
      soilMoisture: 65,
      area: '3.2 acres'
    }
  ],
  alerts: [
    { id: 1, type: 'warning', message: 'Irrigation needed for Wheat field in 2 days' },
    { id: 2, type: 'info', message: 'Weather forecast: Light rain expected tomorrow' }
  ],
  yieldSummary: {
    predictedYield: '8.5',
    expectedProfit: '₹2,45,000',
    confidence: 87
  },
  // TODO: Replace with Agmarknet API data from /api/mandi or direct API integration
  marketPrices: {
    lastUpdated: new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }),
    rows: [
      { id: 1, commodity: 'Wheat', market: 'New Delhi', min: 2100, max: 2350, trend: 'up' },
      { id: 2, commodity: 'Rice', market: 'Lucknow', min: 2800, max: 3100, trend: 'down' },
      { id: 3, commodity: 'Cotton', market: 'Nagpur', min: 5500, max: 6000, trend: 'up' },
      { id: 4, commodity: 'Maize', market: 'Indore', min: 1700, max: 1900, trend: 'down' }
    ]
  }
  ,
  // TODO: Replace with Soil Health Card API or local sensor data
  soilInsights: {
    lastUpdated: new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }),
    type: 'Loamy',
    ph: 6.8,
    moisture: 62,
    npk: { n: 35, p: 22, k: 28 },
    irrigationAdvice: 'Maintain irrigation every 3–4 days, 25–35 mm per session. Prefer early morning.',
    fertilizerAdvice: 'Apply 30 kg/acre Urea and 20 kg/acre DAP this week based on current crop stage.'
  }
};

// Header Component
const Header: React.FC<{ farmerName: string; lastUpdated: string }> = ({ farmerName, lastUpdated }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {farmerName}! 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">{farmerName}</p>
            <p className="text-xs text-gray-500">Farmer ID: FM-001</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
};

// Weather Card Component
const WeatherCard: React.FC<{ weather: typeof dummyData.weather; onRefresh: () => void }> = ({ weather, onRefresh }) => {
  const maxTemp = Math.max(...weather.forecast.map(f => f.temp));
  const minTemp = Math.min(...weather.forecast.map(f => f.temp));
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
          Weather Snapshot
        </h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          Refresh Weather
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{weather.temperature}°C</div>
          <div className="text-xs text-gray-500 mt-1">Temperature</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{weather.humidity}%</div>
          <div className="text-xs text-gray-500 mt-1">Humidity</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{weather.rainForecast}</div>
          <div className="text-xs text-gray-500 mt-1">Rain Forecast</div>
        </div>
      </div>

      {/* 5-Day Mini Line Chart */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">5-Day Forecast</div>
        <div className="flex items-end justify-between h-20 gap-1">
          {weather.forecast.map((day, idx) => {
            const height = ((day.temp - minTemp) / tempRange) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                    style={{ height: `${Math.max(height, 20)}%` }}
                  />
                  <div className="text-xs font-medium text-gray-700 mt-1">{day.temp}°</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{day.day}</div>
                {day.rain > 0 && (
                  <div className="text-xs text-blue-500">💧{day.rain}%</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Crop Card Component
const CropCard: React.FC<{
  crop: typeof dummyData.crops[0];
  onView: (id: number) => void;
  onQuickTip: (id: number) => void;
}> = ({ crop, onView, onQuickTip }) => {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (crop.healthScore / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{crop.area}</p>
        </div>
        <div className="relative w-12 h-12">
          <svg className="transform -rotate-90 w-12 h-12">
            <circle
              cx="24"
              cy="24"
              r="18"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="24"
              cy="24"
              r="18"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={getHealthColor(crop.healthScore)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-bold ${getHealthColor(crop.healthScore)}`}>
              {crop.healthScore}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Stage:</span>
          <span className="text-sm font-medium text-gray-900">{crop.stage}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Soil Moisture:</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${crop.soilMoisture}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">{crop.soilMoisture}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Health:</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getHealthBg(crop.healthScore)} ${getHealthColor(crop.healthScore)}`}>
            {crop.healthScore >= 80 ? 'Excellent' : crop.healthScore >= 60 ? 'Good' : 'Needs Attention'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onView(crop.id)}
          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          View
        </button>
        <button
          onClick={() => onQuickTip(crop.id)}
          className="flex-1 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors"
        >
          Quick Tip
        </button>
      </div>
    </div>
  );
};

// Yield Summary Card Component
const YieldCard: React.FC<{ summary: typeof dummyData.yieldSummary }> = ({ summary }) => {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (summary.confidence / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Yield Summary</h2>
      
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">Predicted Yield</div>
          <div className="text-2xl font-bold text-gray-900">{summary.predictedYield} tonnes</div>
        </div>

        <div>
          <div className="text-sm text-gray-600 mb-1">Expected Profit</div>
          <div className="text-2xl font-bold text-green-600">{summary.expectedProfit}</div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Confidence</span>
            <span className="text-sm font-semibold text-gray-900">{summary.confidence}%</span>
          </div>
          <div className="relative w-16 h-16 mx-auto">
            <svg className="transform -rotate-90 w-16 h-16">
              <circle
                cx="32"
                cy="32"
                r="20"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="32"
                cy="32"
                r="20"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-green-600"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-green-600">{summary.confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Market Prices Card Component
const MarketPriceCard: React.FC<{ data: typeof dummyData.marketPrices; onRefresh: () => void }> = ({ data, onRefresh }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 lg:mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Market Prices (Nearest Mandis)</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-green-600 hover:text-green-700 inline-flex items-center gap-1"
        >
          <span role="img" aria-label="refresh">🔄</span> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-5 bg-gray-50 text-xs font-semibold text-gray-700">
          <div className="px-3 py-2">Commodity</div>
          <div className="px-3 py-2">Market</div>
          <div className="px-3 py-2">Min Price ₹</div>
          <div className="px-3 py-2">Max Price ₹</div>
          <div className="px-3 py-2">Trend</div>
        </div>
        <div>
          {data.rows.map((row) => (
            <div key={row.id} className="grid grid-cols-5 text-sm odd:bg-green-50 even:bg-white">
              <div className="px-3 py-2 text-gray-900">{row.commodity}</div>
              <div className="px-3 py-2 text-gray-700">{row.market}</div>
              <div className="px-3 py-2 text-gray-900">{row.min.toLocaleString('en-IN')}</div>
              <div className="px-3 py-2 text-gray-900">{row.max.toLocaleString('en-IN')}</div>
              <div className={`px-3 py-2 font-semibold ${row.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {row.trend === 'up' ? '📈 Up' : '📉 Down'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-3">Last Updated: {data.lastUpdated}</div>
    </div>
  );
};

// Soil & Irrigation Insights Card Component
const SoilInsightsCard: React.FC<{ data: typeof dummyData.soilInsights }> = ({ data }) => {
  const moistureColor = data.moisture < 30 ? 'text-orange-600' : data.moisture <= 70 ? 'text-green-600' : 'text-blue-600';
  const moistureBadge = data.moisture < 30 ? 'Needs Irrigation' : data.moisture <= 70 ? 'Good' : 'High Moisture';

  const handleViewSoilReport = () => {
    console.log('Opening soil report...');
  };
  const getAISuggestion = () => {
    console.log('Fetching AI soil tip...');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 lg:mt-4 relative">
      {/* green border-left accent */}
      <div className="absolute left-0 top-0 h-full w-1 bg-green-500 rounded-l-2xl" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          Soil & Irrigation Insights
          <span title="Based on latest soil readings" className="text-gray-400">ℹ</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: key parameters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Soil Type</span>
            <span className="text-sm font-medium text-gray-900">{data.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">pH</span>
            <span className="text-sm font-medium text-gray-900">{data.ph}</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Moisture</span>
              <span className={`text-sm font-semibold ${moistureColor}`}>{data.moisture}%</span>
            </div>
            <div className="mt-2 w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${data.moisture < 30 ? 'from-yellow-400 to-orange-500' : data.moisture <= 70 ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'}`}
                style={{ width: `${Math.min(Math.max(data.moisture, 0), 100)}%` }}
              />
            </div>
            <div className={`mt-1 text-xs inline-block px-2 py-0.5 rounded-full ${data.moisture < 30 ? 'bg-orange-100 text-orange-700' : data.moisture <= 70 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {moistureBadge}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">N</div>
              <div className="text-sm font-semibold text-gray-900">{data.npk.n}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">P</div>
              <div className="text-sm font-semibold text-gray-900">{data.npk.p}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">K</div>
              <div className="text-sm font-semibold text-gray-900">{data.npk.k}</div>
            </div>
          </div>
        </div>

        {/* Right: Action advice */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Irrigation Advice</div>
            <p className="text-sm text-gray-700 leading-relaxed">{data.irrigationAdvice}</p>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Fertilizer Advice</div>
            <p className="text-sm text-gray-700 leading-relaxed">{data.fertilizerAdvice}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleViewSoilReport}
              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              View Detailed Soil Report
            </button>
            <button
              onClick={getAISuggestion}
              className="flex-1 px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors"
            >
              Get AI Suggestion
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">Last Updated: {data.lastUpdated}</div>
    </div>
  );
};

// Chat Panel Component
const ChatPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    // TODO: Replace with actual chat API call
    console.log('Sending message:', message);
    setMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-end sm:p-4">
      <div className="bg-white w-full sm:w-96 h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chat Advisor</h3>
              <p className="text-xs text-gray-500">AI Farming Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700">
              Hello! 👋 I'm your AI farming assistant. Ask me anything about:
            </p>
            <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Weather forecasts</li>
              <li>Crop management tips</li>
              <li>Disease identification</li>
              <li>Market prices</li>
              <li>Irrigation advice</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const [data, setData] = useState(dummyData);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // TODO: Replace with actual API call
  const fetchWeather = () => {
    console.log('Fetching weather data...');
    // Simulate API call
    setTimeout(() => {
      console.log('Weather data fetched');
      // Update weather data here
    }, 1000);
  };

  // TODO: Replace with real Agmarknet fetch
  const fetchMarketPrices = () => {
    console.log('Fetching market data...');
  };

  // TODO: Replace with actual navigation handler
  const handleViewCrop = (id: number) => {
    console.log('Viewing crop:', id);
    // Navigate to crop detail page
  };

  // TODO: Replace with actual quick tip handler
  const handleQuickTip = (id: number) => {
    console.log('Getting quick tip for crop:', id);
    // Show quick tip modal or navigate to tips page
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header farmerName={data.farmerName} lastUpdated={data.lastUpdated} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Alerts Strip */}
        {data.alerts.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            {data.alerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className={`px-4 py-2 rounded-lg border ${getAlertColor(alert.type)} text-sm font-medium`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Weather and Crops */}
          <div className="lg:col-span-2 space-y-6">
            {/* Weather Card */}
            <WeatherCard weather={data.weather} onRefresh={fetchWeather} />

            {/* My Crops Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Crops</h2>
                <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.crops.map((crop) => (
                  <CropCard
                    key={crop.id}
                    crop={crop}
                    onView={handleViewCrop}
                    onQuickTip={handleQuickTip}
                  />
                ))}
              </div>
              {/* Soil insights placed directly beneath My Crops for better context */}
              <div className="mt-6">
                <SoilInsightsCard data={data.soilInsights} />
              </div>
            </div>
          </div>

          {/* Right Column - Yield Summary */}
          <div className="lg:col-span-1">
            <YieldCard summary={data.yieldSummary} />
            <MarketPriceCard data={data.marketPrices} onRefresh={fetchMarketPrices} />
          </div>
        </div>
      </main>

      {/* Floating Chatbot CTA */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-110 flex flex-col items-center justify-center gap-1 z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs font-medium">Chat</span>
      </button>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Dashboard;

