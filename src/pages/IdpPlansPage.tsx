import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface IdpPlan {
  id: number;
  employee_id: number;
  employee_name?: string;
  title: string;
  description: string;
  skill_area: string;
  start_date: string;
  target_date: string;
  status: "active" | "completed" | "cancelled";
  progress: number;
  notes: string;
}

interface Employee {
  id: number;
  name: string;
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const emptyForm: Partial<IdpPlan> = {
  employee_id: 0,
  title: "",
  description: "",
  skill_area: "",
  start_date: "",
  target_date: "",
  status: "active",
  progress: 0,
  notes: "",
};

export default function IdpPlansPage() {
  const [plans, setPlans] = useState<IdpPlan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IdpPlan | null>(null);
  const [form, setForm] = useState<Partial<IdpPlan>>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPlans();
    fetchEmployees();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get("/idp-plans");
      setPlans(res.data.data || res.data || []);
    } catch {
      toast.error("خطأ في تحميل خطط التطوير");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data.data || res.data || []);
    } catch {}
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleOpenEdit = (plan: IdpPlan) => {
    setEditingPlan(plan);
    setForm({ ...plan });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "progress" || name === "employee_id" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.put(`/idp-plans/${editingPlan.id}`, form);
        toast.success("تم تحديث خطة التطوير");
      } else {
        await api.post("/idp-plans", form);
        toast.success("تم إنشاء خطة التطوير");
      }
      handleCloseModal();
      fetchPlans();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`/idp-plans/${id}`);
      toast.success("تم حذف الخطة");
      fetchPlans();
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const filtered = plans.filter((p) => {
    const matchesSearch =
      p.title?.includes(searchTerm) ||
      p.employee_name?.includes(searchTerm) ||
      p.skill_area?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col md:mr-64 mr-0">
        <Topbar title="📋 خطط التطوير الفردية" />
        <div className="mt-16 md:mt-4 px-4 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-800 hover:bg-indigo-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + إضافة خطة جديدة
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="text-5xl mb-4">📋</div>
                <p>لا توجد خطط تطوير</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right">الموظف</th>
                      <th className="px-4 py-3 text-right">العنوان</th>
                      <th className="px-4 py-3 text-right">مجال المهارة</th>
                      <th className="px-4 py-3 text-right">التاريخ</th>
                      <th className="px-4 py-3 text-right">التقدم</th>
                      <th className="px-4 py-3 text-right">الحالة</th>
                      <th className="px-4 py-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{plan.employee_name || plan.employee_id}</td>
                        <td className="px-4 py-3">{plan.title}</td>
                        <td className="px-4 py-3">{plan.skill_area}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {plan.start_date} → {plan.target_date}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${
                                  plan.progress >= 100
                                    ? "bg-green-500"
                                    : plan.progress >= 50
                                    ? "bg-blue-500"
                                    : "bg-yellow-500"
                                }`}
                                style={{ width: `${Math.min(plan.progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-9 text-left">{plan.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status]}`}>
                            {statusLabels[plan.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                {editingPlan ? "تعديل خطة التطوير" : "إضافة خطة تطوير جديدة"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                <select
                  name="employee_id"
                  value={form.employee_id || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">اختر موظف</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  name="title"
                  value={form.title || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  name="description"
                  value={form.description || ""}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مجال المهارة</label>
                <input
                  name="skill_area"
                  value={form.skill_area || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الهدف</label>
                  <input
                    type="date"
                    name="target_date"
                    value={form.target_date || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    name="status"
                    value={form.status || "active"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">نشط</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نسبة التقدم ({form.progress || 0}%)</label>
                  <input
                    type="range"
                    name="progress"
                    min={0}
                    max={100}
                    value={form.progress || 0}
                    onChange={handleChange}
                    className="w-full mt-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  name="notes"
                  value={form.notes || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-800 text-white rounded-lg text-sm font-medium hover:bg-indigo-900">
                  {editingPlan ? "تحديث" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
