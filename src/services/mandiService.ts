import axios from 'axios';

export interface MandiRecord {
  commodity: string;
  market: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  arrival: number;
  state: string;
  district: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
}

export async function getMandiByStateCommodity(state: string, commodity: string) {
  const url = `/api/mandi/${encodeURIComponent(state)}/${encodeURIComponent(commodity)}`;
  const { data } = await axios.get<MandiRecord[]>(url);
  return data;
}

export async function getMandiByStateDistrictCommodity(state: string, district: string, commodity: string) {
  const url = `/api/mandi/${encodeURIComponent(state)}/${encodeURIComponent(district)}/${encodeURIComponent(commodity)}`;
  const { data } = await axios.get<MandiRecord[]>(url);
  return data;
}

export async function getMandiHistory(commodity: string, opts?: { state?: string; district?: string; days?: number }) {
  const params: any = {};
  if (opts?.state) params.state = opts.state;
  if (opts?.district) params.district = opts.district;
  if (opts?.days) params.days = String(opts.days);
  const url = `/api/mandi/history/${encodeURIComponent(commodity)}`;
  const { data } = await axios.get<MandiRecord[]>(url, { params });
  return data;
}

export async function getDistrictsByState(state: string) {
  const url = `/api/mandi/districts/${encodeURIComponent(state)}`;
  const { data } = await axios.get<string[]>(url);
  return data;
}

export async function searchMandi(params: { state?: string; district?: string; commodity?: string; limit?: number }) {
  const { state, district, commodity, limit } = params;
  const q: any = {};
  if (state) q.state = state;
  if (district) q.district = district;
  if (commodity) q.commodity = commodity;
  if (limit) q.limit = String(limit);
  const { data } = await axios.get<MandiRecord[]>(`/api/mandi/search`, { params: q });
  return data;
}


