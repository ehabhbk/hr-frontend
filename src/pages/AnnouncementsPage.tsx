import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const PRIORITY_MAP: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "منخفضة", bg: "bg-gray-100", text: "text-gray-600" },
  normal: { label: "عادية", bg: "bg-blue-100", text: "text-blue-700" },
  high: { label: "عالية", bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { label: "عاجلة", bg: "bg-red-100", text: "text-red-700" },
};

const TARGET_OPTIONS = [
  { value: "all", label: "الجميع" },
  { value: "department", label: "القسم" },
  { value: "specific", label: "موظفين محددين" },
];

const emptyForm = {
  title: "",
  body: "",
  priority: "normal",
  target: "all",
  department_id: "",
  employee_ids: [] as string[],
  publish_at: "",
  expire_at: "",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch {
      return [];
    }
  }, []);

  const isAdmin = permissions.includes("*") || permissions.includes("announcements.manage");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get("/announcements");
      setAnnouncements(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      toast.error("خطأ في تحميل الإعلانات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (ann: any) => {
    setEditId(ann.id);
    setForm({
      title: ann.title || "",
      body: ann.body || "",
      priority: ann.priority || "normal",
      target: ann.target || "all",
      department_id: ann.department_id || "",
      employee_ids: ann.employee_ids || [],
      publish_at: ann.publish_at ? ann.publish_at.slice(0, 16) : "",
      expire_at: ann.expire_at ? ann.expire_at.slice(0, 16) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("الرجاء ملء العنوان والمحتوى");
      return;
    }
    try {
      const payload: any = {
        title: form.title,
        body: form.body,
        priority: form.priority,
        target: form.target,
        department_id: form.department_id || null,
        employee_ids: form.employee_ids,
        publish_at: form.publish_at || null,
        expire_at: form.expire_at || null,
      };

      if (editId) {
        await api.put(`/announcements/${editId}`, payload);
        toast.success("تم تحديث الإعلان بنجاح");
      } else {
        await api.post("/announcements", payload);
        toast.success("تم إنشاء الإعلان بنجاح");
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success("تم الحذف بنجاح");
      fetchAnnouncements();
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="الإعلانات الداخلية" />
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">{announcements.length} إعلان</p>
            {isAdmin && (
              <button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + إعلان جديد
              </button>
            )}
          </div>

          {/* Cards */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📢</div>
              <p>لا توجد إعلانات حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((ann) => {
                const priority = PRIORITY_MAP[ann.priority] || PRIORITY_MAP.normal;
                return (
                  <div
                    key={ann.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-bold text-gray-800 leading-relaxed">{ann.title}</h3>
                      <span className={`shrink-0 mr-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {ann.body}
                    </p>

                    <div className="border-t border-gray-100 pt-3 mt-auto space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>بواسطة: {ann.created_by_name || ann.user?.name || "-"}</span>
                        <span>{formatDate(ann.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>الهدف: {TARGET_OPTIONS.find((t) => t.value === ann.target)?.label || ann.target}</span>
                        {ann.expire_at && <span>ينتهي: {formatDate(ann.expire_at)}</span>}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => openEditModal(ann)}
                          className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">{editId ? "تعديل الإعلان" : "إعلان جديد"}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="عنوان الإعلان"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى</label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="نص الإعلان..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الهدف</label>
                    <select
                      value={form.target}
                      onChange={(e) => setForm({ ...form, target: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {TARGET_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النشر</label>
                    <input
                      type="datetime-local"
                      value={form.publish_at}
                      onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="datetime-local"
                      value={form.expire_at}
                      onChange={(e) => setForm({ ...form, expire_at: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {editId ? "تحديث" : "نشر الإعلان"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
