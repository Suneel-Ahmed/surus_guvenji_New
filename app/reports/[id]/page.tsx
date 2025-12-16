"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation, Share2, Printer, Link as LinkIcon } from "lucide-react";
import { authFetch } from "@/lib/apiClient";
import { SummaryCards } from "@/components/SummaryCards";
import { RiskCharts } from "@/components/RiskCharts";
import { RouteTimeline } from "@/components/RouteTimeline";
import type { RouteAnalysis } from "@/types";
import { toast } from "sonner";

type ReportDetail = {
  id: string;
  public_slug: string;
  origin_city: string;
  origin_county: string;
  destination_city: string;
  destination_county: string;
  status: string;
  analysis: RouteAnalysis;
};

export default function OperatorReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (isPolling = false) => {
    if (!id) return;
    if (!isPolling) setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/reports/${id}`);
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Rapor alınamadı");
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
  }, [id]);

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

  const publicLink = report
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/r/${report.public_slug}`
    : "";

  const navigationUrl = report
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      originLabel
    )}&destination=${encodeURIComponent(destLabel)}&travelmode=driving`
    : "";

  const shareWhatsapp = () => {
    if (!report) return;
    const text = `Rapor: ${originLabel} -> ${destLabel}\n${publicLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyLink = async () => {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    toast.success("Bağlantı kopyalandı");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Operatör Görünümü</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {report ? `${originLabel} → ${destLabel}` : "Rapor"}
            </h1>
            {report && <p className="text-sm text-slate-500">Durum: {report.status}</p>}
          </div>
        </div>

        {loading && <div className="text-sm text-slate-500">Yükleniyor...</div>}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

        {report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden min-h-[340px]">
                {mapEmbedUrl && (
                  <iframe
                    title="Google Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "340px" }}
                    src={mapEmbedUrl}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                <h4 className="font-semibold text-slate-900">Paylaşım</h4>
                <button
                  onClick={() => window.open(navigationUrl, "_blank")}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl"
                >
                  <Navigation className="w-4 h-4" /> Navigasyonu Aç
                </button>
                <button
                  onClick={shareWhatsapp}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-xl"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp ile Paylaş
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-2.5 px-4 rounded-xl"
                >
                  <LinkIcon className="w-4 h-4" /> Bağlantıyı Kopyala
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl"
                >
                  <Printer className="w-4 h-4" /> Yazdır / PDF
                </button>
                <p className="text-xs text-slate-500">Bu kontroller yalnızca operatör için görünür.</p>
              </div>
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
