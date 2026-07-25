import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const ACTION_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  created: { label: "إنشاء", bg: "bg-green-100", text: "text-green-700" },
  updated: { label: "تعديل", bg: "bg-blue-100", text: "text-blue-700" },
  deleted: { label: "حذف", bg: "bg-red-100", text: "text-red-700" },
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    from_date: "",
    to_date: "",
    page: 1,
  });
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    fetchActions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters.page, filters.action]);

  const fetchActions = async () => {
    try {
      const res = await api.get("/activity-logs/actions");
      setActions(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page: filters.page };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await api.get("/activity-logs", { params });
      const data = res.data;
      setLogs(data?.data?.data || data?.data || []);
      setLastPage(data?.data?.last_page || data?.last_page || 1);
    } catch (err) {
      toast.error("خطأ في تحميل سجل النشاطات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchLogs();
  };

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getBadge = (action: string) => {
    const normalized = action.toLowerCase();
    if (normalized.includes("create") || normalized.includes("إنشاء")) return ACTION_BADGES.created;
    if (normalized.includes("update") || normalized.includes("تعديل")) return ACTION_BADGES.updated;
    if (normalized.includes("delete") || normalized.includes("حذف")) return ACTION_BADGES.deleted;
    return { label: action, bg: "bg-gray-100", text: "text-gray-700" };
  };

  const renderJson = (obj: any) => {
    if (!obj) return <span className="text-gray-400">-</span>;
    try {
      const formatted = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
      return (
        <pre className="text-xs bg-gray-50 p-2 rounded max-h-60 overflow-auto whitespace-pre-wrap" dir="ltr">
          {formatted}
        </pre>
      );
    } catch {
      return <span className="text-gray-400">-</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="سجل النشاطات" />
        <div className="p-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بحث</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="بحث في الوصف..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الإجراء</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">الكل</option>
                  {actions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">المستخدم</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراء</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الوصف</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        جاري التحميل...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        لا توجد سجلات نشاط
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const badge = getBadge(log.action);
                      return (
                        <React.Fragment key={log.id}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString("ar-EG") : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {log.user?.name || log.causer?.name || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                              {log.description || log.subject_type?.split("\\").pop() || "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(log.properties || log.old_values || log.new_values) && (
                                <button
                                  onClick={() => toggleRow(log.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  {expandedRow === log.id ? "إخفاء" : "عرض"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedRow === log.id && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">القيم القديمة</h4>
                                    {renderJson(log.old_values || log.properties?.old)}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">القيم الجديدة</h4>
                                    {renderJson(log.new_values || log.properties?.new)}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={filters.page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  السابق
                </button>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      filters.page === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(lastPage, prev.page + 1) }))}
                  disabled={filters.page >= lastPage}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
