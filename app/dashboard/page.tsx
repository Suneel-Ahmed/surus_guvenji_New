"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { LogOut, ChevronDown, User } from "lucide-react";
import { toast } from "sonner";
import DashboardSkeleton from "./skeleton";

type ReportListItem = {
  id: string;
  public_slug: string;
  origin_city: string;
  destination_city: string;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const copyLink = async (slug: string) => {
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${base}/r/${slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Bağlantı kopyalandı");
  };

  const fetchReports = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    setError(null);
    try {
      // Add cache: 'no-store' to prevent caching stale data
      const res = await authFetch("/api/reports", { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "Raporlar alınamadı");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setReports(json.reports || []);
    } catch (err) {
      console.error(err);
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    fetchReports();

    // Fetch user email
    const getUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    };
    getUser();
  }, []);

  // useEffect(() => {
  //   // // Check if any report is in a processing state
  //   // const processing = reports.some(r => ['processing', 'pending', 'creating'].includes(r.status));
  //   // if (processing) {
  //   //   // Polling every 3 seconds
  //   //   const timer = setTimeout(() => fetchReports(true), 3000);
  //   //   return () => clearTimeout(timer);
  //   // }
  //   fetchReports()
  // }, [reports]);



  const processingCount = reports.filter(r => ['processing', 'pending', 'creating'].includes(r.status)).length;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-900">Raporlar</h1>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/reports/new" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
              Rapor Oluştur
            </Link>
            <Link href="/reports/batch" className="border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl text-slate-800 font-semibold text-sm transition-colors">
              CSV Yükle
            </Link>


          </div>
        </header>
        {/* 
        {processingCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-800">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="font-medium">
              {processingCount} rapor işleniyor... Lütfen bekleyin, liste otomatik güncellenecektir.
            </span>
          </div>
        )} */}

        {loading && !reports.length && <DashboardSkeleton />}

        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

        {!loading && !reports.length && !error && <div className="text-sm text-slate-500">Henüz rapor yok.</div>}

        {reports.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Rota</th>
                  <th className="p-3 text-left">Durum</th>
                  <th className="p-3 text-left">Tarih</th>
                  <th className="p-3 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">
                      {r.origin_city} → {r.destination_city}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{new Date(r.created_at).toLocaleString("tr-TR")}</td>
                    <td className="p-3 flex gap-2">
                      <Link href={`/reports/${r.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                        Aç
                      </Link>
                      <button
                        onClick={() => copyLink(r.public_slug)}
                        className="text-slate-600 hover:text-slate-900 text-xs font-semibold"
                      >
                        Kopyala
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

