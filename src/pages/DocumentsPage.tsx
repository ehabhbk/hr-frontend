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

interface Document {
  id: number;
  employee_id: number;
  employee?: Employee;
  title: string;
  type: "contract" | "id_card" | "passport" | "certificate" | "other";
  file_path: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
}

const typeLabels: Record<string, string> = {
  contract: "عقد",
  id_card: "هوية شخصية",
  passport: "جواز سفر",
  certificate: "شهادة",
  other: "أخرى",
};

const typeColors: Record<string, string> = {
  contract: "bg-blue-100 text-blue-800",
  id_card: "bg-green-100 text-green-800",
  passport: "bg-purple-100 text-purple-800",
  certificate: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800",
};

const isExpiringSoon = (date: string | null): boolean => {
  if (!date) return false;
  const expiry = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

const isExpired = (date: string | null): boolean => {
  if (!date) return false;
  return new Date(date) < new Date();
};

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    title: "",
    type: "contract",
    file_path: "",
    issue_date: "",
    expiry_date: "",
    notes: "",
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/documents");
      setDocuments(res.data.data || res.data);
    } catch {
      toast.error("خطأ في تحميل المستندات");
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
    fetchDocuments();
    fetchEmployees();
  }, []);

  const resetForm = () => {
    setForm({
      employee_id: "",
      title: "",
      type: "contract",
      file_path: "",
      issue_date: "",
      expiry_date: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, employee_id: Number(form.employee_id) };
      if (editingId) {
        await api.put(`/documents/${editingId}`, payload);
        toast.success("تم تحديث المستند بنجاح");
      } else {
        await api.post("/documents", payload);
        toast.success("تم إنشاء المستند بنجاح");
      }
      setShowModal(false);
      resetForm();
      fetchDocuments();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المستند؟")) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success("تم الحذف بنجاح");
      fetchDocuments();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openEdit = (doc: Document) => {
    setEditingId(doc.id);
    setForm({
      employee_id: String(doc.employee_id),
      title: doc.title,
      type: doc.type,
      file_path: doc.file_path || "",
      issue_date: doc.issue_date || "",
      expiry_date: doc.expiry_date || "",
      notes: doc.notes || "",
    });
    setShowModal(true);
  };

  const getDocStatus = (doc: Document): { label: string; color: string; rowColor: string } => {
    if (doc.expiry_date && isExpired(doc.expiry_date)) {
      return { label: "منتهي", color: "bg-red-100 text-red-800", rowColor: "bg-red-50" };
    }
    if (doc.expiry_date && isExpiringSoon(doc.expiry_date)) {
      return { label: "ينتهي قريباً", color: "bg-orange-100 text-orange-800", rowColor: "bg-orange-50" };
    }
    return { label: "ساري", color: "bg-green-100 text-green-800", rowColor: "" };
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <Topbar title="الوثائق" />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="md:mr-64 mr-0 mt-16 md:mt-4 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">إدارة المستندات</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + مستند جديد
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">العنوان</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">النوع</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الموظف</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">تاريخ الإصدار</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">تاريخ الانتهاء</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      لا توجد مستندات
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const docStatus = getDocStatus(doc);
                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-gray-50 transition ${docStatus.rowColor}`}
                      >
                        <td className="px-4 py-3 font-medium">{doc.title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[doc.type] || "bg-gray-100 text-gray-800"}`}>
                            {typeLabels[doc.type] || doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{doc.employee?.name || doc.employee_id}</td>
                        <td className="px-4 py-3">{doc.issue_date || "-"}</td>
                        <td className="px-4 py-3">{doc.expiry_date || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${docStatus.color}`}>
                            {docStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => openEdit(doc)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? "تعديل المستند" : "مستند جديد"}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="contract">عقد</option>
                    <option value="id_card">هوية شخصية</option>
                    <option value="passport">جواز سفر</option>
                    <option value="certificate">شهادة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">مسار الملف</label>
                  <input
                    type="text"
                    value={form.file_path}
                    onChange={(e) => setForm({ ...form, file_path: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإصدار</label>
                    <input
                      type="date"
                      value={form.issue_date}
                      onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
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

export default DocumentsPage;
