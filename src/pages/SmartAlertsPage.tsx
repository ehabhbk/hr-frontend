import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface SmartAlert {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  created_at: string;
}

const severityLabels: Record<string, string> = {
  info: "معلومات",
  warning: "تحذير",
  critical: "حرج",
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 border-blue-200",
  warning: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

const severityBg: Record<string, string> = {
  info: "border-r-blue-500",
  warning: "border-r-orange-500",
  critical: "border-r-red-500",
};

export default function SmartAlertsPage() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/smart-alerts");
      setAlerts(res.data.data || res.data || []);
    } catch {
      toast.error("خطأ في تحميل التنبيهات");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      await api.post("/smart-alerts/generate");
      toast.success("تم توليد التنبيهات");
      fetchAlerts();
    } catch {
      toast.error("خطأ في توليد التنبيهات");
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/smart-alerts/${id}/read`);
      fetchAlerts();
    } catch {
      toast.error("خطأ");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/smart-alerts/read-all");
      toast.success("تم وضع علامة مقروء على الكل");
      fetchAlerts();
    } catch {
      toast.error("خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`/smart-alerts/${id}`);
      toast.success("تم حذف التنبيه");
      fetchAlerts();
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const filtered = alerts.filter((a) => {
    const matchSeverity = severityFilter === "all" || a.severity === severityFilter;
    const matchRead =
      readFilter === "all" ||
      (readFilter === "read" && a.is_read) ||
      (readFilter === "unread" && !a.is_read);
    return matchSeverity && matchRead;
  });

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col md:mr-64 mr-0">
        <Topbar title="🔔 التنبيهات الذكية" />
        <div className="mt-16 md:mt-4 px-4 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">كل الشدة</option>
                <option value="info">معلومات</option>
                <option value="warning">تحذير</option>
                <option value="critical">حرج</option>
              </select>
              <select
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">الكل</option>
                <option value="unread">غير مقروءة</option>
                <option value="read">مقروءة</option>
              </select>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ✓ قراءة الكل
              </button>
              <button
                onClick={handleGenerate}
                className="bg-indigo-800 hover:bg-indigo-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🔄 توليد تنبيهات
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
              <div className="text-5xl mb-4">🔔</div>
              <p>لا توجد تنبيهات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-white rounded-xl shadow-sm border-r-4 p-5 transition-all hover:shadow-md ${
                    severityBg[alert.severity]
                  } ${alert.is_read ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {!alert.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        <h4 className="font-bold text-gray-800 text-sm">{alert.title}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors[alert.severity]}`}>
                          {severityLabels[alert.severity]}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mb-2">{alert.message}</p>
                      <span className="text-gray-400 text-xs">
                        {alert.created_at ? new Date(alert.created_at).toLocaleString("ar-EG") : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          ✓ قراءة
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
