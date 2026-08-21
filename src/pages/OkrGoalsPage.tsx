import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface OkrGoal {
  id: number;
  title: string;
  description: string;
  type: "employee" | "department";
  employee_id: number | null;
  employee_name?: string;
  department_id: number | null;
  department_name?: string;
  period_start: string;
  period_end: string;
  target_value: number;
  current_value: number;
  status: "on_track" | "at_risk" | "completed" | "missed";
}

interface Employee {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

const statusLabels: Record<string, string> = {
  on_track: "في المسار",
  at_risk: "تحت المخاطرة",
  completed: "مكتمل",
  missed: "فائت",
};

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-orange-100 text-orange-700",
  completed: "bg-blue-100 text-blue-700",
  missed: "bg-red-100 text-red-700",
};

const emptyForm: Partial<OkrGoal> = {
  title: "",
  description: "",
  type: "employee",
  employee_id: null,
  department_id: null,
  period_start: "",
  period_end: "",
  target_value: 0,
  current_value: 0,
  status: "on_track",
};

export default function OkrGoalsPage() {
  const [goals, setGoals] = useState<OkrGoal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<OkrGoal | null>(null);
  const [form, setForm] = useState<Partial<OkrGoal>>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchGoals();
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get("/okr-goals");
      setGoals(res.data.data || res.data || []);
    } catch {
      toast.error("خطأ في تحميل الأهداف");
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

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data.data || res.data || []);
    } catch {}
  };

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleOpenEdit = (goal: OkrGoal) => {
    setEditingGoal(goal);
    setForm({ ...goal });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "target_value" || name === "current_value" || name === "employee_id" || name === "department_id"
        ? Number(value) || null
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await api.put(`/okr-goals/${editingGoal.id}`, form);
        toast.success("تم تحديث الهدف");
      } else {
        await api.post("/okr-goals", form);
        toast.success("تم إنشاء الهدف");
      }
      handleCloseModal();
      fetchGoals();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`/okr-goals/${id}`);
      toast.success("تم حذف الهدف");
      fetchGoals();
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const getProgress = (goal: OkrGoal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100);
  };

  const filtered = goals.filter((g) => {
    const matchSearch =
      g.title?.includes(searchTerm) ||
      g.employee_name?.includes(searchTerm) ||
      g.department_name?.includes(searchTerm);
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col md:mr-64 mr-0">
        <Topbar title="🎯 أهداف OKR" />
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
                <option value="on_track">في المسار</option>
                <option value="at_risk">تحت المخاطرة</option>
                <option value="completed">مكتمل</option>
                <option value="missed">فائت</option>
              </select>
            </div>
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-800 hover:bg-indigo-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + إضافة هدف جديد
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="text-5xl mb-4">🎯</div>
                <p>لا توجد أهداف</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right">العنوان</th>
                      <th className="px-4 py-3 text-right">النوع</th>
                      <th className="px-4 py-3 text-right">القيمة المستهدفة</th>
                      <th className="px-4 py-3 text-right">القيمة الحالية</th>
                      <th className="px-4 py-3 text-right">التقدم</th>
                      <th className="px-4 py-3 text-right">الحالة</th>
                      <th className="px-4 py-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((goal) => {
                      const progress = getProgress(goal);
                      return (
                        <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{goal.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {goal.type === "employee" ? goal.employee_name : goal.department_name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {goal.type === "employee" ? "موظف" : "قسم"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{goal.target_value}</td>
                          <td className="px-4 py-3 font-medium">{goal.current_value}</td>
                          <td className="px-4 py-3 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${
                                    progress >= 100
                                      ? "bg-green-500"
                                      : progress >= 60
                                      ? "bg-blue-500"
                                      : progress >= 30
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-9 text-left">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[goal.status]}`}>
                              {statusLabels[goal.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEdit(goal)}
                                className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDelete(goal.id)}
                                className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                {editingGoal ? "تعديل الهدف" : "إضافة هدف جديد"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                  <select
                    name="type"
                    value={form.type || "employee"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="employee">موظف</option>
                    <option value="department">قسم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    name="status"
                    value={form.status || "on_track"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="on_track">في المسار</option>
                    <option value="at_risk">تحت المخاطرة</option>
                    <option value="completed">مكتمل</option>
                    <option value="missed">فائت</option>
                  </select>
                </div>
              </div>
              {form.type === "employee" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                  <select
                    name="employee_id"
                    value={form.employee_id || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر موظف</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                  <select
                    name="department_id"
                    value={form.department_id || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر قسم</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>{dep.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">فترة البداية</label>
                  <input
                    type="date"
                    name="period_start"
                    value={form.period_start || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">فترة النهاية</label>
                  <input
                    type="date"
                    name="period_end"
                    value={form.period_end || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القيمة المستهدفة</label>
                  <input
                    type="number"
                    name="target_value"
                    value={form.target_value || ""}
                    onChange={handleChange}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القيمة الحالية</label>
                  <input
                    type="number"
                    name="current_value"
                    value={form.current_value || ""}
                    onChange={handleChange}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-800 text-white rounded-lg text-sm font-medium hover:bg-indigo-900">
                  {editingGoal ? "تحديث" : "إضافة"}
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
