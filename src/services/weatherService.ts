import axios from 'axios';
import {
  CurrentWeatherResponse,
  HourlyWeatherResponse,
  DailyWeatherResponse,
  WeatherAlertsResponse,
  WeatherError
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api/weather';

class WeatherService {
  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await axios.get<T>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(error.response.data?.error || 'Weather API error');
        } else if (error.request) {
          throw new Error('Weather service unavailable');
        }
      }
      throw new Error('Failed to fetch weather data');
    }
  }

  async getCurrentWeather(lat: number, lon: number): Promise<CurrentWeatherResponse> {
    return this.makeRequest<CurrentWeatherResponse>(`${API_BASE_URL}/current/${lat}/${lon}`);
  }

  async getHourlyForecast(lat: number, lon: number): Promise<HourlyWeatherResponse> {
    return this.makeRequest<HourlyWeatherResponse>(`${API_BASE_URL}/hourly/${lat}/${lon}`);
  }

  async getDailyForecast(lat: number, lon: number): Promise<DailyWeatherResponse> {
    return this.makeRequest<DailyWeatherResponse>(`${API_BASE_URL}/daily/${lat}/${lon}`);
  }

  async getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlertsResponse> {
    return this.makeRequest<WeatherAlertsResponse>(`${API_BASE_URL}/alerts/${lat}/${lon}`);
  }

  async searchLocation(query: string): Promise<{ name: string; country: string; lat: number; lon: number; state: string }> {
    return this.makeRequest(`${API_BASE_URL}/search/${encodeURIComponent(query)}`);
  }

  async searchMultipleLocations(query: string): Promise<Array<{ name: string; country: string; state: string; lat: number; lon: number; displayName: string }>> {
    return this.makeRequest(`${API_BASE_URL}/search-multiple/${encodeURIComponent(query)}`);
  }
}

export const weatherService = new WeatherService();

// Sample coordinates for testing
export const SAMPLE_COORDINATES = {
  delhi: { lat: 28.7041, lon: 77.1025, name: 'Delhi' },
  punjab: { lat: 31.1471, lon: 75.3412, name: 'Punjab' }
};
