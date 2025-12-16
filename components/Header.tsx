"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { LogOut, ChevronDown, User } from "lucide-react";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Hidden on public routes, landing page, and auth pages
    const isHidden =
        pathname === "/" ||
        pathname.startsWith("/r/") ||
        pathname.startsWith("/login");

    useEffect(() => {
        if (isHidden) return;

        const getUser = async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserEmail(user.email ?? null);
        };
        getUser();
    }, [isHidden]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/");
    };

    if (isHidden) return null;

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo / Brand */}
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            S
                        </div>
                        <span className="text-lg font-bold text-slate-900 tracking-tight">Sürüş Güvenliği</span>
                    </Link>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        {/* Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                                    <img
                                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                    {userEmail && (
                                        <div className="px-4 py-3 border-b border-slate-100 mb-1">
                                            <p className="text-xs text-slate-500 font-medium">Giriş yapıldı</p>
                                            <p className="text-sm font-semibold text-slate-900 truncate" title={userEmail}>
                                                {userEmail}
                                            </p>
                                        </div>
                                    )}

                                    <Link href="/dashboard" className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors">
                                        Dashboard
                                    </Link>

                                    <div className="my-1 border-t border-slate-100"></div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Çıkış Yap
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
