
import React, { useEffect, useState } from 'react';
import { analyzeRoute } from './services/geminiService';
import { RiskCharts } from './components/RiskCharts';
import { RouteTimeline } from './components/RouteTimeline';
import { SummaryCards } from './components/SummaryCards';
import { BatchItem, RouteAnalysis, SavedReport, Warehouse } from './types';
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Copy,
  FileText,
  Layers,
  Link,
  Loader2,
  Lock,
  Map as MapIcon,
  MapPin,
  Navigation,
  Play,
  Printer,
  ShieldCheck,
  Share2,
  Truck,
  Unlock,
  XCircle
} from 'lucide-react';

const WAREHOUSES: Warehouse[] = [
  { id: 'custom', name: 'Custom / Ozel Konum', city: '', coordinates: '' },
  { id: 'gebze', name: 'Gebze Ana Depo', city: 'Kocaeli', coordinates: '40.8354,29.3986' },
  { id: 'sekerpinar', name: 'Sekerpinar Aktarma', city: 'Kocaeli', coordinates: '40.8624,29.3885' },
  { id: 'izmir', name: 'Izmir Hub', city: 'Izmir', coordinates: '38.2917,27.2403' },
  { id: 'bursa', name: 'Bursa Transfer Merkezi', city: 'Bursa', coordinates: '40.2307,28.9813' },
  { id: 'ankara', name: 'Ankara Lojistik Merkezi', city: 'Ankara', coordinates: '40.0652,32.5997' },
  { id: 'esenyurt', name: 'Istanbul Esenyurt', city: 'Istanbul', coordinates: '41.0558,28.6669' },
  { id: 'hadimkoy', name: 'Istanbul Hadimkoy', city: 'Istanbul', coordinates: '41.0963,28.6185' },
  { id: 'adana', name: 'Adana Bolge', city: 'Adana', coordinates: '36.9914,35.3308' },
  { id: 'mersin', name: 'Mersin Lojistik', city: 'Mersin', coordinates: '36.8121,34.6415' },
];

const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin';

const encodeReport = (report: SavedReport) => {
  try {
    // Drop heavy metadata to keep link short
    const slim = { ...report, analysis: { ...report.analysis, groundingMetadata: undefined } };
    return compressToBase64(JSON.stringify(slim));
  } catch (err) {
    console.error('Failed to encode report', err);
    return '';
  }
};

const decodeReport = (value: string): SavedReport | null => {
  try {
    const json = decompressFromBase64(value);
    if (json) return JSON.parse(json);

    // backward compatibility for older tokens
    const legacyUri = decompressFromBase64(decodeURIComponent(value));
    if (legacyUri) return JSON.parse(legacyUri);

    const legacy = decodeURIComponent(escape(atob(value)));
    return JSON.parse(legacy);
  } catch (err) {
    console.error('Invalid shared report token', err);
    return null;
  }
};

const buildShareUrl = (token: string) => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('r', token);
  url.searchParams.delete('report'); // clean legacy param
  return url.toString();
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Single analysis state
  const [originId, setOriginId] = useState('gebze');
  const [originText, setOriginText] = useState('');
  const [intermediateId, setIntermediateId] = useState('');
  const [intermediateText, setIntermediateText] = useState('');
  const [destId, setDestId] = useState('izmir');
  const [destText, setDestText] = useState('');
  const [useTolls, setUseTolls] = useState(true);

  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch analysis state
  const [batchInput, setBatchInput] = useState('');
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const getSelectedLocation = (id: string, text: string) => {
    const warehouse = WAREHOUSES.find((w) => w.id === id);
    if (!id) return { name: '', coords: undefined };
    if (id === 'custom' || !warehouse) {
      return { name: text, coords: undefined };
    }
    return { name: warehouse.name, coords: warehouse.coordinates };
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const remembered = window.localStorage.getItem('admin-auth');
    if (remembered === 'true') {
      setIsAuthenticated(true);
    }
    const storedEmail = window.localStorage.getItem('admin-email');
    if (storedEmail) {
      setAdminEmail(storedEmail);
    }

    const params = new URLSearchParams(window.location.search);
    const shared = params.get('r') || params.get('report');
    if (shared) {
      const decoded = decodeReport(shared);
      if (decoded) {
        setAnalysis(decoded.analysis);
        setCurrentReport(decoded);
        setShareUrl(window.location.href);
        setIsSharedView(true);
        setActiveTab('single');
      } else {
        setError('Shared report could not be opened.');
      }
    }
  }, []);
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!adminEmail.trim()) {
      setLoginError('Enter an email to continue.');
      return;
    }
    if (adminCodeInput.trim() !== ADMIN_CODE) {
      setLoginError('Admin code is incorrect.');
      return;
    }
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-auth', 'true');
      window.localStorage.setItem('admin-email', adminEmail.trim());
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminCodeInput('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('admin-auth');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setError('Admin login is required to create a report.');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setIsSharedView(false);

    const origin = getSelectedLocation(originId, originText);
    const dest = getSelectedLocation(destId, destText);
    const stop = getSelectedLocation(intermediateId, intermediateText);

    if (!origin.name || !dest.name) {
      setError('Please provide both origin and destination.');
      setLoading(false);
      return;
    }

    try {
      const result = await analyzeRoute(origin.name, dest.name, origin.coords, dest.coords, {
        useTolls,
        stopName: stop.name || undefined,
        stopCoords: stop.coords,
      });

      const report: SavedReport = {
        id: `report-${Date.now()}`,
        createdAt: new Date().toISOString(),
        origin: origin.name,
        destination: dest.name,
        stop: stop.name || undefined,
        useTolls,
        analysis: result,
      };

      setAnalysis(result);
      setCurrentReport(report);
      setCopySuccess(false);

      const encoded = encodeReport(report);
      if (encoded && typeof window !== 'undefined') {
        const url = buildShareUrl(encoded);
        setShareUrl(url);
        const existing = JSON.parse(window.localStorage.getItem('route-reports') || '[]');
        existing.unshift(report);
        window.localStorage.setItem('route-reports', JSON.stringify(existing.slice(0, 15)));
      }
    } catch (err) {
      console.error(err);
      setError('Rota analizi basarisiz oldu.');
    } finally {
      setLoading(false);
    }
  };
  const parseBatchInput = () => {
    const lines = batchInput.split('\n').filter((line) => line.trim().length > 0);
    const queue: BatchItem[] = lines.map((line, idx) => {
      const [o, d] = line.split(',').map((s) => s.trim());
      return {
        id: `batch-${idx}-${Date.now()}`,
        origin: o || '?',
        destination: d || '?',
        status: 'pending',
      };
    });
    setBatchQueue(queue);
  };

  const openBatchReport = (item: BatchItem) => {
    if (!item.result) return;
    const report: SavedReport = {
      id: `report-${item.id}`,
      createdAt: new Date().toISOString(),
      origin: item.origin,
      destination: item.destination,
      useTolls: true,
      analysis: item.result,
    };
    setAnalysis(item.result);
    setCurrentReport(report);
    setIsSharedView(false);
    const encoded = encodeReport(report);
    if (encoded && typeof window !== 'undefined') {
      setShareUrl(buildShareUrl(encoded));
    }
    setActiveTab('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startBatchProcessing = async () => {
    if (!isAuthenticated) {
      setError('Admin login is required to run batch.');
      return;
    }
    setBatchProcessing(true);
    const newQueue = [...batchQueue];

    for (let i = 0; i < newQueue.length; i++) {
      if (newQueue[i].status === 'completed') continue;

      newQueue[i] = { ...newQueue[i], status: 'processing' };
      setBatchQueue([...newQueue]);

      try {
        const result = await analyzeRoute(newQueue[i].origin, newQueue[i].destination, undefined, undefined, { useTolls: true });
        newQueue[i] = { ...newQueue[i], status: 'completed', result };
      } catch (err) {
        newQueue[i] = { ...newQueue[i], status: 'error', errorMsg: 'Hata' };
      }
      setBatchQueue([...newQueue]);
    }
    setBatchProcessing(false);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && window.print) {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 200);
    } else {
      alert('Tarayiciniz yazdirma ozelligini desteklemiyor.');
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };
  const originLoc = getSelectedLocation(originId, originText);
  const destLoc = getSelectedLocation(destId, destText);
  const stopLoc = getSelectedLocation(intermediateId, intermediateText);

  const mapOrigin = currentReport?.origin || originLoc.name;
  const mapDestination = currentReport?.destination || destLoc.name;
  const mapStop = currentReport?.stop || stopLoc.name;
  const tollPref = currentReport?.useTolls ?? useTolls;

  const originQuery = mapOrigin;
  const destQuery = mapDestination;
  const stopQuery = mapStop ? `&to=${encodeURIComponent(mapStop)}` : '';

  const mapEmbedUrl = analysis
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(originQuery)}${stopQuery}&daddr=${encodeURIComponent(destQuery)}&t=m&z=7&output=embed`
    : null;

  const mapNavigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}${
    mapStop ? `&waypoints=${encodeURIComponent(mapStop)}` : ''
  }&travelmode=driving${!tollPref ? '&avoid=tolls' : ''}`;

  const shareToWhatsapp = () => {
    const text = `Route Report\n${mapOrigin} -> ${mapDestination}\nNavigate: ${mapNavigationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const renderLoginCard = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 mb-3">
        <Lock className="w-4 h-4 text-blue-500" />
        Admin girişi gerekli
      </div>
      <form className="space-y-3" onSubmit={handleLogin}>
        <div>
          <label className="text-xs uppercase text-slate-500 font-semibold">Work email</label>
          <input
            className="mt-1 w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 outline-none"
            placeholder="name@example.com"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500 font-semibold">Admin code</label>
          <input
            className="mt-1 w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 outline-none"
            placeholder={`Varsayılan: ${ADMIN_CODE}`}
            value={adminCodeInput}
            onChange={(e) => setAdminCodeInput(e.target.value)}
          />
        </div>
        {loginError && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {loginError}
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
        >
          <Unlock className="w-4 h-4" /> Giriş Yap
        </button>
      </form>
      <p className="text-[11px] text-slate-500 mt-3 leading-4">
        Admin kodunu <code className="bg-slate-100 px-2 py-1 rounded">VITE_ADMIN_CODE</code> ile değiştirebilirsiniz.
      </p>
    </div>
  );
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="w-full py-4 px-6 flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-2 font-semibold">
          <Truck className="w-4 h-4 text-blue-500" />
          <span>AI JMP</span>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-3 text-sm">
            {adminEmail && <span className="text-slate-500">Signed in as {adminEmail}</span>}
            <button onClick={handleLogout} className="text-rose-600 hover:text-rose-700 font-semibold">
              Çık
            </button>
          </div>
        ) : (
          <button
            onClick={() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-blue-500 hover:text-blue-600"
          >
            Giriş Yap
          </button>
        )}
      </header>

      <section className="flex flex-col items-center text-center py-16 px-4">
        <h1 className="text-4xl md:text-5xl font-bold">Güvenli Sürüş</h1>
        <p className="mt-3 text-slate-600 max-w-md">
          Yapay zeka destekli rota analizi ve risk değerlendirmesi
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setActiveTab('single');
              document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2"
          >
            Başla <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:border-blue-300 hover:text-blue-600 transition"
          >
            Giriş Yap
          </button>
        </div>
      </section>
      <main id="workspace" className="max-w-5xl mx-auto px-4 pb-16 space-y-8">
        {isSharedView && currentReport && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Link className="w-4 h-4" /> Paylaşılan okuma modu. Yeni rapor için admin girişi yapın.
          </div>
        )}

        {shareUrl && currentReport && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 print:hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-slate-700">
                Paylaşılabilir bağlantı (dondurulmuş kopya). Bağlantıyı bilen herkes görebilir, içerik değişmez.
              </div>
              <div className="flex gap-2">
                <button onClick={copyShareLink} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                  <Copy className="w-4 h-4" /> {copySuccess ? 'Kopyalandı' : 'Kopyala'}
                </button>
                <button onClick={() => window.open(shareUrl, '_blank')} className="bg-slate-200 text-slate-800 text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-300">
                  <Link className="w-4 h-4" /> Aç
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 break-all">{shareUrl}</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <section id="builder" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-400 font-semibold">Workspace</p>
              <h3 className="text-xl font-bold">Route and risk report builder</h3>
            </div>
            <div className="flex gap-2 bg-slate-900/60 border border-white/10 rounded-full p-1">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeTab === 'single' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-200 hover:text-white'
                }`}
              >
                Single route
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeTab === 'batch' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-200 hover:text-white'
                }`}
              >
                Batch upload
              </button>
            </div>
          </div>
          {activeTab === 'single' && (
            <div className="space-y-4">
              {isAuthenticated ? (
                <form onSubmit={handleAnalyze} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="p-4 space-y-2">
                      <label className="text-[11px] uppercase text-slate-500 font-semibold">Origin</label>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <select
                          value={originId}
                          onChange={(e) => setOriginId(e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-slate-900 border-b border-slate-200 focus:border-blue-400 outline-none"
                        >
                          {WAREHOUSES.map((w) => (
                            <option key={w.id} value={w.id} className="bg-white text-slate-900">
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {originId === 'custom' && (
                        <input
                          value={originText}
                          onChange={(e) => setOriginText(e.target.value)}
                          placeholder="Location name..."
                          className="w-full mt-2 text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                        />
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <label className="text-[11px] uppercase text-slate-500 font-semibold">Optional stop</label>
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-4 h-4 text-amber-500" />
                        <select
                          value={intermediateId}
                          onChange={(e) => setIntermediateId(e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-slate-900 border-b border-slate-200 focus:border-amber-400 outline-none"
                        >
                          <option value="" className="bg-white text-slate-900">No stop</option>
                          {WAREHOUSES.map((w) => (
                            <option key={w.id} value={w.id} className="bg-white text-slate-900">
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {intermediateId === 'custom' && (
                        <input
                          value={intermediateText}
                          onChange={(e) => setIntermediateText(e.target.value)}
                          placeholder="Location name..."
                          className="w-full mt-2 text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                        />
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <label className="text-[11px] uppercase text-slate-500 font-semibold">Destination</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <select
                          value={destId}
                          onChange={(e) => setDestId(e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-slate-900 border-b border-slate-200 focus:border-rose-400 outline-none"
                        >
                          {WAREHOUSES.map((w) => (
                            <option key={w.id} value={w.id} className="bg-white text-slate-900">
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {destId === 'custom' && (
                        <input
                          value={destText}
                          onChange={(e) => setDestText(e.target.value)}
                          placeholder="Location name..."
                          className="w-full mt-2 text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900"
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-slate-700">
                      <div className={`w-12 h-6 rounded-full p-1 transition-all ${useTolls ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow transform transition ${useTolls ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </div>
                      Ücretli yolları kullan
                      <input type="checkbox" className="hidden" checked={useTolls} onChange={(e) => setUseTolls(e.target.checked)} />
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto bg-blue-600 text-white font-bold px-8 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-blue-700"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Analizi başlat
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 md:grid-cols-[1.3fr,1fr]">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-700">
                    <p className="font-semibold mb-2">Giriş gerekli</p>
                    <p className="text-sm text-slate-500 mb-3">
                      Admin e-posta ve kodunu girerek raporları oluşturabilirsiniz. Varsayılan kod admin veya .env içindeki VITE_ADMIN_CODE değeri.
                    </p>
                    <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                      <li>Rapor oluşturmak için zorunlu.</li>
                      <li>Giriş bilgileri tarayıcıda hatırlanır.</li>
                    </ul>
                  </div>
                  {renderLoginCard()}
                </div>
              )}
            </div>
          )}
          {activeTab === 'batch' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Layers className="w-5 h-5 text-slate-500" /> Toplu rotalar
              </div>
              {!batchQueue.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Her satıra "Başlangıç, Varış" yazın. (Örn: Gebze, Izmir). Çalıştırmak için admin girişi gerekir.
                  </p>
                  <textarea
                    className="w-full h-36 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder={`Gebze, Izmir\nAnkara, Bursa\nIstanbul, Adana`}
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                  />
                  <button
                    onClick={parseBatchInput}
                    disabled={!batchInput.trim()}
                    className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    Listeyi hazırla
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>{batchQueue.length} rota listelendi</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setBatchQueue([]);
                          setBatchInput('');
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        Temizle
                      </button>
                      <button
                        onClick={startBatchProcessing}
                        disabled={batchProcessing}
                        className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60"
                      >
                        {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Çalıştır
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden border border-slate-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="p-3">Origin</th>
                          <th className="p-3">Destination</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchQueue.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{item.origin}</td>
                            <td className="p-3 font-semibold text-slate-900">{item.destination}</td>
                            <td className="p-3">
                              {item.status === 'pending' && <span className="px-2 py-1 text-xs rounded-full bg-slate-200 text-slate-700">Bekliyor</span>}
                              {item.status === 'processing' && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Çalışıyor</span>}
                              {item.status === 'completed' && <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Tamam</span>}
                              {item.status === 'error' && <span className="px-2 py-1 text-xs rounded-full bg-rose-100 text-rose-700">Hata</span>}
                            </td>
                            <td className="p-3">
                              {item.result ? (
                                <button
                                  onClick={() => openBatchReport(item)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                                >
                                  Raporu aç
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        {analysis && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">Report</p>
                <h3 className="text-xl font-bold">Analysis result</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
                <button
                  onClick={shareToWhatsapp}
                  className="bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg hover:bg-slate-300 transition flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden min-h-[340px]">
                {mapEmbedUrl && (
                  <iframe
                    title="Google Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '340px' }}
                    src={mapEmbedUrl}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                <h4 className="font-semibold text-slate-900">Driver handoff</h4>
                <a
                  href={mapNavigationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl"
                >
                  <Navigation className="w-5 h-5" /> Open navigation
                </a>
                <button
                  onClick={shareToWhatsapp}
                  className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold py-3 px-4 rounded-xl"
                >
                  <Share2 className="w-5 h-5" /> Share to WhatsApp
                </button>
                {currentReport && (
                  <p className="text-xs text-slate-500">
                    Snapshot created at {new Date(currentReport.createdAt).toLocaleString()} | Toll preference: {tollPref ? 'Use tolls' : 'Avoid tolls'}
                  </p>
                )}
              </div>
            </div>

            <SummaryCards data={analysis.summary} weather={analysis.weather} />
            <RiskCharts intensityData={analysis.riskIntensity} typeData={analysis.riskTypes} />
            <RouteTimeline events={analysis.timeline} />
          </section>
        )}
      </main>
    </div>
  );
}
