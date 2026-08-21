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

interface OvertimeRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  date: string;
  hours: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  amount: number | null;
  rate: number | null;
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "موافق عليه",
  rejected: "مرفوض",
};

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const OvertimePage: React.FC = () => {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    date: "",
    hours: "",
    reason: "",
    amount: "",
    rate: "",
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/overtime-requests");
      setRequests(res.data.data || res.data);
    } catch {
      toast.error("خطأ في تحميل طلبات العمل الإضافي");
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
    fetchRequests();
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setForm({
      employee_id: "",
      date: "",
      hours: "",
      reason: "",
      amount: "",
      rate: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: Number(form.employee_id),
        date: form.date,
        hours: Number(form.hours),
        reason: form.reason,
        amount: form.amount ? Number(form.amount) : null,
        rate: form.rate ? Number(form.rate) : null,
      };
      if (editingId) {
        await api.put(`/overtime-requests/${editingId}`, payload);
        toast.success("تم تحديث الطلب بنجاح");
      } else {
        await api.post("/overtime-requests", payload);
        toast.success("تم إنشاء الطلب بنجاح");
      }
      setShowModal(false);
      resetForm();
      fetchRequests();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleAction = async (id: number, action: string) => {
    try {
      await api.post(`/overtime-requests/${id}/${action}`);
      toast.success("تم تنفيذ الإجراء بنجاح");
      fetchRequests();
    } catch {
      toast.error("حدث خطأ أثناء تنفيذ الإجراء");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await api.delete(`/overtime-requests/${id}`);
      toast.success("تم حذف الطلب بنجاح");
      fetchRequests();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openEdit = (req: OvertimeRequest) => {
    setEditingId(req.id);
    setForm({
      employee_id: String(req.employee_id),
      date: req.date,
      hours: String(req.hours),
      reason: req.reason || "",
      amount: req.amount ? String(req.amount) : "",
      rate: req.rate ? String(req.rate) : "",
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <Topbar title="الأوفرتايم" />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="md:mr-64 mr-0 mt-16 md:mt-4 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">طلبات العمل الإضافي</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + طلب إضافي جديد
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الساعات</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">المبلغ</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      لا توجد طلبات عمل إضافي
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{req.employee?.name || req.employee_id}</td>
                      <td className="px-4 py-3">{req.date}</td>
                      <td className="px-4 py-3">{req.hours}</td>
                      <td className="px-4 py-3">
                        {req.amount ? `${Number(req.amount).toLocaleString()} ر.س` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[req.status] || "bg-gray-100 text-gray-800"}`}>
                          {statusLabels[req.status] || req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleAction(req.id, "approve")}
                                className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded"
                              >
                                موافقة
                              </button>
                              <button
                                onClick={() => handleAction(req.id, "reject")}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                              >
                                رفض
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEdit(req)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
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
                {editingId ? "تعديل طلب العمل الإضافي" : "طلب عمل إضافي جديد"}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الساعات *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السعر / المعدل</label>
                    <input
                      type="number"
                      value={form.rate}
                      onChange={(e) => setForm({ ...form, rate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السبب *</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    required
                    rows={3}
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
      </main>
    </div>
  );
};

export default OvertimePage;
