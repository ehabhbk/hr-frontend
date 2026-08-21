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

interface TravelRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  destination: string;
  purpose: string;
  from_date: string;
  to_date: string;
  estimated_cost: number;
  actual_cost: number | null;
  notes: string;
  status: "pending" | "approved" | "rejected" | "completed";
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "موافق عليه",
  rejected: "مرفوض",
  completed: "مكتمل",
};

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

const TravelRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    destination: "",
    purpose: "",
    from_date: "",
    to_date: "",
    estimated_cost: "",
    actual_cost: "",
    notes: "",
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/travel-requests");
      setRequests(res.data.data || res.data);
    } catch {
      toast.error("خطأ في تحميل طلبات السفر");
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
      destination: "",
      purpose: "",
      from_date: "",
      to_date: "",
      estimated_cost: "",
      actual_cost: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        employee_id: Number(form.employee_id),
        estimated_cost: Number(form.estimated_cost),
        actual_cost: form.actual_cost ? Number(form.actual_cost) : null,
      };
      if (editingId) {
        await api.put(`/travel-requests/${editingId}`, payload);
        toast.success("تم تحديث الطلب بنجاح");
      } else {
        await api.post("/travel-requests", payload);
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
      await api.post(`/travel-requests/${id}/${action}`);
      toast.success("تم تنفيذ الإجراء بنجاح");
      fetchRequests();
    } catch {
      toast.error("حدث خطأ أثناء تنفيذ الإجراء");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await api.delete(`/travel-requests/${id}`);
      toast.success("تم حذف الطلب بنجاح");
      fetchRequests();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openEdit = (req: TravelRequest) => {
    setEditingId(req.id);
    setForm({
      employee_id: String(req.employee_id),
      destination: req.destination,
      purpose: req.purpose,
      from_date: req.from_date,
      to_date: req.to_date,
      estimated_cost: String(req.estimated_cost),
      actual_cost: req.actual_cost ? String(req.actual_cost) : "",
      notes: req.notes || "",
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <Topbar title="السفر والبعثات" />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="md:mr-64 mr-0 mt-16 md:mt-4 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">طلبات السفر</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + طلب سفر جديد
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
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الوجهة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الغرض</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">من</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إلى</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">التكلفة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      لا توجد طلبات سفر
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{req.employee?.name || req.employee_id}</td>
                      <td className="px-4 py-3">{req.destination}</td>
                      <td className="px-4 py-3">{req.purpose}</td>
                      <td className="px-4 py-3">{req.from_date}</td>
                      <td className="px-4 py-3">{req.to_date}</td>
                      <td className="px-4 py-3">{Number(req.estimated_cost).toLocaleString()} ر.س</td>
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
                          {req.status === "approved" && (
                            <button
                              onClick={() => handleAction(req.id, "complete")}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
                            >
                              إكمال
                            </button>
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
                {editingId ? "تعديل طلب السفر" : "طلب سفر جديد"}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوجهة *</label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الغرض *</label>
                  <input
                    type="text"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ *</label>
                    <input
                      type="date"
                      value={form.from_date}
                      onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ *</label>
                    <input
                      type="date"
                      value={form.to_date}
                      onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة التقديرية</label>
                    <input
                      type="number"
                      value={form.estimated_cost}
                      onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة الفعلية</label>
                    <input
                      type="number"
                      value={form.actual_cost}
                      onChange={(e) => setForm({ ...form, actual_cost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

export default TravelRequestsPage;
