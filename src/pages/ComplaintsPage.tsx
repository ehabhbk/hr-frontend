import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface Employee {
  id: number;
  name: string;
}

interface Complaint {
  id: number;
  employee_id: number;
  employee?: Employee;
  type: "complaint" | "suggestion";
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  response: string | null;
  assigned_to: string | null;
}

const statusLabels: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const typeLabels: Record<string, string> = {
  complaint: "شكوى",
  suggestion: "اقتراح",
};

const typeColors: Record<string, string> = {
  complaint: "bg-red-100 text-red-800",
  suggestion: "bg-purple-100 text-purple-800",
};

const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    type: "complaint",
    subject: "",
    description: "",
    status: "open",
    response: "",
    assigned_to: "",
  });

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get("/complaints");
      setComplaints(res.data.data || res.data);
    } catch {
      toast.error("خطأ في تحميل الشكاوى والاقتراحات");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data.data || res.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setForm({
      employee_id: "",
      type: "complaint",
      subject: "",
      description: "",
      status: "open",
      response: "",
      assigned_to: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, employee_id: Number(form.employee_id) };
      if (editingId) {
        await api.put(`/complaints/${editingId}`, payload);
        toast.success("تم تحديث الشكوى بنجاح");
      } else {
        await api.post("/complaints", payload);
        toast.success("تم إنشاء الشكوى بنجاح");
      }
      setShowModal(false);
      resetForm();
      fetchComplaints();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingId) return;
    try {
      await api.put(`/complaints/${respondingId}`, {
        response: form.response,
        status: form.status,
      });
      toast.success("تم حفظ الرد بنجاح");
      setShowResponseModal(false);
      setRespondingId(null);
      resetForm();
      fetchComplaints();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الشكوى؟")) return;
    try {
      await api.delete(`/complaints/${id}`);
      toast.success("تم الحذف بنجاح");
      fetchComplaints();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openEdit = (item: Complaint) => {
    setEditingId(item.id);
    setForm({
      employee_id: String(item.employee_id),
      type: item.type,
      subject: item.subject,
      description: item.description,
      status: item.status,
      response: item.response || "",
      assigned_to: item.assigned_to || "",
    });
    setShowModal(true);
  };

  const openResponse = (item: Complaint) => {
    setRespondingId(item.id);
    setForm({
      ...form,
      response: item.response || "",
      status: item.status,
    });
    setShowResponseModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <Topbar title="الشكاوى والاقتراحات" />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="md:mr-64 mr-0 mt-16 md:mt-4 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">الشكاوى والاقتراحات</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + شكوى / اقتراح جديد
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">النوع</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الموضوع</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الوصف</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      لا توجد شكاوى أو اقتراحات
                    </td>
                  </tr>
                ) : (
                  complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[item.type] || "bg-gray-100 text-gray-800"}`}>
                          {typeLabels[item.type] || item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.employee?.name || item.employee_id}</td>
                      <td className="px-4 py-3 font-medium">{item.subject}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{item.description}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-800"}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => openResponse(item)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                          >
                            رد
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? "تعديل الشكوى / الاقتراح" : "شكوى / اقتراح جديد"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموظف *</label>
                  <select
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النوع *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as "complaint" | "suggestion" })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="complaint">شكوى</option>
                      <option value="suggestion">اقتراح</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="open">مفتوح</option>
                      <option value="in_progress">قيد المعالجة</option>
                      <option value="resolved">تم الحل</option>
                      <option value="closed">مغلق</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموضوع *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المسؤول عن المتابعة</label>
                  <input
                    type="text"
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    {editingId ? "تحديث" : "إنشاء"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResponseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">رد على الشكوى / الاقتراح</h2>
              <form onSubmit={handleResponse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرد</label>
                  <textarea
                    value={form.response}
                    onChange={(e) => setForm({ ...form, response: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="اكتب ردك هنا..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تحديث الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="open">مفتوح</option>
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="resolved">تم الحل</option>
                    <option value="closed">مغلق</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResponseModal(false);
                      setRespondingId(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    حفظ الرد
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ComplaintsPage;
