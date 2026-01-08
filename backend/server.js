const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const multer = require('multer');
// Load env from backend/.env and root/.env as fallback
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { fetchDailyPrices, fetchLastNDays, fetchDistrictsByState } = require('./services/mandiService');
const { analyzeCropImage } = require('./services/cropImageService');
const { checkMLServiceHealth } = require('./services/mlImageService');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY;

// Middleware
// If a reverse proxy sets X-Forwarded-For, trust only loopback to avoid permissive trust
app.set('trust proxy', 'loopback');
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Simple in-memory demo users store (not persistent, for fake auth only)
const demoUsers = new Map();

// Fake Auth endpoints (accept any phone and password)
app.post('/api/auth/signup', (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const phoneStr = String(phone || '').trim();
    const passStr = String(password || '');
    if (!/^[0-9]{10}$/.test(phoneStr)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (passStr.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Store in memory (overwrites if exists) - demo only
    demoUsers.set(phoneStr, { phone: phoneStr, createdAt: Date.now() });
    const token = Buffer.from(`${phoneStr}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token,
      user: { phone: phoneStr }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to signup' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password, remember } = req.body || {};
    const phoneStr = String(phone || '').trim();
    const passStr = String(password || '');
    if (!/^[0-9]{10}$/.test(phoneStr)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (passStr.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // For demo, auto-create user if not exists
    if (!demoUsers.has(phoneStr)) {
      demoUsers.set(phoneStr, { phone: phoneStr, createdAt: Date.now() });
    }
    const token = Buffer.from(`${phoneStr}:${Date.now()}:${remember ? 'R' : 'S'}`).toString('base64');
    return res.json({
      success: true,
      token,
      user: { phone: phoneStr }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// OpenWeather API configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const getOWKey = () => process.env.OPENWEATHER_API_KEY || OPENWEATHER_API_KEY || '';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Helper function to validate coordinates
const validateCoordinates = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Invalid coordinates format' };
  }
  
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  return { valid: true, lat: latitude, lon: longitude };
};

// Helper function to handle API errors
const handleApiError = (error, res) => {
  console.error('API Error:', error.message);
  
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || 'Weather API error';
    
    switch (status) {
      case 401:
        return res.status(401).json({ error: 'Invalid API key' });
      case 404:
        return res.status(404).json({ error: 'Weather data not found' });
      case 429:
        return res.status(429).json({ error: 'API rate limit exceeded' });
      default:
        return res.status(status).json({ error: message });
    }
  } else if (error.request) {
    return res.status(503).json({ error: 'Weather service unavailable' });
  } else {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes

// Weather health
app.get('/api/weather/health', (req, res) => {
  res.json({
    status: 'OK',
    openWeatherKeyLoaded: !!getOWKey(),
    keyPreview: getOWKey() ? getOWKey().substring(0, 6) + '...' : 'Not loaded'
  });
});

// Mandi health
app.get('/api/mandi/health', (req, res) => {
  res.json({
    status: 'OK',
    dataGovKeyLoaded: !!DATA_GOV_API_KEY,
    keyPreview: DATA_GOV_API_KEY ? DATA_GOV_API_KEY.substring(0, 6) + '...' : 'Not loaded'
  });
});

// Mandi insights (precomputed JSON)
app.get('/api/mandi/insights', (req, res) => {
  try {
    const p = path.resolve(__dirname, 'data', 'mandi_insights.json');
    if (!fs.existsSync(p)) {
      return res.status(404).json({ error: 'Insights not generated yet' });
    }
    const raw = fs.readFileSync(p, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(raw);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read insights' });
  }
});

// Mandi (Agmarknet) routes
app.get('/api/mandi/search', async (req, res) => {
  try {
    const { state, district, commodity, limit } = req.query;
    if (!state && !district && !commodity) {
      return res.status(400).json({ error: 'Provide at least one filter: state, district, or commodity' });
    }
    const lim = limit ? Math.min(parseInt(limit, 10) || 300, 1000) : 300;
    const data = await fetchDailyPrices({ state, district, commodity, limit: lim });
    res.json(data);
  } catch (error) {
    const status = error.status || (error.response?.status) || 500;
    res.status(status).json({ error: error.message || 'Failed to search mandi data' });
  }
});
app.get('/api/mandi/districts/:state', async (req, res) => {
  try {
    const { state } = req.params;
    const list = await fetchDistrictsByState(state);
    res.json(list);
  } catch (error) {
    const status = error.status || (error.response?.status) || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch districts' });
  }
});
app.get('/api/mandi/:state/:commodity', async (req, res) => {
  try {
    const { state, commodity } = req.params;
    if (!state || !commodity) {
      return res.status(400).json({ error: 'state and commodity are required' });
    }
    const data = await fetchDailyPrices({ state, commodity });
    res.json(data);
  } catch (error) {
    const status = error.status || (error.response?.status) || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch mandi data' });
  }
});

app.get('/api/mandi/:state/:district/:commodity', async (req, res) => {
  try {
    const { state, district, commodity } = req.params;
    if (!state || !district || !commodity) {
      return res.status(400).json({ error: 'state, district and commodity are required' });
    }
    const data = await fetchDailyPrices({ state, district, commodity });
    res.json(data);
  } catch (error) {
    const status = error.status || (error.response?.status) || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch mandi data' });
  }
});

app.get('/api/mandi/history/:commodity', async (req, res) => {
  try {
    const { commodity } = req.params;
    const { state, district, days } = req.query;
    if (!commodity) {
      return res.status(400).json({ error: 'commodity is required' });
    }
    const daysNum = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 90) : 30;
    let data = await fetchLastNDays({ commodity, state, district, days: daysNum });
    // Fallback: if district filter returns empty, try state only, then commodity-only
    if (!Array.isArray(data) || data.length === 0) {
      if (district) {
        data = await fetchLastNDays({ commodity, state, days: daysNum });
      }
      if ((!data || data.length === 0) && state) {
        data = await fetchLastNDays({ commodity, days: daysNum });
      }
    }
    res.json(data || []);
  } catch (error) {
    const status = error.status || (error.response?.status) || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch mandi history' });
  }
});

// Current Weather
app.get('/api/weather/current/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const validation = validateCoordinates(lat, lon);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat: validation.lat,
        lon: validation.lon,
        appid: getOWKey(),
        units: 'metric'
      }
    });
    
    const weatherData = {
      location: {
        name: response.data.name,
        country: response.data.sys.country,
        lat: response.data.coord.lat,
        lon: response.data.coord.lon
      },
      current: {
        temperature: Math.round(response.data.main.temp),
        feels_like: Math.round(response.data.main.feels_like),
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        visibility: response.data.visibility / 1000, // Convert to km
        wind_speed: response.data.wind?.speed || 0,
        wind_direction: response.data.wind?.deg || 0,
        rain: response.data.rain?.['1h'] || 0,
        snow: response.data.snow?.['1h'] || 0,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        timestamp: new Date(response.data.dt * 1000).toISOString()
      }
    };
    
    res.json(weatherData);
  } catch (error) {
    handleApiError(error, res);
  }
});

// Hourly Forecast (4 days, 96 timestamps)
app.get('/api/weather/hourly/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const validation = validateCoordinates(lat, lon);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat: validation.lat,
        lon: validation.lon,
        appid: getOWKey(),
        units: 'metric'
      }
    });
    
    const hourlyData = response.data.list.map(item => ({
      timestamp: new Date(item.dt * 1000).toISOString(),
      temperature: Math.round(item.main.temp),
      feels_like: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      wind_speed: item.wind?.speed || 0,
      wind_direction: item.wind?.deg || 0,
      rain: item.rain?.['3h'] || 0,
      snow: item.snow?.['3h'] || 0,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      clouds: item.clouds.all
    }));
    
    res.json({
      location: {
        name: response.data.city.name,
        country: response.data.city.country,
        lat: response.data.city.coord.lat,
        lon: response.data.city.coord.lon
      },
      hourly: hourlyData
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

// Daily Forecast (16 days) - Using 5-day forecast API
app.get('/api/weather/daily/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const validation = validateCoordinates(lat, lon);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat: validation.lat,
        lon: validation.lon,
        appid: getOWKey(),
        units: 'metric'
      }
    });
    
    // Group forecast by day and get daily min/max
    const dailyData = {};
    response.data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date: date,
          temperatures: [],
          humidity: [],
          pressure: [],
          wind_speed: [],
          rain: [],
          snow: [],
          descriptions: [],
          icons: [],
          clouds: [],
          pop: []
        };
      }
      
      dailyData[date].temperatures.push(item.main.temp);
      dailyData[date].humidity.push(item.main.humidity);
      dailyData[date].pressure.push(item.main.pressure);
      dailyData[date].wind_speed.push(item.wind?.speed || 0);
      dailyData[date].rain.push(item.rain?.['3h'] || 0);
      dailyData[date].snow.push(item.snow?.['3h'] || 0);
      dailyData[date].descriptions.push(item.weather[0].description);
      dailyData[date].icons.push(item.weather[0].icon);
      dailyData[date].clouds.push(item.clouds.all);
      dailyData[date].pop.push(item.pop);
    });
    
    const formattedDailyData = Object.values(dailyData).slice(0, 5).map(day => ({
      date: day.date,
      temperature: {
        min: Math.round(Math.min(...day.temperatures)),
        max: Math.round(Math.max(...day.temperatures)),
        day: Math.round(day.temperatures[Math.floor(day.temperatures.length / 2)]),
        night: Math.round(day.temperatures[0]),
        eve: Math.round(day.temperatures[day.temperatures.length - 1]),
        morn: Math.round(day.temperatures[0])
      },
      feels_like: {
        day: Math.round(day.temperatures[Math.floor(day.temperatures.length / 2)]),
        night: Math.round(day.temperatures[0]),
        eve: Math.round(day.temperatures[day.temperatures.length - 1]),
        morn: Math.round(day.temperatures[0])
      },
      humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
      pressure: Math.round(day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length),
      wind_speed: Math.round(day.wind_speed.reduce((a, b) => a + b, 0) / day.wind_speed.length * 10) / 10,
      wind_direction: 0, // Not available in forecast API
      rain: Math.round(day.rain.reduce((a, b) => a + b, 0) * 10) / 10,
      snow: Math.round(day.snow.reduce((a, b) => a + b, 0) * 10) / 10,
      description: day.descriptions[Math.floor(day.descriptions.length / 2)],
      icon: day.icons[Math.floor(day.icons.length / 2)],
      clouds: Math.round(day.clouds.reduce((a, b) => a + b, 0) / day.clouds.length),
      pop: Math.round(day.pop.reduce((a, b) => a + b, 0) / day.pop.length * 100)
    }));
    
    res.json({
      location: {
        name: response.data.city.name,
        country: response.data.city.country,
        lat: response.data.city.coord.lat,
        lon: response.data.city.coord.lon
      },
      daily: formattedDailyData
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

// Weather Alerts - Dynamic alerts based on current weather
app.get('/api/weather/alerts/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const validation = validateCoordinates(lat, lon);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Get current weather to generate dynamic alerts
    const currentWeatherResponse = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat: validation.lat,
        lon: validation.lon,
        appid: getOWKey(),
        units: 'metric'
      }
    });
    
    const currentWeather = currentWeatherResponse.data;
    const alerts = [];
    
    // Generate alerts based on current weather conditions
    const temperature = currentWeather.main.temp;
    const humidity = currentWeather.main.humidity;
    const windSpeed = currentWeather.wind?.speed || 0;
    const rain = currentWeather.rain?.['1h'] || 0;
    const snow = currentWeather.snow?.['1h'] || 0;
    const description = currentWeather.weather[0].description.toLowerCase();
    
    // Heat Wave Alert (lowered threshold for testing)
    if (temperature >= 25) {
      alerts.push({
        id: `heat_alert_${Date.now()}`,
        event: temperature >= 30 ? 'Heat Wave Warning' : 'Heat Advisory',
        description: `Temperature alert: Current temperature is ${Math.round(temperature)}°C. ${temperature >= 30 ? 'Warm conditions! ' : ''}Stay hydrated and monitor crops for heat stress.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tags: ['heat', 'temperature', 'health', 'agriculture']
      });
    }
    
    // Cold Weather Alert
    if (temperature <= 5) {
      alerts.push({
        id: `cold_alert_${Date.now()}`,
        event: temperature <= 0 ? 'Freeze Warning' : 'Cold Weather Advisory',
        description: `Cold weather alert: Current temperature is ${Math.round(temperature)}°C. ${temperature <= 0 ? 'Freezing conditions! ' : ''}Protect crops from frost damage and ensure proper insulation.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tags: ['cold', 'frost', 'agriculture', 'crops']
      });
    }
    
    // Heavy Rain Alert
    if (rain > 5 || description.includes('heavy rain') || description.includes('thunderstorm')) {
      alerts.push({
        id: `rain_alert_${Date.now()}`,
        event: rain > 10 ? 'Heavy Rain Warning' : 'Rain Advisory',
        description: `Rain alert: ${rain > 0 ? `Current rainfall: ${rain}mm/hour. ` : ''}Heavy rainfall expected. Potential for flooding in low-lying areas. Farmers advised to protect crops and ensure proper drainage.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tags: ['rain', 'flooding', 'agriculture', 'drainage']
      });
    }
    
    // High Humidity Alert (lowered threshold for testing)
    if (humidity >= 60) {
      alerts.push({
        id: `humidity_alert_${Date.now()}`,
        event: 'High Humidity Advisory',
        description: `Humidity alert: Current humidity is ${humidity}%. High humidity can promote fungal diseases in crops. Ensure proper ventilation and monitor for plant diseases.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        tags: ['humidity', 'diseases', 'agriculture', 'ventilation']
      });
    }
    
    // Strong Wind Alert
    if (windSpeed >= 10) {
      alerts.push({
        id: `wind_alert_${Date.now()}`,
        event: windSpeed >= 15 ? 'Strong Wind Warning' : 'Wind Advisory',
        description: `Wind alert: Current wind speed is ${windSpeed.toFixed(1)} m/s. ${windSpeed >= 15 ? 'Strong winds! ' : ''}Secure crops and equipment. High winds can damage plants and affect pollination.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        tags: ['wind', 'damage', 'agriculture', 'equipment']
      });
    }
    
    // Snow Alert
    if (snow > 0 || description.includes('snow')) {
      alerts.push({
        id: `snow_alert_${Date.now()}`,
        event: 'Snow Advisory',
        description: `Snow alert: ${snow > 0 ? `Current snowfall: ${snow}mm/hour. ` : ''}Snow conditions detected. Protect sensitive crops and ensure proper drainage to prevent waterlogging.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tags: ['snow', 'agriculture', 'drainage', 'crops']
      });
    }
    
    // Drought Alert (low humidity and no rain)
    if (humidity <= 30 && rain === 0 && !description.includes('rain') && !description.includes('cloud')) {
      alerts.push({
        id: `drought_alert_${Date.now()}`,
        event: 'Drought Advisory',
        description: `Drought conditions: Low humidity (${humidity}%) and no rainfall. Consider irrigation for crops and monitor soil moisture levels.`,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        tags: ['drought', 'irrigation', 'agriculture', 'soil']
      });
    }
    
    res.json({
      location: {
        lat: validation.lat,
        lon: validation.lon
      },
      alerts: alerts
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

// Geocoding API - Search locations by name
app.get('/api/weather/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        q: query,
        appid: getOWKey(),
        units: 'metric'
      }
    });
    
    const locationData = {
      name: response.data.name,
      country: response.data.sys.country,
      lat: response.data.coord.lat,
      lon: response.data.coord.lon,
      state: response.data.sys.state || ''
    };
    
    res.json(locationData);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Location not found' });
    }
    handleApiError(error, res);
  }
});

// Multiple locations search
app.get('/api/weather/search-multiple/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    // Use geocoding API for multiple results
    const response = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: query,
        limit: 10,
        appid: getOWKey()
      }
    });
    
    const locations = response.data.map(item => ({
      name: item.name,
      country: item.country,
      state: item.state || '',
      lat: item.lat,
      lon: item.lon,
      displayName: `${item.name}${item.state ? ', ' + item.state : ''}, ${item.country}`
    }));
    
    res.json(locations);
  } catch (error) {
    handleApiError(error, res);
  }
});

// Crop Image Analysis endpoint
app.post('/api/crop/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const cropType = req.body.cropType || 'Unknown';
    const cropStage = req.body.cropStage || null;
    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;
    
    // Analyze the image (will try ML model first, fall back to rule-based)
    // Location is used ONLY for environmental context, NOT for disease detection
    const analysis = await analyzeCropImage(imagePath, cropType, cropStage, latitude, longitude);
    
    // Clean up uploaded file
    try {
      await fs.promises.unlink(imagePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup uploaded file:', cleanupError);
    }
    
    res.json({
      success: true,
      cropType,
      ...analysis
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file on error:', cleanupError);
      }
    }
    
    console.error('Image analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Weather API Backend'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Weather API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Key loaded: ${OPENWEATHER_API_KEY ? 'Yes' : 'No'}`);
  console.log(`API Key preview: ${OPENWEATHER_API_KEY ? OPENWEATHER_API_KEY.substring(0, 8) + '...' : 'Not loaded'}`);
  console.log(`DATA_GOV_API_KEY loaded: ${process.env.DATA_GOV_API_KEY ? 'Yes' : 'No'}`);
  if (!process.env.DATA_GOV_API_KEY) {
    console.warn('Warning: DATA_GOV_API_KEY is missing. Create backend/.env and restart.');
  }
  console.log(`OpenWeather dynamic key loaded: ${getOWKey() ? 'Yes' : 'No'}`);
});

module.exports = app;
