import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const TYPE_OPTIONS = [
  { value: "termination", label: "إنهاء خدمة" },
  { value: "resignation", label: "استقالة" },
  { value: "retirement", label: "تقاعد" },
];

const STATUS_OPTIONS = [
  { value: "in_progress", label: "قيد التنفيذ", bg: "bg-yellow-100", text: "text-yellow-700" },
  { value: "completed", label: "مكتمل", bg: "bg-green-100", text: "text-green-700" },
];

export default function OffboardingPage() {
  const [offboardings, setOffboardings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [form, setForm] = useState({
    employee_id: "",
    type: "resignation",
    last_working_date: "",
    reason: "",
  });

  useEffect(() => { fetchOffboardings(); fetchEmployees(); }, []);

  const fetchOffboardings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/offboardings");
      setOffboardings(res.data?.data?.data || res.data?.data || []);
    } catch { toast.error("خطأ في تحميل سجلات الخروج"); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data?.data || res.data?.data || []);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.last_working_date) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      await api.post("/offboardings", form);
      toast.success("تم إنشاء سير الخروج بنجاح");
      setShowModal(false);
      setForm({ employee_id: "", type: "resignation", last_working_date: "", reason: "" });
      fetchOffboardings();
    } catch (err: any) { toast.error(err.response?.data?.message || "حدث خطأ"); }
  };

  const toggleChecklist = async (item: any, key: string) => {
    try {
      const updated = { ...item.checklist, [key]: !item.checklist[key] };
      await api.put(`/offboardings/${item.id}`, { checklist: updated });
      fetchOffboardings();
    } catch { toast.error("خطأ في التحديث"); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="سير خروج الموظفين" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">{offboardings.length} سجل</p>
            <button onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + سير خروج جديد
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : offboardings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📋</div>
              <p>لا توجد سجلات خروج</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offboardings.map(item => {
                const statusOpt = STATUS_OPTIONS.find(s => s.value === item.status) || STATUS_OPTIONS[0];
                const checklist = item.checklist || {};
                const completedCount = Object.values(checklist).filter(Boolean).length;
                const totalCount = Object.keys(checklist).length;
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-800">{item.employee?.name || "—"}</h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOpt.bg} ${statusOpt.text}`}>{statusOpt.label}</span>
                    </div>
                    <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                      <p>النوع: {TYPE_OPTIONS.find(t => t.value === item.type)?.label || item.type}</p>
                      <p>آخر يوم عمل: {item.last_working_date}</p>
                      {item.reason && <p>السبب: {item.reason}</p>}
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>قائمة المهام</span>
                        <span>{completedCount}/{totalCount} مكتمل</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <button onClick={() => setDetailItem(detailItem?.id === item.id ? null : item)}
                      className="w-full mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                      {detailItem?.id === item.id ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                    </button>
                    {detailItem?.id === item.id && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        {Object.entries(checklist).map(([key, val]) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={!!val} onChange={() => toggleChecklist(item, key)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            {key}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">سير خروج جديد</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                  <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">اختر موظف</option>
                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخروج</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">آخر يوم عمل</label>
                    <input type="date" value={form.last_working_date} onChange={e => setForm({ ...form, last_working_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
                  <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">إنشاء</button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
