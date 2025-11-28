import { WeatherData, AdvisoryAlert } from '../types';

export const demoWeatherData: WeatherData[] = [
  { date: 'Today', temperature: 28, condition: 'Sunny', icon: '☀️' },
  { date: 'Mon', temperature: 26, condition: 'Partly Cloudy', icon: '⛅' },
  { date: 'Tue', temperature: 24, condition: 'Cloudy', icon: '☁️' },
  { date: 'Wed', temperature: 22, condition: 'Light Rain', icon: '🌦️' },
  { date: 'Thu', temperature: 25, condition: 'Partly Cloudy', icon: '⛅' },
  { date: 'Fri', temperature: 27, condition: 'Sunny', icon: '☀️' },
  { date: 'Sat', temperature: 29, condition: 'Sunny', icon: '☀️' }
];

export const demoAdvisoryAlerts: AdvisoryAlert[] = [
  {
    id: '1',
    type: 'warning',
    message: 'High humidity expected tomorrow - monitor for fungal diseases',
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    type: 'info',
    message: 'Optimal time to apply fertilizer - soil moisture is perfect',
    timestamp: '4 hours ago'
  }
];

export const demoYieldData = [
  { month: 'Jan', yield: 85 },
  { month: 'Feb', yield: 78 },
  { month: 'Mar', yield: 92 },
  { month: 'Apr', yield: 88 },
  { month: 'May', yield: 95 },
  { month: 'Jun', yield: 87 }
];
