import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Employee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    api.get(`/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployee(res.data.data))
      .catch((err) => console.error(err));
  }, [id, token]);

  const getCardColor = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-blue-100";
    if (normalized.includes("terminated")) return "bg-purple-100";
    if (normalized.includes("warning")) return "bg-yellow-100";
    return "bg-gray-100";
  };

  const updateStatus = (newStatus, message) => {
    api.put(`/employees/${employee.id}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        toast.success(message);
        setEmployee({
          ...employee,
          status: newStatus,
          warnings: newStatus === "warning" ? (employee.warnings || 0) + 1 : employee.warnings,
          updated_at: new Date().toISOString(),
        });
      })
      .catch(() => toast.error("❌ حدث خطأ أثناء تحديث الحالة"));
  };

  if (!employee) {
    return <div className="p-6 text-lg font-semibold">⏳ جاري تحميل بيانات الموظف...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar ثابت */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col sticky top-0 h-screen">
        <div className="p-6 text-center border-b border-indigo-700">
          <h2 className="text-2xl font-bold">Jawda HR</h2>
          <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
        </div>
        <nav className="flex-1 p-4 space-y-3">
          <button
            onClick={() => navigate("/employees")}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right"
          >
            👥 الموظفين
          </button>
          <button
            onClick={() => navigate("/departments")}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right"
          >
            🏢 الأقسام
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar ثابت */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">تفاصيل الموظف</h1>
          <button
            onClick={() => navigate("/employees")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-lg"
          >
            ⬅ رجوع للقائمة
          </button>
        </header>

        {/* Toolbar ثابت تحت الـ Navbar */}
        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">
            الموظف: {employee.name}
          </span>
          <div className="flex flex-col text-right">
            <span className="text-gray-700 text-lg">
              الحالة: {employee.status === "terminated"
                ? "مفصول"
                : employee.status === "warning"
                ? "إنذار"
                : "نشط"}
            </span>
            <span className="text-gray-600 text-sm">
              آخر تحديث: {new Date(employee.updated_at).toLocaleString("ar-EG")}
            </span>
            {employee.warnings > 0 && (
              <span className="text-orange-600 font-semibold text-sm">
                عدد الإنذارات: {employee.warnings}
              </span>
            )}
          </div>
        </div>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6">
          <div
            className={`${getCardColor(employee.status)} shadow-lg rounded-xl p-8 flex flex-col items-center text-center`}
          >
            <img
              src={employee.profile_photo || "/default-avatar.png"}
              alt={employee.name}
              className="w-40 h-40 rounded-full border-4 border-indigo-300 mb-6"
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{employee.name}</h2>
            <p className="text-xl text-gray-700 mb-1">{employee.position}</p>
            <p className="text-lg text-gray-600 mb-1">القسم: {employee.department?.name || "غير محدد"}</p>
            <p className="text-lg text-green-700 font-semibold mb-1">💰 المرتب: {employee.salary}</p>
            <p className="text-lg text-gray-600 mb-1">📅 تاريخ التعيين: {employee.hire_date}</p>
            <p className="text-lg text-gray-600 mb-1">📞 الهاتف: {employee.phone}</p>
            <p className="text-lg text-gray-600 mb-1">🏠 العنوان: {employee.address}</p>
            <p className="text-lg text-gray-600 mb-1">📄 السيرة الذاتية: {employee.cv}</p>
            <p className="text-lg text-gray-600 mb-4">📝 ملاحظات: {employee.notes || "لا توجد"}</p>

            {/* أزرار تعديل + إنذار + فصل */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  toast.info("📌 تم فتح صفحة تعديل الموظف");
                  navigate(`/employee/${employee.id}/edit`);
                }}
                className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 text-lg"
              >
                ✏ تعديل
              </button>
              <button
                onClick={() => updateStatus("warning", "⚠ تم إعطاء إنذار للموظف")}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 text-lg"
              >
                ⚠ إنذار
              </button>
              <button
                onClick={() => updateStatus("terminated", "❌ تم فصل الموظف")}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-lg"
              >
                ⛔ فصل
              </button>
            </div>
          </div>

          {/* Toast Container */}
          <ToastContainer position="top-right" autoClose={3000} />
        </main>
      </div>
    </div>
  );
}