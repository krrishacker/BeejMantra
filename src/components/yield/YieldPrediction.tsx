import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { weatherService } from '../../services/weatherService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type SoilType = 'Loamy' | 'Sandy' | 'Clayey' | 'Alluvial';
type FertilizerType = 'Urea' | 'DAP' | 'Organic' | 'None';

interface LocationState {
  display: string;
  lat: number | null;
  lon: number | null;
}

const crops = [
  'Paddy', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Mustard', 'Rapeseed',
  'Barley', 'Bajra (Pearl Millet)', 'Jowar (Sorghum)', 'Ragi (Finger Millet)', 'Groundnut',
  'Sunflower', 'Sesame (Til)', 'Chickpea (Gram)', 'Pigeon Pea (Arhar/Tur)', 'Lentil (Masoor)',
  'Pea', 'Potato', 'Onion', 'Garlic', 'Tomato', 'Brinjal (Eggplant)', 'Okra (Bhindi)',
  'Chili', 'Turmeric', 'Ginger', 'Banana', 'Mango', 'Citrus', 'Grapes', 'Guava', 'Papaya',
  'Pomegranate', 'Cabbage', 'Cauliflower', 'Coconut', 'Arecanut', 'Tea', 'Coffee', 'Rubber', 'Jute'
];
const soils: SoilType[] = ['Loamy', 'Sandy', 'Clayey', 'Alluvial'];
const allSoils = ['Loamy', 'Sandy', 'Clayey', 'Alluvial', 'Black (Regur)', 'Red', 'Laterite', 'Peaty', 'Saline-Alkaline', 'Desert', 'Mountain', 'Silty'];
const fertilizersList = ['Urea', 'DAP', 'MOP (Muriate of Potash)', 'SSP (Single Super Phosphate)', 'NPK 10:26:26', 'NPK 12:32:16', 'NPK 20:20:0', 'Organic', 'Farmyard Manure (FYM)', 'Vermicompost', 'Neem Cake', 'Green Manure', 'Biofertilizer', 'None'];

const primaryButton = 'bg-[#34A853] hover:bg-green-600 text-white';

const YieldPrediction: React.FC = () => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState('Paddy');
  const [location, setLocation] = useState<LocationState>({ display: '', lat: null, lon: null });
  const [locationQuery, setLocationQuery] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [area, setArea] = useState<string>('');
  const [areaUnit, setAreaUnit] = useState<'acre' | 'hectare'>('acre');
  const [soil, setSoil] = useState<SoilType>('Loamy');
  const [fertilizer, setFertilizer] = useState<FertilizerType>('Urea');
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ displayName: string; lat: number; lon: number }>>([]);
  const [cropQuery, setCropQuery] = useState('');

  const [predictedYield, setPredictedYield] = useState<number | null>(null);
  const [profit, setProfit] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<{ temp: number; humidity: number; rainfall?: number } | null>(null);

  // Auto-detect location
  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    try {
      setWeatherLoading(true);
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ display: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, lat: latitude, lon: longitude });
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    } catch (_) {
      setError(t('yield.couldNotDetectLocation'));
    } finally {
      setWeatherLoading(false);
    }
  };

  // Fetch weather once we have coordinates
  useEffect(() => {
    const fetchWeather = async () => {
      if (location.lat == null || location.lon == null) return;
      try {
        setWeatherLoading(true);
        const current = await weatherService.getCurrentWeather(location.lat, location.lon);
        const temp = Math.round(current.current.temperature);
        const humidity = current.current.humidity;
        const rainfall = current.current.rain || 0;
        setWeatherSummary({ temp, humidity, rainfall });
      } catch (e: any) {
        setError(e.message || t('yield.failedToFetchWeather'));
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, [location.lat, location.lon]);

  const onSearchLocation = async () => {
    if (!locationQuery.trim()) return;
    try {
      setWeatherLoading(true);
      const result = await weatherService.searchLocation(locationQuery.trim());
      setLocation({ display: `${result.name}${result.state ? ', ' + result.state : ''}, ${result.country}`, lat: result.lat, lon: result.lon });
    } catch (e: any) {
      setError(e.message || t('yield.locationSearchFailed'));
    } finally {
      setWeatherLoading(false);
    }
  };

  // Debounced multi-location suggestions
  useEffect(() => {
    const q = locationQuery.trim();
    if (q.length < 3) { setLocationSuggestions([]); return; }
    const id = setTimeout(async () => {
      try {
        const results = await weatherService.searchMultipleLocations(q);
        setLocationSuggestions(results.map(r => ({ displayName: r.displayName, lat: r.lat, lon: r.lon })));
      } catch (_) {}
    }, 400);
    return () => clearTimeout(id);
  }, [locationQuery]);

  // Placeholder AI prediction
  const predictYield = async () => {
    setError(null);
    setLoading(true);
    try {
      const parsedArea = parseFloat(area || '0');
      const areaInAcres = areaUnit === 'acre' ? parsedArea : parsedArea * 2.47105;

      const temp = weatherSummary?.temp ?? 28;
      const humidity = weatherSummary?.humidity ?? 60;
      const rain = weatherSummary?.rainfall ?? 0;

      let baseYield = 2.8; // tonnes/acre baseline
      if (crop === 'Wheat') baseYield = 2.2;
      if (crop === 'Maize') baseYield = 3.0;
      if (crop === 'Sugarcane') baseYield = 6.0;
      if (crop === 'Cotton') baseYield = 1.8;

      const soilFactor: Record<SoilType, number> = { Loamy: 1.1, Sandy: 0.9, Clayey: 1.0, Alluvial: 1.15 };
      const fertFactor: Record<FertilizerType, number> = { Urea: 1.05, DAP: 1.08, Organic: 1.02, None: 0.9 };

      const tempScore = 1 - Math.abs(28 - temp) / 50; // near 28C is better
      const humidityScore = 1 - Math.abs(60 - humidity) / 150; // near 60% better
      const rainScore = Math.max(0.8, Math.min(1.1, 1 + (rain - 1) * 0.05));

      const predictedPerAcre = baseYield * soilFactor[soil] * fertFactor[fertilizer] * tempScore * humidityScore * rainScore;
      const predictedTotal = Math.max(0.5, Number((predictedPerAcre * Math.max(0, areaInAcres)).toFixed(2)));
      setPredictedYield(predictedTotal);

      // Profit: rough price per tonne by crop (INR)
      const priceMap: Record<string, number> = { Paddy: 21000, Wheat: 22000, Maize: 18000, Cotton: 60000, Sugarcane: 3200, Soybean: 45000, Pulses: 52000 };
      const perTonne = priceMap[crop] || 20000;
      setProfit(Number((predictedTotal * perTonne).toFixed(0)));

      const conf = Math.max(60, Math.min(95, Math.round(70 + tempScore * 10 + humidityScore * 10)));
      setConfidence(conf);
    } finally {
      setLoading(false);
    }
  };

  const barData = useMemo(() => {
    const predicted = predictedYield ?? 3.4;
    const actual = Math.max(0.8 * predicted, predicted - 0.5);
    return {
      labels: ['Yield (tonnes/acre)'],
      datasets: [
        { label: 'Predicted', data: [predicted], backgroundColor: '#34A853' },
        { label: 'Actual (demo)', data: [actual], backgroundColor: '#A7F3D0' }
      ]
    };
  }, [predictedYield]);

  const lineData = useMemo(() => {
    const temps = [-2, -1, 0, 1, 2].map((d) => (weatherSummary?.temp ?? 28) + d);
    const yields = temps.map((t) => 1 - Math.abs(28 - t) / 50);
    return {
      labels: ['-2d', '-1d', 'today', '+1d', '+2d'],
      datasets: [
        { label: 'Weather Impact Score', data: yields, borderColor: '#34A853', backgroundColor: 'rgba(52,168,83,0.2)' }
      ]
    };
  }, [weatherSummary?.temp]);

  const handleSaveReport = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Yield Prediction', text: `Predicted yield: ${predictedYield} tonnes/acre`, url: window.location.href });
      } else {
        alert(t('common.sharingNotSupported'));
      }
    } catch (_) {}
  };

  const resetForm = () => {
    setPredictedYield(null);
    setProfit(null);
    setConfidence(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Hero */}
      <section className="pt-20 pb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900">{t('yield.title')}</h1>
        <p className="mt-3 text-gray-600 text-lg">{t('yield.subtitle')}</p>
        <div className="mt-6">
          <a href="#predict" className={`inline-block px-6 py-3 rounded-lg shadow ${primaryButton}`}>{t('yield.startPrediction')}</a>
        </div>
      </section>

      <section id="predict" className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('yield.enterDetails')}</h2>
              {weatherLoading && <span className="text-xs text-gray-500 animate-pulse">{t('yield.fetchingWeather')}</span>}
            </div>
            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.cropName')}</label>
                <input
                  list="crop-list"
                  className="w-full border rounded-lg px-3 py-2"
                  value={cropQuery || crop}
                  onChange={(e) => { setCropQuery(e.target.value); setCrop(e.target.value); }}
                  placeholder={t('yield.placeholderCropSearch')}
                />
                <datalist id="crop-list">
                  {crops.sort().map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.location')}</label>
                <div className="flex gap-2">
                  <input list="location-suggestions" className="flex-1 border rounded-lg px-3 py-2" placeholder={t('yield.placeholderLocation')} value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSearchLocation(); }} />
                  <datalist id="location-suggestions">
                    {locationSuggestions.slice(0, 10).map((s, idx) => (
                      <option key={idx} value={s.displayName} />
                    ))}
                  </datalist>
                  <button className={`px-3 rounded-lg border text-sm ${weatherLoading ? 'opacity-70' : ''}`} onClick={onSearchLocation}>{t('yield.search')}</button>
                  <button className={`px-3 rounded-lg border text-sm`} onClick={detectLocation}>{t('yield.useGPS')}</button>
                </div>
                {location.display && (
                  <div className="text-xs text-gray-500 mt-1">{t('yield.selected')}: {location.display}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.sowingDate')}</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.landArea')}</label>
                  <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2" placeholder={t('yield.placeholderArea')} value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.unit')}</label>
                  <select className="w-full border rounded-lg px-2 py-2" value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as any)}>
                    <option value="acre">{t('yield.acres')}</option>
                    <option value="hectare">{t('yield.hectares')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.soilType')}</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={soil} onChange={(e) => setSoil(e.target.value as SoilType)}>
                    {allSoils.map(s => <option key={s} value={s as any}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('yield.fertilizerType')}</label>
                  <select className="w-full border rounded-lg px-3 py-2" value={fertilizer} onChange={(e) => setFertilizer(e.target.value as FertilizerType)}>
                    {fertilizersList.map(f => <option key={f} value={f as any}>{f}</option>)}
                  </select>
                </div>
              </div>

              {location.display && (
                <div className="p-3 rounded-lg bg-gray-50 border text-xs text-gray-600">
                  {t('yield.usingWeatherFor')} <span className="font-medium text-gray-800">{location.display}</span>
                  {weatherSummary && (
                    <>
                      
                      <span className="mx-2">•</span>
                      {weatherSummary.temp}°C, {weatherSummary.humidity}% {t('yield.humidity')}
                    </>
                  )}
                </div>
              )}

              <button
                className={`w-full mt-2 py-2 rounded-lg font-semibold ${primaryButton} ${loading ? 'opacity-70' : ''}`}
                onClick={predictYield}
                disabled={loading}
              >
                {loading ? t('yield.predicting') : t('yield.predictYield')}
              </button>
            </div>
          </div>

          {/* Results Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6 border">
            <h2 className="text-xl font-semibold mb-4">{t('yield.results')}</h2>
            {(!predictedYield && !loading) && (
              <div className="h-[420px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#34A853]">📊</div>
                  <div className="font-medium">{t('yield.submitForm')}</div>
                </div>
              </div>
            )}

            {predictedYield != null && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-green-50 border">
                    <div className="text-sm text-gray-600">{t('yield.predictedYield')}</div>
                    <div className="text-2xl font-bold text-gray-900">{predictedYield} tonnes</div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border">
                    <div className="text-sm text-gray-600">{t('yield.expectedProfit')}</div>
                    <div className="text-2xl font-bold text-gray-900">₹ {profit?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border">
                    <div className="text-sm text-gray-600">{t('yield.confidence')}</div>
                    <div className="text-2xl font-bold text-gray-900">{confidence}%</div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border">
                    <div className="text-sm text-gray-600">{t('yield.weather')}</div>
                    <div className="text-2xl font-bold text-gray-900">{weatherSummary ? `${weatherSummary.temp}°C` : '--'}</div>
                    <div className="text-xs text-gray-500">{t('yield.humidity')} {weatherSummary?.humidity ?? '--'}% · {t('yield.rain')} {weatherSummary?.rainfall ?? 0}mm</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-xl">
                    <div className="text-sm font-semibold mb-2">{t('yield.predictedVsActual')}</div>
                    <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                  <div className="p-4 border rounded-xl">
                    <div className="text-sm font-semibold mb-2">{t('yield.weatherImpactTrend')}</div>
                    <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 1 } } }} />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border rounded-xl text-gray-800">
                  <div className="font-semibold mb-1">{t('yield.smartAdvice')}</div>
                  <div className="text-sm">{(weatherSummary?.rainfall ?? 0) < 1 ? t('yield.increaseIrrigation') : t('yield.rainfallAdequate')}</div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button className={`px-4 py-2 rounded-lg ${primaryButton}`} onClick={handleSaveReport}>{t('yield.saveReport')}</button>
                  <button className="px-4 py-2 rounded-lg border" onClick={resetForm}>{t('yield.predictAgain')}</button>
                  <a className="px-4 py-2 rounded-lg border hover:bg-gray-50" href="#" onClick={(e) => { e.preventDefault(); (window as any).appSetPage?.('mandi'); }}>{t('yield.viewMarketPrices')}</a>
                  <button className="px-4 py-2 rounded-lg border" onClick={handleShare}>{t('yield.shareResult')}</button>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-4 animate-pulse text-gray-500">{t('yield.calculating')}</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default YieldPrediction;


