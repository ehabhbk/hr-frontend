import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface Review360 {
  id: number;
  employee_id: number;
  employee_name?: string;
  reviewer_id: number;
  reviewer_name?: string;
  reviewer_type: "manager" | "peer" | "subordinate" | "self";
  communication_score: number;
  teamwork_score: number;
  leadership_score: number;
  technical_score: number;
  problem_solving_score: number;
  strengths: string;
  improvements: string;
  comments: string;
  review_period: string;
  created_at: string;
}

interface ReviewSummary {
  avg_communication: number;
  avg_teamwork: number;
  avg_leadership: number;
  avg_technical: number;
  avg_problem_solving: number;
  total_reviews: number;
}

interface Employee {
  id: number;
  name: string;
}

const reviewerTypeLabels: Record<string, string> = {
  manager: "مدير",
  peer: "زميل",
  subordinate: "مرؤوس",
  self: "ذاتي",
};

const reviewerTypeColors: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700",
  peer: "bg-blue-100 text-blue-700",
  subordinate: "bg-teal-100 text-teal-700",
  self: "bg-orange-100 text-orange-700",
};

const emptyForm: Partial<Review360> = {
  employee_id: 0,
  reviewer_id: 0,
  reviewer_type: "manager",
  communication_score: 3,
  teamwork_score: 3,
  leadership_score: 3,
  technical_score: 3,
  problem_solving_score: 3,
  strengths: "",
  improvements: "",
  comments: "",
  review_period: "",
};

export default function Reviews360Page() {
  const [reviews, setReviews] = useState<Review360[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Review360>>(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
    fetchSummary();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reviews-360");
      setReviews(res.data.data || res.data || []);
    } catch {
      toast.error("خطأ في تحميل التقييمات");
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

  const fetchSummary = async () => {
    try {
      const res = await api.get("/reviews-360/summary");
      setSummary(res.data.data || res.data || null);
    } catch {}
  };

  const handleOpenCreate = () => {
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name.includes("score") || name === "employee_id" || name === "reviewer_id"
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/reviews-360", form);
      toast.success("تم إضافة التقييم");
      handleCloseModal();
      fetchReviews();
      fetchSummary();
    } catch {
      toast.error("حدث خطأ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`/reviews-360/${id}`);
      toast.success("تم حذف التقييم");
      fetchReviews();
      fetchSummary();
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const getAvgScore = (r: Review360) => {
    return (
      ((r.communication_score + r.teamwork_score + r.leadership_score + r.technical_score + r.problem_solving_score) / 5)
    ).toFixed(1);
  };

  const filtered = reviews.filter((r) => {
    const matchSearch =
      r.employee_name?.includes(searchTerm) ||
      r.reviewer_name?.includes(searchTerm) ||
      r.comments?.includes(searchTerm);
    const matchType = typeFilter === "all" || r.reviewer_type === typeFilter;
    return matchSearch && matchType;
  });

  const radarDimensions = [
    { key: "communication", label: "التواصل", value: summary?.avg_communication || 0 },
    { key: "teamwork", label: "العمل الجماعي", value: summary?.avg_teamwork || 0 },
    { key: "leadership", label: "القيادة", value: summary?.avg_leadership || 0 },
    { key: "technical", label: "المهارات التقنية", value: summary?.avg_technical || 0 },
    { key: "problem_solving", label: "حل المشكلات", value: summary?.avg_problem_solving || 0 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col md:mr-64 mr-0">
        <Topbar title="🔄 تقييم 360 درجة" />
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
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">كل الأنواع</option>
                <option value="manager">مدير</option>
                <option value="peer">زميل</option>
                <option value="subordinate">مرؤوس</option>
                <option value="self">ذاتي</option>
              </select>
            </div>
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-800 hover:bg-indigo-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + إضافة تقييم
            </button>
          </div>

          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">متوسط التقييمات ({summary.total_reviews} تقييم)</h3>
                <div className="space-y-3">
                  {radarDimensions.map((dim) => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 text-right">{dim.label}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-indigo-600 h-4 rounded-full transition-all"
                          style={{ width: `${(dim.value / 5) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {dim.value.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 w-6">/5</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="10"
                      strokeDasharray={`${((summary.avg_communication + summary.avg_teamwork + summary.avg_leadership + summary.avg_technical + summary.avg_problem_solving) / 5 / 5) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {((summary.avg_communication + summary.avg_teamwork + summary.avg_leadership + summary.avg_technical + summary.avg_problem_solving) / 5).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">من 5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="text-5xl mb-4">🔄</div>
                <p>لا توجد تقييمات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right">الموظف</th>
                      <th className="px-4 py-3 text-right">المقيّم</th>
                      <th className="px-4 py-3 text-right">النوع</th>
                      <th className="px-4 py-3 text-right">التقييم</th>
                      <th className="px-4 py-3 text-right">الفترة</th>
                      <th className="px-4 py-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((review) => (
                      <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{review.employee_name || review.employee_id}</td>
                        <td className="px-4 py-3">{review.reviewer_name || review.reviewer_id}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${reviewerTypeColors[review.reviewer_type]}`}>
                            {reviewerTypeLabels[review.reviewer_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${star <= Math.round(Number(getAvgScore(review))) ? "text-yellow-400" : "text-gray-300"}`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="text-xs text-gray-500 mr-1">{getAvgScore(review)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{review.review_period}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            حذف
                          </button>
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
              <h3 className="text-lg font-bold text-gray-800">إضافة تقييم 360</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المقيّم</label>
                  <select
                    name="reviewer_id"
                    value={form.reviewer_id || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر المقيّم</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع المقيّم</label>
                  <select
                    name="reviewer_type"
                    value={form.reviewer_type || "manager"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="manager">مدير</option>
                    <option value="peer">زميل</option>
                    <option value="subordinate">مرؤوس</option>
                    <option value="self">ذاتي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">فترة التقييم</label>
                  <input
                    name="review_period"
                    value={form.review_period || ""}
                    onChange={handleChange}
                    placeholder="مثال: 2024-Q1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { name: "communication_score", label: "التواصل" },
                  { name: "teamwork_score", label: "العمل الجماعي" },
                  { name: "leadership_score", label: "القيادة" },
                  { name: "technical_score", label: "تقني" },
                  { name: "problem_solving_score", label: "حل المشكلات" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1 text-center">{field.label}</label>
                    <select
                      name={field.name}
                      value={Number(form[field.name as keyof Review360]) || 3}
                      onChange={handleChange}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نقاط القوة</label>
                <textarea
                  name="strengths"
                  value={form.strengths || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مجالات التحسين</label>
                <textarea
                  name="improvements"
                  value={form.improvements || ""}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  name="comments"
                  value={form.comments || ""}
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
                  إضافة
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
