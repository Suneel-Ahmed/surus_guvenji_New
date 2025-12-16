"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/apiClient";

type FieldErrors = {
  originCity?: string;
  destinationCity?: string;
  originLat?: string;
  originLng?: string;
  destLat?: string;
  destLng?: string;
};

export default function NewReportPage() {
  const [originCity, setOriginCity] = useState("");
  const [originCounty, setOriginCounty] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCounty, setDestinationCounty] = useState("");
  const [departureTime, setDepartureTime] = useState("");

  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [useTolls, setUseTolls] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: FieldErrors = {};

    // Required cities
    if (!originCity.trim()) {
      errors.originCity = "Origin city is required";
    }

    if (!destinationCity.trim()) {
      errors.destinationCity = "Destination city is required";
    }

    // Coordinate pair validation
    const hasOriginLat = originLat !== "";
    const hasOriginLng = originLng !== "";
    const hasDestLat = destLat !== "";
    const hasDestLng = destLng !== "";

    if (hasOriginLat !== hasOriginLng) {
      errors.originLat = "Both Lat & Lng required";
      errors.originLng = "Both Lat & Lng required";
    }

    if (hasDestLat !== hasDestLng) {
      errors.destLat = "Both Lat & Lng required";
      errors.destLng = "Both Lat & Lng required";
    }

    const oLat = hasOriginLat ? parseFloat(originLat) : null;
    const oLng = hasOriginLng ? parseFloat(originLng) : null;
    const dLat = hasDestLat ? parseFloat(destLat) : null;
    const dLng = hasDestLng ? parseFloat(destLng) : null;

    if (oLat !== null && (oLat < -90 || oLat > 90)) {
      errors.originLat = "Lat must be -90 to 90";
    }

    if (oLng !== null && (oLng < -180 || oLng > 180)) {
      errors.originLng = "Lng must be -180 to 180";
    }

    if (dLat !== null && (dLat < -90 || dLat > 90)) {
      errors.destLat = "Lat must be -90 to 90";
    }

    if (dLng !== null && (dLng < -180 || dLng > 180)) {
      errors.destLng = "Lng must be -180 to 180";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const res = await authFetch("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        originCity: originCity.trim(),
        originCounty: originCounty.trim() || null,
        originLat: oLat ?? undefined,
        originLng: oLng ?? undefined,
        destinationCity: destinationCity.trim(),
        destinationCounty: destinationCounty.trim() || null,
        destinationLat: dLat ?? undefined,
        destinationLng: dLng ?? undefined,
        departureTime: departureTime || null,
        useTolls
      })
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Rapor oluşturulamadı");
      setLoading(false);
      return;
    }

    const json = await res.json();
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setResultLink(`${base}/r/${json.publicSlug}`);
    setLoading(false);
  };

  const ErrorText = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-xs text-rose-600 mt-1">{msg}</p> : null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Rapor</p>
            <h1 className="text-2xl font-bold text-slate-900">Yeni Rapor Oluştur</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">Origin City</label>
              <input
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className={`w-full rounded-xl border px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 ${fieldErrors.originCity ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:ring-blue-500"
                  }`}
                placeholder="İzmir"
              />
              <ErrorText msg={fieldErrors.originCity} />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-slate-500 font-semibold">Origin County</label>
              <input
                value={originCounty}
                onChange={(e) => setOriginCounty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Konak"
              />
            </div>

            <div>
              <label className="text-xs uppercase text-slate-500 font-semibold">Destination City</label>
              <input
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                className={`w-full rounded-xl border px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 ${fieldErrors.destinationCity ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 focus:ring-blue-500"
                  }`}
                placeholder="Ankara"
              />
              <ErrorText msg={fieldErrors.destinationCity} />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-slate-500 font-semibold">Destination County</label>
              <input
                value={destinationCounty}
                onChange={(e) => setDestinationCounty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Çankaya"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase text-slate-500 font-semibold">Departure Time (optional)</label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {showAdvanced ? "▼ Gelişmiş Seçenekleri Gizle" : "▶ Gelişmiş: Manuel Koordinatlar"}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs uppercase text-slate-500 font-semibold">Origin Lat</label>
                  <input
                    type="number" step="any"
                    value={originLat}
                    onChange={(e) => setOriginLat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm"
                    placeholder="38.4237"
                  />
                  <ErrorText msg={fieldErrors.originLat} />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 font-semibold">Origin Lng</label>
                  <input
                    type="number" step="any"
                    value={originLng}
                    onChange={(e) => setOriginLng(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm"
                    placeholder="27.1428"
                  />
                  <ErrorText msg={fieldErrors.originLng} />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 font-semibold">Destination Lat</label>
                  <input
                    type="number" step="any"
                    value={destLat}
                    onChange={(e) => setDestLat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm"
                    placeholder="39.9334"
                  />
                  <ErrorText msg={fieldErrors.destLat} />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500 font-semibold">Destination Lng</label>
                  <input
                    type="number" step="any"
                    value={destLng}
                    onChange={(e) => setDestLng(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 text-sm"
                    placeholder="32.8597"
                  />
                  <ErrorText msg={fieldErrors.destLng} />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer select-none">
            <div className={`w-12 h-6 rounded-full p-1 transition-all ${useTolls ? "bg-blue-500" : "bg-slate-300"}`}>
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition ${useTolls ? "translate-x-6" : "translate-x-0"}`}
              />
            </div>
            Ücretli yolları kullan
            <input type="checkbox" className="hidden" checked={useTolls} onChange={(e) => setUseTolls(e.target.checked)} />
          </label>

          {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
          {resultLink && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Rapor hazır. Paylaş:{" "}
              <a className="underline font-semibold" href={resultLink} target="_blank" rel="noreferrer">
                {resultLink}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition disabled:opacity-70"
          >
            {loading ? "Oluşturuluyor..." : "Rapor Oluştur"}
          </button>
        </form>
      </div>
    </main>
  );
}
