import json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parents[2]

def to_title(x):
    if pd.isna(x):
        return x
    s = str(x).strip().lower()
    return ' '.join(w.capitalize() for w in s.split())

def main():
    paths = [
        BASE / 'Dataset.csv',
        BASE / 'Agri Market Dataset.csv',
        BASE / 'Price_Agriculture_commodities_Week.csv'
    ]
    frames = []
    for p in paths:
        if p.exists():
            try:
                df = pd.read_csv(p)
                df['__source'] = p.name
                frames.append(df)
            except Exception as e:
                print('Failed reading', p, e)
    if not frames:
        print('No CSVs found, exiting.')
        return

    norms = []
    for df in frames:
        cols = {c.lower().strip(): c for c in df.columns}
        state = cols.get('state') or cols.get('state_name')
        district = cols.get('district')
        commodity = cols.get('commodity') or cols.get('crop') or cols.get('product')
        market = cols.get('market') or cols.get('market_name')
        modal = cols.get('modal_price') or cols.get('price') or cols.get('modal')
        arrival = cols.get('arrivals_in_qtl') or cols.get('arrival') or cols.get('arrivals')
        date = cols.get('arrival_date') or cols.get('date') or cols.get('week')

        nd = pd.DataFrame()
        if commodity in df: nd['commodity'] = df[commodity].map(to_title)
        if market in df: nd['market'] = df[market].map(to_title)
        if state in df: nd['state'] = df[state].map(to_title)
        if district in df: nd['district'] = df[district].map(to_title)
        if modal in df: nd['modal_price'] = pd.to_numeric(df[modal], errors='coerce')
        if arrival in df: nd['arrival_qtl'] = pd.to_numeric(df[arrival], errors='coerce')
        if date in df: nd['date'] = pd.to_datetime(df[date], errors='coerce', dayfirst=True)
        norms.append(nd)

    combined = pd.concat(norms, ignore_index=True)
    combined = combined.dropna(subset=['commodity'])
    combined['month'] = combined['date'].dt.to_period('M')

    # Ensure numeric columns exist to avoid KeyError
    if 'arrival_qtl' not in combined.columns:
        combined['arrival_qtl'] = 0.0
    if 'modal_price' not in combined.columns:
        combined['modal_price'] = None

    agg = combined.groupby(['commodity','state','month'], dropna=False).agg(
        avg_modal=('modal_price','mean'),
        total_arrival=('arrival_qtl','sum')
    ).reset_index()

    last3 = (agg.sort_values('month')
               .groupby(['commodity','state'])
               .tail(3)
               .groupby(['commodity','state'])
               .agg(momentum=('avg_modal', lambda s: (s.iloc[-1]-s.iloc[0])/(abs(s.iloc[0])+1e-6)))
               .reset_index())
    agg = agg.merge(last3, on=['commodity','state'], how='left')

    advice = []
    for (commodity, state), grp in agg.groupby(['commodity','state']):
        g = grp.sort_values('month').tail(3)
        if g.empty: continue
        last_avg = g['avg_modal'].iloc[-1]
        mom_raw = float(g['momentum'].iloc[0]) if 'momentum' in g and pd.notna(g['momentum'].iloc[0]) else 0.0
        status = 'bullish' if mom_raw > 0.05 else ('bearish' if mom_raw < -0.05 else 'hold')
        advice.append({
            'commodity': commodity,
            'state': state,
            'last_avg_price': float(last_avg) if pd.notna(last_avg) else None,
            'momentum': mom_raw,
            'status': status
        })

    out_dir = BASE / 'backend' / 'data'
    out_dir.mkdir(parents=True, exist_ok=True)
    insights = {
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'advice_rows': len(advice),
        'advice': advice[:1000]
    }
    # Ensure JSON has no NaN/inf
    def sanitize(obj):
        if isinstance(obj, dict):
            return {k: sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize(x) for x in obj]
        if isinstance(obj, float):
            if pd.isna(obj) or obj == float('inf') or obj == float('-inf'):
                return None
        return obj

    clean = sanitize(insights)
    with open(out_dir / 'mandi_insights.json', 'w', encoding='utf-8') as f:
        json.dump(clean, f, ensure_ascii=False)
    print('Wrote', out_dir / 'mandi_insights.json')

if __name__ == '__main__':
    main()


