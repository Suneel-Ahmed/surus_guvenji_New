"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "lucide-react";
import { SummaryCards } from "@/components/SummaryCards";
import { RiskCharts } from "@/components/RiskCharts";
import { RouteTimeline } from "@/components/RouteTimeline";
import type { RouteAnalysis } from "@/types";

type PublicReport = {
  id: string;
  public_slug: string;
  origin_city: string;
  origin_county: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_city: string;
  destination_county: string;
  destination_lat?: number;
  destination_lng?: number;
  analysis: RouteAnalysis;
  status: string;
};

export default function PublicReportPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;

  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (isPolling = false) => {
    if (!slug) return;
    if (!isPolling) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}`);

      if (res.status === 404) {
        router.push("/not-found");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Rapor bulunamadı");
        setLoading(false);
        return;
      }
      const json = await res.json();

      setReport(json.report);
    } catch (err) {
      console.error(err);
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [slug]);

  useEffect(() => {
    if (report && (report.status === 'processing' || report.status === 'pending' || report.status === 'creating')) {
      const timer = setTimeout(() => fetchReport(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [report]);

  const originLabel = report ? `${report.origin_city}${report.origin_county ? ", " + report.origin_county : ""}` : "";
  const destLabel = report
    ? `${report.destination_city}${report.destination_county ? ", " + report.destination_county : ""}`
    : "";
  const mapEmbedUrl =
    report && report.analysis
      ? `https://maps.google.com/maps?saddr=${encodeURIComponent(originLabel)}&daddr=${encodeURIComponent(
        destLabel
      )}&dirflg=d&t=m&z=7&output=embed`
      : null;

  const navigationUrl = report
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      originLabel
    )}&destination=${encodeURIComponent(destLabel)}&travelmode=driving`
    : "";



  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Sürücü Görünümü</p>
            <h1 className="text-2xl font-bold text-slate-900">{report ? `${originLabel} → ${destLabel}` : "Rapor"}</h1>
          </div>

          {report && (
            <button
              onClick={() => window.open(navigationUrl, "_blank")}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-colors"
            >
              <Navigation className="w-4 h-4" /> Navigasyonu Aç
            </button>
          )}
        </div>

        {loading && <div className="text-sm text-slate-500">Yükleniyor...</div>}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

        {report && (
          <div className="space-y-6">
            <div className="bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden min-h-[360px]">
              {mapEmbedUrl && (
                <iframe
                  title="Google Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "360px" }}
                  src={mapEmbedUrl}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              )}
            </div>

            {report.analysis && (
              <>
                <SummaryCards data={report.analysis.summary} weather={report.analysis.weather} />
                <RiskCharts intensityData={report.analysis.riskIntensity} typeData={report.analysis.riskTypes} />
                <RouteTimeline events={report.analysis.timeline} />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
