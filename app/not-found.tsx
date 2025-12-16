import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md">
                <h1 className="text-9xl font-bold text-slate-200">404</h1>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Sayfa Bulunamadı</h2>
                    <p className="text-slate-500">
                        Aradığınız rapor veya sayfa mevcut değil ya da kaldırılmış olabilir.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                    <MoveLeft size={20} />
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
