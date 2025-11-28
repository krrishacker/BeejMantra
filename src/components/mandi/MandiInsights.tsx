import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Advice = {
  commodity: string;
  state: string;
  last_avg_price: number | null;
  momentum: number | null;
  status: 'bullish' | 'bearish' | 'hold';
  rationale?: string[];
};

type Insights = {
  generated_at: string;
  advice_rows: number;
  advice?: Advice[];
  top_bullish?: Advice[];
  top_bearish?: Advice[];
};

const badge = (s: Advice['status']) => s === 'bullish' ? 'bg-green-100 text-green-800' : s === 'bearish' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';

const MandiInsights: React.FC = () => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [commodityQuery, setCommodityQuery] = useState<string>('');
  const [stateQuery, setStateQuery] = useState<string>('');

  useEffect(() => {
    axios.get('/api/mandi/insights')
      .then(r => setInsights(r.data))
      .catch(e => setError(e?.response?.data?.error || e.message));
  }, []);

  const list = insights?.top_bullish || insights?.advice || [];

  const commodities = useMemo(() => {
    const set = new Set<string>();
    list.forEach(a => { if (a.commodity) set.add(a.commodity); });
    return Array.from(set).sort();
  }, [list]);

  const statesForCommodity = useMemo(() => {
    const set = new Set<string>();
    list.filter(a => !selectedCommodity || a.commodity === selectedCommodity)
        .forEach(a => { if (a.state) set.add(a.state); });
    return Array.from(set).sort();
  }, [list, selectedCommodity]);

  const filteredList = useMemo(() => {
    return list.filter(a => (
      (!selectedCommodity || a.commodity === selectedCommodity) &&
      (!selectedState || a.state === selectedState)
    ));
  }, [list, selectedCommodity, selectedState]);

  useEffect(() => {
    if (!selectedCommodity) { setHistory([]); return; }
    const params: any = {};
    if (selectedState) params.state = selectedState;
    axios.get(`/api/mandi/history/${encodeURIComponent(selectedCommodity)}`, { params })
      .then(r => {
        const data = (r.data || []).map((d: any) => ({
          date: d.arrival_date?.slice(0,10) || '',
          price: d.modal_price
        })).filter((x: any) => x.date);
        data.sort((a: any, b: any) => a.date.localeCompare(b.date));
        setHistory(data.slice(-30));
      })
      .catch(() => setHistory([]));
  }, [selectedCommodity, selectedState]);

  const currentAdvice: Advice | undefined = useMemo(() => {
    if (!selectedCommodity) return undefined;
    const pool = list.filter(a => a.commodity === selectedCommodity);
    if (selectedState) return pool.find(a => a.state === selectedState) || pool[0];
    return pool[0];
  }, [list, selectedCommodity, selectedState]);

  const aiSummary = useMemo(() => {
    if (!currentAdvice) return '';
    const mom = currentAdvice.momentum || 0;
    const last = currentAdvice.last_avg_price || 0;
    const trend = history.length > 1 ? (history[history.length-1].price - history[0].price) : 0;
    const trendPct = history.length > 1 && history[0].price ? (trend / history[0].price) : 0;
    const lines: string[] = [];
    if (mom > 0.05 || trendPct > 0.05) {
      lines.push('Trend: upar ja raha hai (bullish).');
      lines.push('Action: bechne ka mauka, supply aur demand dekh kar faisla lein.');
    } else if (mom < -0.05 || trendPct < -0.05) {
      lines.push('Trend: neeche ja raha hai (bearish).');
      lines.push('Action: turant sale se bachen; sasti kharid ke liye monitoring karein.');
    } else {
      lines.push('Trend: stable/sideways.');
      lines.push('Action: local mandi spread aur arrivals ke basis par decide karein.');
    }
    lines.push(`Latest avg price: ₹ ${Math.round(last)}`);
    if (selectedState) lines.push(`State: ${selectedState}`);
    return lines.join(' ');
  }, [currentAdvice, history, selectedState]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Market Insights & Advisory</h2>
        {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        {!insights && !error && <div className="text-gray-600">Loading insights...</div>}
        {insights && (
          <>
            <div className="text-sm text-gray-500 mb-4">Generated: {insights.generated_at ? new Date(insights.generated_at).toLocaleString() : '-'}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Commodity</label>
                <input list="commodity-options" value={selectedCommodity} onChange={(e)=>{setSelectedCommodity(e.target.value); setCommodityQuery(e.target.value); setSelectedState('');}} placeholder="Search commodity" className="w-full border rounded-md px-3 py-2" />
                <datalist id="commodity-options">
                  {commodities
                    .filter(c => !commodityQuery || c.toLowerCase().includes(commodityQuery.toLowerCase()))
                    .map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">State</label>
                <input list="state-options" value={selectedState} onChange={(e)=>{setSelectedState(e.target.value); setStateQuery(e.target.value);}} placeholder="Search state" className="w-full border rounded-md px-3 py-2" />
                <datalist id="state-options">
                  {statesForCommodity
                    .filter(s => !stateQuery || s.toLowerCase().includes(stateQuery.toLowerCase()))
                    .map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="flex items-end">
                {currentAdvice && (
                  <div className={`px-3 py-2 text-xs rounded ${badge(currentAdvice.status)}`}>Status: {currentAdvice.status}</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.slice(0, 12).map((a, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">{a.commodity}</div>
                    <span className={`px-2 py-1 text-xs rounded ${badge(a.status)}`}>{a.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">State: {a.state}</div>
                  <div className="text-sm text-gray-600 mb-1">Avg Price: {a.last_avg_price !== null && a.last_avg_price !== undefined ? `₹ ${Math.round(a.last_avg_price)}` : '-'}</div>
                  <div className="text-sm text-gray-600 mb-2">Momentum: {a.momentum !== null && a.momentum !== undefined ? `${(a.momentum*100).toFixed(1)}%` : '-'}</div>
                  {a.rationale && a.rationale.length > 0 && (
                    <ul className="list-disc ml-5 text-xs text-gray-500">
                      {a.rationale.slice(0, 3).map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {selectedCommodity && history.length > 1 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Price Trend (last 30 days): {selectedCommodity}{selectedState?` - ${selectedState}`:''}</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={3} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {aiSummary && (
              <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded">
                <div className="font-semibold text-green-700 mb-1">Advisory</div>
                <div className="text-sm text-green-800">{aiSummary}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MandiInsights;


