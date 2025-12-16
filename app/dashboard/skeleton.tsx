export default function DashboardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow animate-pulse">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                    <tr>
                        <th className="p-3 text-left w-1/3">
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                        </th>
                        <th className="p-3 text-left w-1/6">
                            <div className="h-4 bg-slate-200 rounded w-16"></div>
                        </th>
                        <th className="p-3 text-left w-1/4">
                            <div className="h-4 bg-slate-200 rounded w-20"></div>
                        </th>
                        <th className="p-3 text-left w-1/6">
                            <div className="h-4 bg-slate-200 rounded w-12"></div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {[...Array(10)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="p-3">
                                <div className="h-5 bg-slate-200 rounded w-3/4 mb-1"></div>
                                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                            </td>
                            <td className="p-3">
                                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                            </td>
                            <td className="p-3">
                                <div className="h-4 bg-slate-200 rounded w-32"></div>
                            </td>
                            <td className="p-3 flex gap-2">
                                <div className="h-4 bg-slate-200 rounded w-8"></div>
                                <div className="h-4 bg-slate-200 rounded w-12"></div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
