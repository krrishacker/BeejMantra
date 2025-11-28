# Weather API Backend Setup Instructions

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a .env file in the backend directory with the following content:
   ```
   OPENWEATHER_API_KEY=5c5fe055c5e11b4c18ab36aee0ad51b1
   PORT=5000
   NODE_ENV=development
   ```

3. Start the backend server:
   ```bash
   npm run dev
   ```

## Frontend Setup

1. In the root directory, start the React development server:
   ```bash
   npm start
   ```

## Testing

The application includes sample coordinates for testing:
- Delhi: lat=28.7041, lon=77.1025
- Kerala: lat=10.8505, lon=76.2711

## Features Implemented

✅ Backend API routes for weather data
✅ Current weather display
✅ Hourly forecast charts (24 hours)
✅ Daily forecast table (16 days)
✅ Weather alerts with push notifications
✅ Error handling and validation
✅ Responsive design
✅ Location selector

## API Endpoints

- GET /api/weather/current/:lat/:lon - Current weather
- GET /api/weather/hourly/:lat/:lon - Hourly forecast
- GET /api/weather/daily/:lat/:lon - Daily forecast
- GET /api/weather/alerts/:lat/:lon - Weather alerts
- GET /api/health - Health check

## Navigation

Use the navigation bar to switch between:
- Home: Original landing page
- Weather Dashboard: New weather features
