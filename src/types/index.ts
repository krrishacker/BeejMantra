export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  icon: string;
}

export interface AdvisoryAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: string;
}

// Weather API Types
export interface WeatherLocation {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  wind_speed: number;
  wind_direction: number;
  rain: number;
  snow: number;
  description: string;
  icon: string;
  timestamp: string;
}

export interface CurrentWeatherResponse {
  location: WeatherLocation;
  current: CurrentWeather;
}

export interface HourlyWeather {
  timestamp: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rain: number;
  snow: number;
  description: string;
  icon: string;
  clouds: number;
}

export interface HourlyWeatherResponse {
  location: WeatherLocation;
  hourly: HourlyWeather[];
}

export interface DailyWeather {
  date: string;
  temperature: {
    min: number;
    max: number;
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rain: number;
  snow: number;
  description: string;
  icon: string;
  clouds: number;
  pop: number; // Probability of precipitation
}

export interface DailyWeatherResponse {
  location: WeatherLocation;
  daily: DailyWeather[];
}

export interface WeatherAlert {
  id: string;
  event: string;
  description: string;
  start: string;
  end: string;
  tags: string[];
}

export interface WeatherAlertsResponse {
  location: {
    lat: number;
    lon: number;
  };
  alerts: WeatherAlert[];
}

export interface WeatherError {
  error: string;
}