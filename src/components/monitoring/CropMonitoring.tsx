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
  const [form, setForm] = useState({ crop: 'Paddy', locationQuery: '', lat: null as number | null, lon: null as number | null, area: '', unit: 'acre', soil: 'Loamy' });
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; humidity: number; rain: number } | null>(null);
  const [healthIndex, setHealthIndex] = useState<number | null>(null);
  const [cropStage, setCropStage] = useState<string | null>(null);
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
  const heroRef = useRef<HTMLDivElement | null>(null);

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setForm((f) => ({ ...f, lat: latitude, lon: longitude }));
    });
  };

  useEffect(() => {
    const q = form.locationQuery.trim();
    if (q.length < 3) { setLocationSuggestions([]); return; }
    const id = setTimeout(async () => {
      try {
        const results = await weatherService.searchMultipleLocations(q);
        setLocationSuggestions(results.map(r => ({ displayName: r.displayName, lat: r.lat, lon: r.lon })));
      } catch (_) {}
    }, 400);
    return () => clearTimeout(id);
  }, [form.locationQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Weather
      if (form.lat != null && form.lon != null) {
        const cur = await weatherService.getCurrentWeather(form.lat, form.lon);
        setWeather({ temp: Math.round(cur.current.temperature), humidity: cur.current.humidity, rain: cur.current.rain || 0 });
      }
      // Placeholder soil + crop stage + health index
      const ph = 6.3 + Math.random() * 0.6; // 6.3 - 6.9
      const moisture = Math.round(20 + Math.random() * 20); // 20-40%
      setSoilCondition({ ph: Number(ph.toFixed(1)), moisture });
      const stages = ['Germination', 'Vegetative Growth', 'Flowering', 'Grain Filling', 'Maturity'];
      setCropStage(stages[Math.floor(Math.random() * stages.length)]);
      const hi = Math.round(70 + Math.random() * 25); // 70-95
      setHealthIndex(hi);
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
      
      const response = await fetch('http://localhost:5000/api/crop/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await response.json();
      setImageAnalysis({
        healthStatus: data.healthStatus,
        confidence: data.confidence,
        issues: data.issues || [],
        recommendations: data.recommendations || []
      });
      
      // Update health index based on image analysis
      if (data.healthStatus === 'healthy') {
        setHealthIndex(Math.max(75, Math.min(95, data.confidence || 85)));
      } else if (data.healthStatus === 'moderate') {
        setHealthIndex(Math.max(50, Math.min(75, data.confidence || 65)));
      } else {
        setHealthIndex(Math.max(30, Math.min(50, data.confidence || 40)));
      }
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('monitoring.location')}</label>
                <div className="flex gap-2">
                  <input className="flex-1 border rounded-lg px-3 py-2" placeholder={t('monitoring.placeholderLocation')} value={form.locationQuery} onChange={(e) => setForm({ ...form, locationQuery: e.target.value })} />
                  <button className="px-3 rounded-lg border text-sm" onClick={async () => {
                    if (!form.locationQuery.trim()) return;
                    const r = await weatherService.searchLocation(form.locationQuery.trim());
                    setForm({ ...form, lat: r.lat, lon: r.lon });
                  }}>{t('monitoring.search')}</button>
                  <button className="px-3 rounded-lg border text-sm" onClick={detectLocation}>{t('yield.useGPS')}</button>
                </div>
                {(form.lat != null && form.lon != null) && (
                  <div className="text-xs text-gray-500 mt-1">{t('yield.selected')}: {form.lat.toFixed(4)}, {form.lon.toFixed(4)}</div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('monitoring.landArea')}</label>
                  <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2" placeholder={t('monitoring.placeholderArea')} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.unit')}</label>
                  <select className="w-full border rounded-lg px-2 py-2" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option value="acre">{t('yield.acres')}</option>
                    <option value="hectare">{t('yield.hectares')}</option>
                  </select>
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
                  <div className="text-2xl font-bold text-gray-900 mt-1">{cropStage}</div>
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
            {healthIndex != null && (
              <div className="bg-white rounded-2xl shadow p-6 border">
                <h3 className="text-lg font-semibold mb-3">{t('monitoring.aiInsights')}</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="text-xl">🟡</div>
                    <div>
                      <div className="font-medium">{t('monitoring.waterStress')}</div>
                      <div className="text-sm text-gray-600">{t('monitoring.action')}: {t('monitoring.increaseIrrigation')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="text-xl">🟢</div>
                    <div>
                      <div className="font-medium">{t('monitoring.temperatureOptimal')}</div>
                      <div className="text-sm text-gray-600">{t('monitoring.action')}: {t('monitoring.maintainPlan')}</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-3">{t('monitoring.lastUpdated')}: {lastUpdated}</div>
              </div>
            )}

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

            {/* Upload */}
            <div className="bg-white rounded-2xl shadow p-6 border">
              <h3 className="text-lg font-semibold mb-2">{t('monitoring.uploadPhoto')}</h3>
              <input type="file" accept="image/*" onChange={onUpload} disabled={analyzing} />
              {filePreview && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <img src={filePreview} alt="preview" className="rounded-xl border w-full" />
                    {analyzing && (
                      <div className="mt-2 text-center text-sm text-gray-600 animate-pulse">
                        {t('monitoring.checking')}...
                      </div>
                    )}
                  </div>
                  <div className={`p-4 rounded-xl border ${
                    imageAnalysis?.healthStatus === 'healthy' ? 'bg-green-50 border-green-200' :
                    imageAnalysis?.healthStatus === 'moderate' ? 'bg-yellow-50 border-yellow-200' :
                    imageAnalysis?.healthStatus === 'critical' ? 'bg-red-50 border-red-200' :
                    imageAnalysis?.healthStatus === 'error' ? 'bg-gray-50 border-gray-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="font-semibold mb-2">{t('monitoring.aiAnalysis')}</div>
                    {analyzing ? (
                      <div className="text-sm text-gray-600 animate-pulse">{t('monitoring.checking')}...</div>
                    ) : imageAnalysis ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium">
                          Status: <span className="capitalize">{imageAnalysis.healthStatus}</span> ({imageAnalysis.confidence}% confidence)
                        </div>
                        {imageAnalysis.issues.map((issue, idx) => (
                          <div key={idx} className="text-sm text-gray-700 mt-2">
                            <div className="font-medium">{issue.type.replace('_', ' ')}</div>
                            <div className="text-xs text-gray-600 mt-1">{issue.description}</div>
                          </div>
                        ))}
                        {imageAnalysis.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs font-medium mb-1">Recommendations:</div>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {imageAnalysis.recommendations.map((rec, idx) => (
                                <li key={idx}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">{t('monitoring.leavesHealthy')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations & Actions */}
            <div className="bg-white rounded-2xl shadow p-6 border">
              <h3 className="text-lg font-semibold mb-3">{t('monitoring.recommendations')}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <li className="p-3 rounded-lg bg-gray-50 border">💧 {t('monitoring.applyUrea')}</li>
                <li className="p-3 rounded-lg bg-gray-50 border">☘ {t('monitoring.neemOil')}</li>
                <li className="p-3 rounded-lg bg-gray-50 border">🪴 {t('monitoring.maintainMoisture')}</li>
                <li className="p-3 rounded-lg bg-gray-50 border">🌡 {t('monitoring.scheduleIrrigation')}</li>
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


