import React from 'react';
import { useTranslation } from 'react-i18next';

// Dummy AI result – replace when wiring backend/ML
const mockResult = {
  disease: 'Leaf Blight',
  confidence: 92,
  cause: 'Fungal infection due to high humidity',
  solution: 'Spray Mancozeb 75 WP, ensure drainage'
};

type AnalysisItem = {
  id: string;
  name: string;
  confidence: number;
  previewUrl: string;
};

// Upload area subcomponent
const UploadBox: React.FC<{
  file: File | null;
  previewUrl: string | null;
  onDrop: (file: File) => void;
  onRemove: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
}> = ({ file, previewUrl, onDrop, onRemove, onAnalyze, analyzing }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onChoose = () => inputRef.current?.click();

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (/\.(jpg|jpeg|png)$/i.test(f.name)) onDrop(f);
    }
  };

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f && /\.(jpg|jpeg|png)$/i.test(f.name)) onDrop(f);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-400 transition p-6 text-center shadow-sm"
    >
      <div className="text-5xl mb-2">🧠</div>
      <div className="text-lg font-semibold text-gray-900">Upload Crop Image</div>
      <div className="text-sm text-gray-600 mt-1">Drag & drop or choose a .jpg/.jpeg/.png file</div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onChoose}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
        >
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!file || analyzing}
          className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 disabled:opacity-50"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Image'}
        </button>
      </div>

      {file && (
        <div className="mt-4 inline-flex items-center gap-3 bg-gray-50 border rounded-xl p-2">
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover border" />
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{file.name}</div>
            <div className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 text-red-600 hover:text-red-700 text-sm"
            title="Remove"
          >
            ❌ Remove
          </button>
        </div>
      )}
    </div>
  );
};

// AI Result subcomponent
const ResultCard: React.FC<{
  result: typeof mockResult | null;
  analyzing: boolean;
  onGetTips: () => void;
  onSavePdf: () => void;
}> = ({ result, analyzing, onGetTips, onSavePdf }) => {
  if (!result && !analyzing) return null;
  const confidence = result?.confidence ?? 0;
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${analyzing ? 'animate-pulse' : 'animate-[fadeIn_300ms_ease-out]'}`}>
      <style>
        {`@keyframes fadeIn { from {opacity: 0; transform: translateY(4px);} to {opacity: 1; transform: translateY(0);} }`}
      </style>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Results</h3>
        <div className="text-xs text-gray-500">Experimental</div>
      </div>

      {analyzing && (
        <div className="text-sm text-gray-600">Analyzing image... Please wait.</div>
      )}

      {!analyzing && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-200" />
                <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} className="text-green-600" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-600">{confidence}%</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{result.disease} – Confidence {confidence}%</div>
              <div className="text-sm text-gray-600">Possible cause: {result.cause}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-900 mb-1">Suggested solution</div>
            <p className="text-sm text-gray-700">{result.solution}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button onClick={onGetTips} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Get Prevention Tips</button>
            <button onClick={onSavePdf} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100">Save Report (PDF)</button>
          </div>
        </div>
      )}
    </div>
  );
};

// History panel subcomponent
const HistoryPanel: React.FC<{
  items: AnalysisItem[];
  onViewHistory: () => void;
}> = ({ items, onViewHistory }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Analyses</h3>
        <button
          className="text-sm text-green-600 hover:text-green-700"
          onClick={onViewHistory}
        >
          View History
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-500">No analyses yet.</div>
        )}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <img src={it.previewUrl} alt="prev" className="w-10 h-10 rounded-lg object-cover border" />
            <div className="text-sm">
              <div className="font-medium text-gray-900">{it.name}</div>
              <div className="text-gray-600 text-xs">Confidence {it.confidence}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DiseaseDetection: React.FC = () => {
  const { i18n } = useTranslation();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<typeof mockResult | null>(null);
  const [history, setHistory] = React.useState<AnalysisItem[]>([]);
  const [serverResult, setServerResult] = React.useState<any>(null);

  // TODO: Replace with API integration to /api/crop/analyze-image or direct ML inference
  const analyzeDisease = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    setServerResult(null);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('language', i18n.resolvedLanguage || 'en');
      form.append('cropType', guessCropFromFilename(file.name));
      // TODO: point to FastAPI service port if different
      const res = await fetch('http://localhost:5001/predict', { method: 'POST', body: form });
      if (res.ok) {
        const data = await res.json();
        setServerResult(data);
        
        // Check if model is not trained
        if (data.disease === "Model not trained" || data.confidence === 0) {
          alert(`Model not trained yet!\n\nPlease train the model first:\n1. Run: .\\train_disease_model.ps1\n2. Or manually: python deepleaf.py --data ./Dataset --out ./backend/models --epochs 10\n\nThis will take 30-60 minutes.`);
          setResult(null);
          return;
        }
        
        setResult({ disease: data.disease, confidence: Math.round(data.confidence), cause: data.cause, solution: data.suggestions });
        // Voice output disabled as requested
      } else {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('API Error:', errorText);
        alert(`API Error: ${res.status}\n\nPlease ensure:\n1. ML service is running on port 5001\n2. Model is trained (run train_disease_model.ps1)`);
        setResult(null);
      }
    } catch (e) {
      console.error('Network error:', e);
      alert(`Cannot connect to ML service!\n\nPlease ensure:\n1. ML service is running: cd backend/ml_service && python -m uvicorn fastapi_app:app --port 5001\n2. Model is trained: run train_disease_model.ps1`);
      setResult(null);
    } finally {
      setAnalyzing(false);
      if (previewUrl) {
        const name = (serverResult?.disease) || mockResult.disease;
        const conf = (serverResult?.confidence) || mockResult.confidence;
        setHistory((h) => [
          { id: Date.now().toString(), name, confidence: Math.round(conf), previewUrl },
          ...h
        ].slice(0, 3));
      }
    }
  };

  const reAnalyze = () => {
    onRemove();
  };

  const onDrop = (f: File) => {
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const onRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  const fetchTips = () => {
    console.log('Fetching prevention tips...');
  };

  const savePdf = () => {
    console.log('Saving report as PDF...');
  };

  const onViewHistory = () => {
    console.log('Open full analysis history...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header banner */}
      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="text-5xl mb-2">🌿</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI-Powered Disease Detection <span className="text-xs text-gray-500 align-middle ml-2">{serverResult?.modelVersion ? `Model: ${serverResult.modelVersion}` : 'Model: DeepLeaf v2.0'}</span></h1>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            Upload an image of your crop to detect possible diseases and get treatment suggestions.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main column */}
          <div className="lg:col-span-2 space-y-6">
            <UploadBox
              file={file}
              previewUrl={previewUrl}
              onDrop={onDrop}
              onRemove={onRemove}
              onAnalyze={analyzeDisease}
              analyzing={analyzing}
            />

            <ResultCard
              result={result}
              analyzing={analyzing}
              onGetTips={fetchTips}
              onSavePdf={savePdf}
            />

            {/* Re-analyze */}
            {(file || result) && (
              <div className="flex justify-end">
                <button onClick={reAnalyze} className="mt-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100">Re-analyze</button>
              </div>
            )}
          </div>

          {/* Right/Side column */}
          <div className="lg:col-span-1 space-y-6">
            <HistoryPanel items={history} onViewHistory={onViewHistory} />
            {/* Possible Causes & Treatments expandable */}
            {result && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Possible Causes & Treatments</h3>
                <details className="mb-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-900 flex items-center gap-2">Cause 🌧</summary>
                  <p className="text-sm text-gray-700 mt-2">{result.cause}</p>
                </details>
                <details className="mb-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-900 flex items-center gap-2">Treatment 💊</summary>
                  <p className="text-sm text-gray-700 mt-2">{result.solution}</p>
                </details>
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-900 flex items-center gap-2">Prevention 🌿</summary>
                  <p className="text-sm text-gray-700 mt-2">Maintain proper spacing, avoid overhead irrigation, use resistant varieties where possible.</p>
                </details>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

function guessCropFromFilename(name: string): string {
  const base = name.split('.')[0].toLowerCase();
  const tokens = base.replace(/[-]/g, '_').split('_');
  const known = ['wheat','rice','paddy','maize','corn','cotton','tomato','potato','soybean','grape'];
  for (const t of tokens) {
    if (known.includes(t)) return t === 'corn' ? 'maize' : t;
  }
  return 'unknown';
}

export default DiseaseDetection;


