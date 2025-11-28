import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMandiByStateCommodity, getMandiByStateDistrictCommodity, getMandiHistory, getDistrictsByState, searchMandi, MandiRecord } from '../../services/mandiService';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Jammu and Kashmir','Ladakh'
];

// Minimal commodity list starter; farmers can search free-text too
const COMMODITIES = ['Wheat','Rice','Maize','Bajra','Jowar','Barley','Gram','Tur','Urad','Moong','Soyabean','Groundnut','Mustard','Cotton','Sugarcane','Onion','Potato','Tomato'];

interface Props {
  language?: string;
}

const MandiDashboard: React.FC<Props> = ({ language }) => {
  const { t: translate, i18n } = useTranslation();
  
  // Sync i18n with language prop
  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  
  // Get translations
  const t = {
    title: translate('mandi.title'),
    state: translate('mandi.state'),
    district: translate('mandi.district'),
    commodity: translate('mandi.commodity'),
    search: translate('mandi.search'),
    fetch: translate('mandi.fetchData'),
    tableHeaders: [
      translate('mandi.commodityCol'),
      translate('mandi.marketCol'),
      translate('mandi.priceCol'),
      translate('mandi.arrivalCol'),
      translate('mandi.stateCol'),
      translate('mandi.districtCol')
    ],
    trend: translate('mandi.trend')
  };
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [commodity, setCommodity] = useState('');
  const [commodityQuery, setCommodityQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MandiRecord[]>([]);
  const [history, setHistory] = useState<MandiRecord[]>([]);

  const filteredStates = useMemo(() => {
    if (!stateQuery) return STATES;
    return STATES.filter(s => s.toLowerCase().includes(stateQuery.toLowerCase()));
  }, [stateQuery]);

  const filteredCommodities = useMemo(() => {
    if (!commodityQuery) return COMMODITIES;
    return COMMODITIES.filter(c => c.toLowerCase().includes(commodityQuery.toLowerCase()));
  }, [commodityQuery]);

  const toTitle = (val: string) => val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: MandiRecord[] = [];
      const normDistrict = district ? toTitle(district) : '';
      // New unified search supports ANY of the fields
      data = await searchMandi({ state: state || undefined, district: normDistrict || undefined, commodity: commodity || undefined, limit: 1000 });
      setRows(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load districts when state changes
  useEffect(() => {
    setDistrict('');
    if (!state) { setDistrictOptions([]); return; }
    getDistrictsByState(state)
      .then((list) => setDistrictOptions(list))
      .catch(() => setDistrictOptions([]));
  }, [state]);

  // Auto Title Case on blur
  const handleDistrictBlur = () => {
    if (district) setDistrict(toTitle(district));
  };

  useEffect(() => {
    if (commodity) {
      getMandiHistory(commodity, { state: state || undefined, district: district || undefined, days: 30 })
        .then(setHistory)
        .catch(() => setHistory([]));
    } else {
      setHistory([]);
    }
  }, [commodity, state, district]);

  // Auto-fetch when any single filter is selected (debounced behaviour could be added)
  useEffect(() => {
    if (state || district || commodity) {
      fetchRows();
    } else {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, district, commodity]);

  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => (a.arrival_date || '').localeCompare(b.arrival_date || ''));
    return sorted.slice(-30).map(r => ({
      date: r.arrival_date || '',
      price: r.modal_price
    }));
  }, [history]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t.title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.state}</label>
            <input list="state-list" value={state} onChange={(e)=>{ setState(e.target.value); setStateQuery(e.target.value); }} placeholder={translate('mandi.placeholderState')} className="w-full border rounded-md px-3 py-2" />
            <datalist id="state-list">
              {filteredStates.map((s)=> (<option key={s} value={s} />))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.district}</label>
            {districtOptions.length > 0 ? (
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full border rounded-md px-3 py-2">
                <option value="">---</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <input value={district} onChange={(e) => setDistrict(e.target.value)} onBlur={handleDistrictBlur} placeholder={translate('mandi.placeholderDistrict')} className="w-full border rounded-md px-3 py-2" />
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t.commodity}</label>
            <input list="commodity-list" value={commodity} onChange={(e)=>{ setCommodity(e.target.value); setCommodityQuery(e.target.value); }} placeholder={translate('mandi.placeholderCommodity')} className="w-full border rounded-md px-3 py-2" />
            <datalist id="commodity-list">
              {filteredCommodities.map((c)=> (<option key={c} value={c} />))}
            </datalist>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={fetchRows} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">{t.fetch}</button>
        </div>

        {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        {loading && <div className="text-gray-600 mb-3 text-sm">Loading...</div>}

        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {t.tableHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-800">{r.commodity}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.market}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">₹ {r.modal_price}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.arrival}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.state}</td>
                  <td className="px-4 py-2 text-sm text-gray-800">{r.district}</td>
                </tr>
              ))}
              {!rows.length && !loading && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {commodity && chartData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{t.trend}: {commodity}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default MandiDashboard;


