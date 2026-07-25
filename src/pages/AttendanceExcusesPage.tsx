import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "قيد المراجعة", bg: "bg-yellow-100", text: "text-yellow-700" },
  approved: { label: "مقبول", bg: "bg-green-100", text: "text-green-700" },
  rejected: { label: "مرفوض", bg: "bg-red-100", text: "text-red-700" },
};

const TYPE_LABELS: Record<string, string> = {
  late: "متأخر",
  absence: "غياب",
  early_leave: "خروج مبكر",
};

export default function AttendanceExcusesPage() {
  const [excuses, setExcuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    date: "",
    type: "late",
    reason: "",
    attachment: null as File | null,
  });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch { return []; }
  }, []);
  const isAdmin = permissions.includes("*") || permissions.includes("requests.approve");

  useEffect(() => { fetchExcuses(); fetchEmployees(); }, [page, filter]);

  const fetchExcuses = async () => {
    setLoading(true);
    try {
      const params: any = { page };
      if (filter) params.status = filter;
      const res = await api.get("/attendance-excuses", { params });
      setExcuses(res.data?.data?.data || res.data?.data || []);
      setLastPage(res.data?.data?.last_page || 1);
    } catch { toast.error("خطأ في تحميل عروض الحضور"); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data?.data || res.data?.data || []);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.date || !form.reason) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("employee_id", form.employee_id);
      fd.append("date", form.date);
      fd.append("type", form.type);
      fd.append("reason", form.reason);
      if (form.attachment) fd.append("attachment", form.attachment);
      await api.post("/attendance-excuses", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("تم إرسال طلب العذر بنجاح");
      setShowCreateModal(false);
      setForm({ employee_id: "", date: "", type: "late", reason: "", attachment: null });
      fetchExcuses();
    } catch (err: any) { toast.error(err.response?.data?.message || "حدث خطأ"); }
  };

  const handleReview = async () => {
    if (!reviewId) return;
    try {
      await api.post(`/attendance-excuses/${reviewId}/review`, { status: reviewStatus, admin_note: reviewNote });
      toast.success("تمت المراجعة بنجاح");
      setShowReviewModal(false);
      fetchExcuses();
    } catch (err: any) { toast.error(err.response?.data?.message || "حدث خطأ"); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="عروض الحضور والغياب" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {[{ v: "", l: "الكل" }, { v: "pending", l: "قيد المراجعة" }, { v: "approved", l: "مقبول" }, { v: "rejected", l: "مرفوض" }].map(f => (
                <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.v ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}>
                  {f.l}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + طلب عذر جديد
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الموظف</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">النوع</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">السبب</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">المرفق</th>
                    {isAdmin && <th className="px-4 py-3 text-center font-medium text-gray-600">إجراء</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">جاري التحميل...</td></tr>
                  ) : excuses.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">لا توجد عروض حضور</td></tr>
                  ) : excuses.map(ex => {
                    const badge = STATUS_BADGES[ex.status] || STATUS_BADGES.pending;
                    return (
                      <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700">{ex.date}</td>
                        <td className="px-4 py-3 text-gray-700">{ex.employee?.name || "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{TYPE_LABELS[ex.type] || ex.type}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{ex.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {ex.attachment ? (
                            <a href={ex.attachment} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">📎 تحميل</a>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            {ex.status === "pending" && (
                              <button onClick={() => { setReviewId(ex.id); setShowReviewModal(true); }}
                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                                مراجعة
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-100">السابق</button>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${page === p ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-100"}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page >= lastPage}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-100">التالي</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">طلب عذر جديد</h2>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="late">متأخر</option>
                      <option value="absence">غياب</option>
                      <option value="early_leave">خروج مبكر</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السبب</label>
                  <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="اكتب سبب العذر..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مرفق (اختياري)</label>
                  <input type="file" onChange={e => setForm({ ...form, attachment: e.target.files?.[0] || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" accept="image/*,.pdf" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">إرسال الطلب</button>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">مراجعة العذر</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القرار</label>
                  <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="approved">مقبول</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة (اختياري)</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleReview} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">تأكيد</button>
                <button onClick={() => setShowReviewModal(false)} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
