import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  ongoing: { label: "جارية", bg: "bg-blue-100", text: "text-blue-700" },
  completed: { label: "مكتملة", bg: "bg-green-100", text: "text-green-700" },
  expired: { label: "منتهية", bg: "bg-red-100", text: "text-red-700" },
};

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    employee_id: "",
    course_name: "",
    institution: "",
    start_date: "",
    end_date: "",
    certificate_expiry: "",
    notes: "",
    certificate_file: null as File | null,
  });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => { fetchTrainings(); fetchEmployees(); }, [page, filter]);

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const params: any = { page };
      if (filter) params.status = filter;
      const res = await api.get("/trainings", { params });
      setTrainings(res.data?.data?.data || res.data?.data || []);
      setLastPage(res.data?.data?.last_page || 1);
    } catch { toast.error("خطأ في تحميل الدورات"); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data?.data || res.data?.data || []);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.employee_id || !form.course_name) {
      toast.error("الرجاء ملء الحقول المطلوبة");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("employee_id", form.employee_id);
      fd.append("course_name", form.course_name);
      if (form.institution) fd.append("institution", form.institution);
      if (form.start_date) fd.append("start_date", form.start_date);
      if (form.end_date) fd.append("end_date", form.end_date);
      if (form.certificate_expiry) fd.append("certificate_expiry", form.certificate_expiry);
      if (form.notes) fd.append("notes", form.notes);
      if (form.certificate_file) fd.append("certificate_file", form.certificate_file);
      await api.post("/trainings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("تم إضافة الدورة بنجاح");
      setShowModal(false);
      setForm({ employee_id: "", course_name: "", institution: "", start_date: "", end_date: "", certificate_expiry: "", notes: "", certificate_file: null });
      fetchTrainings();
    } catch (err: any) { toast.error(err.response?.data?.message || "حدث خطأ"); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الدورة؟")) return;
    try {
      await api.delete(`/trainings/${id}`);
      toast.success("تم الحذف بنجاح");
      fetchTrainings();
    } catch { toast.error("حدث خطأ أثناء الحذف"); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="الدورات والشهادات" />
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              {[{ v: "", l: "الكل" }, { v: "ongoing", l: "جارية" }, { v: "completed", l: "مكتملة" }, { v: "expired", l: "منتهية" }].map(f => (
                <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.v ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}>
                  {f.l}
                </button>
              ))}
            </div>
            <button onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + إضافة دورة
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : trainings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🎓</div>
              <p>لا توجد دورات مسجلة</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الموظف</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">اسم الدورة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المؤسسة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ البدء</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">انتهاء الشهادة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainings.map(t => {
                      const badge = STATUS_BADGES[t.status] || STATUS_BADGES.ongoing;
                      return (
                        <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-700">{t.employee?.name || "-"}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{t.course_name}</td>
                          <td className="px-4 py-3 text-gray-700">{t.institution || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{t.start_date || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{t.certificate_expiry || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {t.certificate_file && (
                                <a href={t.certificate_file} target="_blank" rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100">📎</a>
                              )}
                              <button onClick={() => handleDelete(t.id)}
                                className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100">حذف</button>
                            </div>
                          </td>
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
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">إضافة دورة جديدة</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                  <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">اختر موظف</option>
                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الدورة</label>
                  <input type="text" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="اسم الدورة أو البرنامج التدريبي" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المؤسسة المانحة</label>
                  <input type="text" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">انتهاء صلاحية الشهادة</label>
                  <input type="date" value={form.certificate_expiry} onChange={e => setForm({ ...form, certificate_expiry: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملف الشهادة</label>
                  <input type="file" onChange={e => setForm({ ...form, certificate_file: e.target.files?.[0] || null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" accept="image/*,.pdf" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">إضافة</button>
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
