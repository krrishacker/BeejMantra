import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { weatherService } from '../../services/weatherService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const primaryBtn = 'bg-[#34A853] hover:bg-green-600 text-white';

const crops = [
  'Paddy','Wheat','Maize','Cotton','Sugarcane','Soybean','Chickpea','Mustard','Groundnut','Potato','Onion','Tomato'
];

const soils = ['Loamy','Clayey','Sandy','Alluvial'];

const CropMonitoring: React.FC = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ crop: 'Paddy', cropStage: '', locationQuery: '', lat: null as number | null, lon: null as number | null, area: '', unit: 'acre', soil: 'Loamy' });
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; humidity: number; rain: number } | null>(null);
  const [healthIndex, setHealthIndex] = useState<number | null>(null);
  const [soilCondition, setSoilCondition] = useState<{ ph: number; moisture: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<{
    healthStatus: string;
    confidence: number;
    issues: Array<{ type: string; severity: string; description: string }>;
    recommendations: string[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ displayName: string; lat: number; lon: number }>>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<HTMLDivElement | null>(null);

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setForm((f) => ({ ...f, lat: latitude, lon: longitude }));
    });
  };

  useEffect(() => {
    const q = form.locationQuery.trim();
    if (q.length < 2) { 
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      return; 
    }
    const id = setTimeout(async () => {
      try {
        const results = await weatherService.searchMultipleLocations(q);
        const suggestions = results.map(r => ({ displayName: r.displayName, lat: r.lat, lon: r.lon }));
        setLocationSuggestions(suggestions);
        setShowLocationDropdown(suggestions.length > 0);
      } catch (_) {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [form.locationQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    if (showLocationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLocationDropdown]);

  // Fetch weather when location changes
  useEffect(() => {
    const fetchWeather = async () => {
      if (form.lat != null && form.lon != null) {
        try {
          const cur = await weatherService.getCurrentWeather(form.lat, form.lon);
          setWeather({ temp: Math.round(cur.current.temperature), humidity: cur.current.humidity, rain: cur.current.rain || 0 });
        } catch (error) {
          console.error('Failed to fetch weather:', error);
        }
      } else {
        // Clear weather if location is removed
        setWeather(null);
      }
    };
    fetchWeather();
  }, [form.lat, form.lon]);

  // Deterministic soil condition calculation based on location and soil type
  const calculateSoilCondition = (lat: number | null, lon: number | null, soilType: string) => {
    if (lat === null || lon === null) {
      // Default values if no location
      return { ph: 6.5, moisture: 30 };
    }
    
    // Deterministic calculation based on coordinates and soil type
    // Use coordinates to create a stable hash-like value
    const coordHash = Math.abs((lat * 1000 + lon * 1000) % 100);
    
    // pH varies by soil type deterministically
    const soilPhMap: { [key: string]: number } = {
      'Loamy': 6.5,
      'Clayey': 6.2,
      'Sandy': 6.8,
      'Alluvial': 6.4
    };
    const basePh = soilPhMap[soilType] || 6.5;
    // Add small variation based on location (deterministic)
    const phVariation = (coordHash % 10) * 0.05; // 0-0.45 variation
    const ph = Math.max(6.0, Math.min(7.0, basePh + phVariation));
    
    // Moisture varies deterministically by location
    const moisture = 25 + (coordHash % 20); // 25-44%
    
    return { ph: Number(ph.toFixed(1)), moisture };
  };

  // Deterministic health index calculation
  const calculateHealthIndex = (
    cropStage: string,
    weather: { temp: number; humidity: number; rain: number } | null,
    soilCondition: { ph: number; moisture: number } | null,
    imageAnalysis: { healthStatus: string; confidence: number } | null
  ): number => {
    // Base health score
    let healthScore = 75; // Default moderate health
    
    // Adjust based on image analysis if available
    if (imageAnalysis) {
      if (imageAnalysis.healthStatus === 'healthy') {
        healthScore = Math.max(75, Math.min(95, imageAnalysis.confidence || 85));
      } else if (imageAnalysis.healthStatus === 'moderate') {
        healthScore = Math.max(50, Math.min(75, imageAnalysis.confidence || 65));
      } else if (imageAnalysis.healthStatus === 'critical') {
        healthScore = Math.max(30, Math.min(50, imageAnalysis.confidence || 40));
      }
    }
    
    // Adjust based on crop stage sensitivity
    if (cropStage) {
      const stageLower = cropStage.toLowerCase();
      if (stageLower.includes('seedling')) {
        // Seedling stage is more sensitive, reduce score slightly if conditions are not optimal
        if (weather) {
          if (weather.temp < 15 || weather.temp > 35) healthScore -= 5;
          if (weather.humidity > 80) healthScore -= 3;
        }
      } else if (stageLower.includes('flowering')) {
        // Flowering stage is critical, maintain or slightly boost if conditions are good
        if (weather && weather.temp >= 20 && weather.temp <= 30) healthScore += 2;
      }
    }
    
    // Adjust based on weather stress factors
    if (weather) {
      // Temperature stress
      if (weather.temp < 10 || weather.temp > 40) {
        healthScore -= 8;
      } else if (weather.temp < 15 || weather.temp > 35) {
        healthScore -= 4;
      }
      
      // Humidity stress
      if (weather.humidity > 85) {
        healthScore -= 3; // High humidity increases disease risk
      } else if (weather.humidity < 30 && weather.temp > 30) {
        healthScore -= 4; // Dry and hot conditions
      }
      
      // Rainfall impact
      if (weather.rain > 100) {
        healthScore -= 5; // Excessive rainfall
      } else if (weather.rain === 0 && weather.humidity < 40) {
        healthScore -= 3; // Very dry conditions
      }
    }
    
    // Adjust based on soil condition
    if (soilCondition) {
      // pH deviation from optimal (6.5-7.0)
      const phDeviation = Math.abs(soilCondition.ph - 6.75);
      if (phDeviation > 0.5) {
        healthScore -= Math.round(phDeviation * 2);
      }
      
      // Moisture levels
      if (soilCondition.moisture < 20) {
        healthScore -= 5; // Too dry
      } else if (soilCondition.moisture > 50) {
        healthScore -= 3; // Too wet
      }
    }
    
    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(healthScore)));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch weather if location is available (or use existing weather from useEffect)
      let currentWeather = weather;
      if (form.lat != null && form.lon != null) {
        if (!currentWeather) {
          // Fetch if not already available
          const cur = await weatherService.getCurrentWeather(form.lat, form.lon);
          currentWeather = { temp: Math.round(cur.current.temperature), humidity: cur.current.humidity, rain: cur.current.rain || 0 };
          setWeather(currentWeather);
        }
      } else {
        currentWeather = null;
        setWeather(null);
      }
      
      // Calculate deterministic soil condition
      const soil = calculateSoilCondition(form.lat, form.lon, form.soil);
      setSoilCondition(soil);
      
      // Calculate deterministic health index using current weather and soil
      const healthIdx = calculateHealthIndex(form.cropStage, currentWeather, soil, imageAnalysis);
      setHealthIndex(healthIdx);
      
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = () => {
    const el = document.getElementById('monitor-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const hiColor = useMemo(() => {
    if (healthIndex == null) return 'bg-gray-100 text-gray-700';
    if (healthIndex >= 80) return 'bg-green-50 text-green-700';
    if (healthIndex >= 65) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  }, [healthIndex]);

  const ndviData = useMemo(() => ({
    labels: ['Week 1','Week 2','Week 3','Week 4','Week 5'],
    datasets: [{ label: 'NDVI', data: [0.35,0.42,0.51,0.56,0.6], borderColor: '#34A853', backgroundColor: 'rgba(52,168,83,0.15)' }]
  }), []);

  const corrData = useMemo(() => ({
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      { label: 'Temperature (°C)', data: [28,29,30,31,30,29,28], borderColor: '#34A853', yAxisID: 'y' },
      { label: 'Health Index', data: [78,80,82,84,83,81,82], borderColor: '#2563eb', yAxisID: 'y1' }
    ]
  }), []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(file);
    
    // Analyze image
    setAnalyzing(true);
    setImageAnalysis(null);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('cropType', form.crop);
      if (form.cropStage) {
        formData.append('cropStage', form.cropStage);
      }
      if (form.lat != null && form.lon != null) {
        formData.append('latitude', form.lat.toString());
        formData.append('longitude', form.lon.toString());
      }
      
      const response = await fetch('http://localhost:5000/api/crop/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await response.json();
      const newImageAnalysis = {
        healthStatus: data.healthStatus,
        confidence: data.confidence,
        issues: data.issues || [],
        recommendations: data.recommendations || []
      };
      setImageAnalysis(newImageAnalysis);
      
      // Update health index deterministically using the calculation function
      const updatedHealthIdx = calculateHealthIndex(
        form.cropStage,
        weather,
        soilCondition,
        newImageAnalysis
      );
      setHealthIndex(updatedHealthIdx);
    } catch (error: any) {
      console.error('Image analysis error:', error);
      setImageAnalysis({
        healthStatus: 'error',
        confidence: 0,
        issues: [{ type: 'error', severity: 'none', description: error.message || 'Failed to analyze image. Please try again.' }],
        recommendations: ['Please ensure the image is clear and shows the crop clearly.', 'Try uploading another image.']
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Hero */}
      <section ref={heroRef} className="pt-20 pb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900">{t('monitoring.title')}</h1>
        <p className="mt-3 text-gray-600 text-lg">{t('monitoring.subtitle')}</p>
        <div className="mt-6">
          <button onClick={startMonitoring} className={`px-6 py-3 rounded-lg shadow ${primaryBtn}`}>{t('monitoring.startMonitoring')}</button>
        </div>
      </section>

      {/* Form & Results */}
      <section id="monitor-form" className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow p-6 border">
            <h2 className="text-xl font-semibold mb-4">{t('monitoring.monitoringForm')}</h2>
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('monitoring.cropName')}</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                  {crops.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Stage</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.cropStage} onChange={(e) => setForm({ ...form, cropStage: e.target.value })}>
                  <option value="">Select crop stage</option>
                  <option value="Seedling">Seedling</option>
                  <option value="Vegetative">Vegetative</option>
                  <option value="Flowering">Flowering</option>
                  <option value="Fruiting / Grain Filling">Fruiting / Grain Filling</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Helps provide stage-specific crop health recommendations.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('monitoring.location')}</label>
                <div className="relative" ref={locationInputRef}>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input 
                        className="w-full border rounded-lg px-3 py-2" 
                        placeholder={t('monitoring.placeholderLocation')} 
                        value={form.locationQuery} 
                        onChange={(e) => setForm({ ...form, locationQuery: e.target.value })} 
                        onFocus={() => {
                          if (form.locationQuery.trim().length >= 2 && locationSuggestions.length > 0) {
                            setShowLocationDropdown(true);
                          }
                        }}
                      />
                      {/* Location Suggestions Dropdown */}
                      {showLocationDropdown && locationSuggestions.length > 0 && form.locationQuery.trim().length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {locationSuggestions.slice(0, 10).map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, locationQuery: suggestion.displayName, lat: suggestion.lat, lon: suggestion.lon });
                                setLocationSuggestions([]);
                                setShowLocationDropdown(false);
                              }}
                              className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-800">{suggestion.displayName}</div>
                              <div className="text-xs text-gray-500">{suggestion.lat.toFixed(4)}, {suggestion.lon.toFixed(4)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="px-3 rounded-lg border text-sm" onClick={async () => {
                      if (!form.locationQuery.trim()) return;
                      const r = await weatherService.searchLocation(form.locationQuery.trim());
                      setForm({ ...form, lat: r.lat, lon: r.lon });
                      setLocationSuggestions([]);
                      setShowLocationDropdown(false);
                    }}>{t('monitoring.search')}</button>
                    <button className="px-3 rounded-lg border text-sm" onClick={detectLocation}>{t('yield.useGPS')}</button>
                  </div>
                  {(form.lat != null && form.lon != null) && (
                    <div className="text-xs text-gray-500 mt-1">{t('yield.selected')}: {form.lat.toFixed(4)}, {form.lon.toFixed(4)}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('monitoring.soilType')}</label>
                <select className="w-full border rounded-lg px-3 py-2" value={form.soil} onChange={(e) => setForm({ ...form, soil: e.target.value })}>
                  {soils.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <button className={`w-full mt-2 py-2 rounded-lg font-semibold ${primaryBtn} ${loading ? 'opacity-70' : ''}`} onClick={fetchData} disabled={loading}>
                {loading ? t('monitoring.checking') : t('monitoring.checkHealth')}
              </button>
            </div>
          </div>

          {/* Summary & Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cards */}
            {healthIndex == null ? (
              <div className="bg-white rounded-2xl shadow p-6 border h-[420px] flex items-center justify-center text-gray-500">{t('monitoring.submitForm')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border shadow-sm animate-[fadeIn_0.4s_ease]">
                  <div className="text-sm text-gray-600">🌱 {t('monitoring.cropStage')}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{form.cropStage || 'Not specified'}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border shadow-sm animate-[fadeIn_0.5s_ease]">
                  <div className="text-sm text-gray-600">☀ {t('monitoring.weather')}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{weather ? `${weather.temp}°C` : '--'}</div>
                  <div className="text-xs text-gray-500">{t('yield.humidity')} {weather?.humidity ?? '--'}% · {t('yield.rain')} {weather?.rain ?? 0}mm</div>
                </div>
                <div className="p-4 rounded-xl bg-white border shadow-sm animate-[fadeIn_0.6s_ease]">
                  <div className="text-sm text-gray-600">🧪 {t('monitoring.soilCondition')}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">pH {soilCondition?.ph} </div>
                  <div className="text-xs text-gray-500">{t('yield.humidity')} {soilCondition?.moisture}%</div>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm animate-[fadeIn_0.7s_ease] ${hiColor}`}>
                  <div className="text-sm">📊 {t('monitoring.healthIndex')}</div>
                  <div className="text-2xl font-bold mt-1">{healthIndex}% {healthIndex >= 80 ? `(${t('monitoring.good')})` : healthIndex >= 65 ? `(${t('monitoring.moderate')})` : `(${t('monitoring.critical')})`}</div>
                </div>
              </div>
            )}

            {/* AI Insights */}
            {healthIndex != null && (() => {
              // Rule-based insight generator
              const generateInsights = () => {
                const insights: Array<{ icon: string; bg: string; border: string; title: string; message: string }> = [];
                const hasLocation = weather && form.lat != null && form.lon != null;
                const temp = weather?.temp ?? null;
                const humidity = weather?.humidity ?? null;
                const rain = weather?.rain ?? null;
                
                // RULE 1: Always show stage-based insight (with location context if available)
                if (form.cropStage) {
                  const stageLower = form.cropStage.toLowerCase();
                  
                  if (stageLower.includes('seedling')) {
                    let message = 'At the seedling stage, crops are highly sensitive to stress. Monitor closely for early disease signs.';
                    if (hasLocation && temp !== null) {
                      if (temp < 20) {
                        message += ` In your region, cooler temperatures (${temp}°C) may slow early growth. Consider using protective covers or adjusting planting timing.`;
                      } else if (temp > 30) {
                        message += ` In your region, warmer conditions (${temp}°C) require careful moisture management to prevent seedling stress.`;
                      }
                    }
                    if (hasLocation && humidity !== null && humidity > 75) {
                      message += ` High humidity (${humidity}%) in your area increases fungal disease risk at this sensitive stage.`;
                    }
                    insights.push({
                      icon: '🌱',
                      bg: 'bg-blue-50',
                      border: 'border-blue-200',
                      title: 'Seedling Stage Sensitivity',
                      message: message
                    });
                  } else if (stageLower.includes('vegetative')) {
                    let message = 'During vegetative growth, focus on nutrient balance and healthy leaf development.';
                    if (hasLocation && temp !== null) {
                      if (temp < 18) {
                        message += ` In your region, cooler temperatures (${temp}°C) may slow vegetative growth. Consider applying growth-promoting nutrients.`;
                      } else if (temp > 32) {
                        message += ` In your region, high temperatures (${temp}°C) increase water needs during active growth.`;
                      }
                    }
                    if (hasLocation && humidity !== null && humidity < 50) {
                      message += ` Lower humidity (${humidity}%) in your area may increase irrigation needs during this growth phase.`;
                    }
                    insights.push({
                      icon: '🌿',
                      bg: 'bg-green-50',
                      border: 'border-green-200',
                      title: 'Vegetative Growth Management',
                      message: message
                    });
                  } else if (stageLower.includes('flowering')) {
                    let message = 'Flowering stage is critical for pollination and yield formation.';
                    if (hasLocation && temp !== null) {
                      if (temp > 35) {
                        message += ` In your region, extreme heat (${temp}°C) during flowering can reduce pollination success. Consider shade or misting if feasible.`;
                      } else if (temp < 22) {
                        message += ` In your region, cooler temperatures (${temp}°C) may extend the flowering period. Monitor pollination activity closely.`;
                      }
                    }
                    if (hasLocation && rain !== null && rain > 30) {
                      message += ` Recent rainfall (${rain}mm) in your area may affect pollination. Ensure good drainage to prevent waterlogging.`;
                    }
                    insights.push({
                      icon: '🌸',
                      bg: 'bg-pink-50',
                      border: 'border-pink-200',
                      title: 'Flowering Stage Priority',
                      message: message
                    });
                  } else if (stageLower.includes('fruiting') || stageLower.includes('grain')) {
                    let message = 'During grain filling, protect developing grains from pests and diseases.';
                    if (hasLocation && temp !== null) {
                      if (temp > 33) {
                        message += ` In your region, high temperatures (${temp}°C) during grain filling can reduce grain quality. Ensure adequate irrigation.`;
                      }
                    }
                    if (hasLocation && humidity !== null && humidity > 70) {
                      message += ` High humidity (${humidity}%) in your area increases risk of grain mold. Ensure proper ventilation and timely harvest.`;
                    }
                    insights.push({
                      icon: '🌾',
                      bg: 'bg-yellow-50',
                      border: 'border-yellow-200',
                      title: 'Grain Filling Protection',
                      message: message
                    });
                  }
                } else {
                  insights.push({
                    icon: 'ℹ️',
                    bg: 'bg-gray-50',
                    border: 'border-gray-200',
                    title: 'Crop Stage Not Specified',
                    message: 'Specify the crop stage for more targeted recommendations and stage-specific health guidance.'
                  });
                }
                
                // RULE 2: Environmental insights (conditional, varied based on conditions)
                if (hasLocation) {
                  const envInsights: Array<{ icon: string; bg: string; border: string; title: string; message: string }> = [];
                  
                  // Temperature-based insights
                  if (temp !== null) {
                    if (temp < 15) {
                      envInsights.push({
                        icon: '❄️',
                        bg: 'bg-indigo-50',
                        border: 'border-indigo-200',
                        title: 'Cold Temperature Alert',
                        message: `In your region, low temperatures (${temp}°C) may slow crop development and increase cold stress risk. Consider protective measures if frost is expected.`
                      });
                    } else if (temp > 38) {
                      envInsights.push({
                        icon: '🔥',
                        bg: 'bg-red-50',
                        border: 'border-red-200',
                        title: 'Heat Stress Warning',
                        message: `In your region, very high temperatures (${temp}°C) increase heat stress risk. Increase irrigation frequency and consider shade if possible.`
                      });
                    }
                  }
                  
                  // Humidity-based insights
                  if (humidity !== null) {
                    if (humidity > 80) {
                      envInsights.push({
                        icon: '💧',
                        bg: 'bg-cyan-50',
                        border: 'border-cyan-200',
                        title: 'High Humidity Risk',
                        message: `In your region, high humidity (${humidity}%) significantly increases fungal disease risk. Improve air circulation, avoid overhead watering, and monitor for early disease signs.`
                      });
                    } else if (humidity < 40 && temp !== null && temp > 25) {
                      envInsights.push({
                        icon: '🌵',
                        bg: 'bg-orange-50',
                        border: 'border-orange-200',
                        title: 'Dry Conditions Alert',
                        message: `In your region, low humidity (${humidity}%) combined with warm temperatures increases irrigation needs. Monitor soil moisture closely to prevent water stress.`
                      });
                    }
                  }
                  
                  // Rainfall-based insights
                  if (rain !== null) {
                    if (rain > 60) {
                      envInsights.push({
                        icon: '🌧️',
                        bg: 'bg-blue-50',
                        border: 'border-blue-200',
                        title: 'Heavy Rainfall Advisory',
                        message: `In your region, significant rainfall (${rain}mm) requires attention to drainage. Postpone irrigation and monitor for waterlogging, which can damage roots.`
                      });
                    } else if (rain === 0 && humidity !== null && humidity < 45) {
                      envInsights.push({
                        icon: '☀️',
                        bg: 'bg-yellow-50',
                        border: 'border-yellow-200',
                        title: 'Dry Weather Pattern',
                        message: `In your region, dry conditions with no recent rainfall increase irrigation requirements. Schedule regular watering to maintain optimal soil moisture.`
                      });
                    }
                  }
                  
                  // Add 1-2 environmental insights (prioritize most critical)
                  if (envInsights.length > 0) {
                    // Prioritize: humidity > temperature > rainfall
                    const priorityOrder = envInsights.sort((a, b) => {
                      const aPriority = a.title.includes('Humidity') ? 3 : a.title.includes('Temperature') ? 2 : 1;
                      const bPriority = b.title.includes('Humidity') ? 3 : b.title.includes('Temperature') ? 2 : 1;
                      return bPriority - aPriority;
                    });
                    insights.push(...priorityOrder.slice(0, 2));
                  }
                }
                
                // RULE 3: Health index insights (conditional, tone varies by severity)
                if (healthIndex !== null) {
                  if (healthIndex >= 80) {
                    let message = 'Crop health is in excellent condition.';
                    if (hasLocation) {
                      message += ' Continue monitoring and maintain current management practices.';
                    } else {
                      message += ' Continue current management practices and maintain regular monitoring.';
                    }
                    insights.push({
                      icon: '✅',
                      bg: 'bg-green-50',
                      border: 'border-green-200',
                      title: 'Optimal Health Status',
                      message: message
                    });
                  } else if (healthIndex >= 65 && healthIndex < 80) {
                    let message = 'Crop health is moderate.';
                    if (hasLocation && humidity !== null && humidity > 70) {
                      message += ` Given your regional humidity conditions, focus on disease prevention and proper ventilation.`;
                    } else {
                      message += ' Monitor closely and address any emerging issues promptly.';
                    }
                    insights.push({
                      icon: '⚠️',
                      bg: 'bg-yellow-50',
                      border: 'border-yellow-200',
                      title: 'Moderate Health Alert',
                      message: message
                    });
                  } else if (healthIndex < 65) {
                    let urgency = healthIndex < 50 ? 'Immediate' : 'Prompt';
                    let message = `Crop health index (${healthIndex}%) requires ${urgency.toLowerCase()} attention.`;
                    if (hasLocation) {
                      message += ' Identify and address underlying issues to prevent further decline.';
                    } else {
                      message += ' Immediate corrective actions recommended to prevent further decline.';
                    }
                    insights.push({
                      icon: '🚨',
                      bg: 'bg-red-50',
                      border: 'border-red-200',
                      title: `${urgency} Health Intervention Needed`,
                      message: message
                    });
                  }
                }
                
                // Limit to maximum 4 insights
                return insights.slice(0, 4);
              };
              
              const insights = generateInsights();
              
              return (
                <div className="bg-white rounded-2xl shadow p-6 border">
                  <h3 className="text-lg font-semibold mb-3">{t('monitoring.aiInsights')}</h3>
                  <div className="space-y-2">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${insight.bg} border ${insight.border}`}>
                        <div className="text-xl">{insight.icon}</div>
                        <div>
                          <div className="font-medium">{insight.title}</div>
                          <div className="text-sm text-gray-600">{insight.message}</div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-600">No specific insights available. Please provide crop stage and location for targeted recommendations.</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-3">{t('monitoring.lastUpdated')}: {lastUpdated}</div>
                </div>
              );
            })()}

            {/* Charts */}
            {healthIndex != null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-xl bg-white shadow-sm">
                  <div className="text-sm font-semibold mb-2">{t('monitoring.ndviGrowthTrend')}</div>
                  <Line data={ndviData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 1 } } }} />
                </div>
                <div className="p-4 border rounded-xl bg-white shadow-sm">
                  <div className="text-sm font-semibold mb-2">{t('monitoring.weatherVsHealth')}</div>
                  <Line data={corrData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { type: 'linear', position: 'left' }, y1: { type: 'linear', position: 'right' } } }} />
                </div>
              </div>
            )}

            {/* Recommendations & Actions */}
            <div className="bg-white rounded-2xl shadow p-6 border">
              <h3 className="text-lg font-semibold mb-3">{t('monitoring.recommendations')}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(() => {
                  const recommendations: Array<{ icon: string; text: string }> = [];
                  
                  // Stage-specific recommendations
                  if (form.cropStage) {
                    const stageLower = form.cropStage.toLowerCase();
                    if (stageLower.includes('seedling')) {
                      recommendations.push(
                        { icon: '🌱', text: 'Gentle watering: Keep soil moist but not waterlogged' },
                        { icon: '🛡️', text: 'Protect from pests: Use organic pest control methods' },
                        { icon: '🌡️', text: 'Monitor temperature: Seedlings are sensitive to extreme temperatures' }
                      );
                    } else if (stageLower.includes('vegetative')) {
                      recommendations.push(
                        { icon: '💧', text: 'Balanced nutrition: Apply nitrogen-rich fertilizer for growth' },
                        { icon: '☘️', text: 'Pest management: Use neem oil for preventive pest control' },
                        { icon: '🪴', text: 'Maintain soil moisture: Ensure consistent watering schedule' }
                      );
                    } else if (stageLower.includes('flowering')) {
                      recommendations.push(
                        { icon: '🌸', text: 'Avoid stress: Maintain stable irrigation during flowering' },
                        { icon: '🌡️', text: 'Temperature control: Protect from heat stress during pollination' },
                        { icon: '💧', text: 'Moderate watering: Avoid waterlogging that can affect pollination' }
                      );
                    } else if (stageLower.includes('fruiting') || stageLower.includes('grain')) {
                      recommendations.push(
                        { icon: '🌾', text: 'Protect grains: Monitor for pest attacks on developing grains' },
                        { icon: '⚠️', text: 'Avoid excess nitrogen: Can delay maturity and reduce quality' },
                        { icon: '💧', text: 'Optimize irrigation: Ensure adequate moisture for grain filling' }
                      );
                    }
                  }
                  
                  // Location-based environmental recommendations
                  if (weather && form.lat != null && form.lon != null) {
                    if (weather.humidity > 70) {
                      recommendations.push({ icon: '💨', text: 'Improve air circulation: High humidity increases disease risk' });
                    }
                    if (weather.rain > 50) {
                      recommendations.push({ icon: '🌧️', text: 'Monitor drainage: Prevent waterlogging during heavy rains' });
                    }
                    if (weather.temp > 35) {
                      recommendations.push({ icon: '🌡️', text: 'Increase irrigation frequency: High temperatures increase water needs' });
                    }
                  }
                  
                  // Default recommendations if no stage-specific ones
                  if (recommendations.length === 0) {
                    recommendations.push(
                      { icon: '💧', text: t('monitoring.applyUrea') || 'Apply balanced fertilizer' },
                      { icon: '☘️', text: t('monitoring.neemOil') || 'Use neem oil for pest control' },
                      { icon: '🪴', text: t('monitoring.maintainMoisture') || 'Maintain optimal soil moisture' },
                      { icon: '🌡️', text: t('monitoring.scheduleIrrigation') || 'Schedule regular irrigation' }
                    );
                  }
                  
                  return recommendations.map((rec, idx) => (
                    <li key={idx} className="p-3 rounded-lg bg-gray-50 border">{rec.icon} {rec.text}</li>
                  ));
                })()}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className={`px-4 py-2 rounded-lg ${primaryBtn}`} onClick={() => window.print()}>{t('monitoring.downloadReport')}</button>
                <a className="px-4 py-2 rounded-lg border hover:bg-gray-50" href={`https://wa.me/?text=${encodeURIComponent('Crop Health summary - Health Index: ' + (healthIndex ?? '--'))}`} target="_blank" rel="noreferrer">{t('monitoring.shareAgronomist')}</a>
                <button className="px-4 py-2 rounded-lg border" onClick={fetchData}>{t('monitoring.recheckHealth')}</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CropMonitoring;


