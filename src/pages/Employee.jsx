import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Cog6ToothIcon,
  ChartBarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
export default function Employee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationData, setVacationData] = useState({
    leave_type: "official",
    leave_duration: 1,
    leave_paid: true,
  });
  const token = localStorage.getItem("token");

  useEffect(() => {
    api
      .get(`/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployee(res.data.data))
      .catch((err) => console.error(err));
  }, [id, token]);

  const getCardColor = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-blue-100";
    if (normalized.includes("terminated")) return "bg-purple-100";
    if (normalized.includes("warning")) return "bg-yellow-100";
    if (normalized.includes("vacation")) return "bg-green-100";
    return "bg-gray-100";
  };

  const updateStatus = (newStatus, message, extraData = {}) => {
  api
    .put(
      `/employees/${employee.id}`,
      { status: newStatus, ...extraData },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) => {
      const updated = res.data.data;

      // 🚨 إذا وصل عدد الإنذارات إلى 4 أو أكثر وتم الفصل
      if (updated.warnings >= 4 && updated.status === "terminated") {
        toast.error(`🚨 الموظف ${updated.name} تم فصله وتجميد مرتبه بعد 4 إنذارات`);
      } else if (newStatus === "vacation") {
        toast.success(
          `🌴 ${message} | النوع: ${
            extraData.leave_type === "sick" ? "مرضية" : "رسمية"
          } | المدة: ${extraData.leave_duration} يوم | ${
            extraData.leave_paid ? "بمرتب" : "بدون مرتب"
          }`
        );
      } else {
        toast.success(message);
      }

      setEmployee(updated);
      setShowVacationModal(false);
      setVacationData({ leave_type: "official", leave_duration: 1, leave_paid: true });
    })
    .catch(() => toast.error("❌ حدث خطأ أثناء تحديث الحالة"));
};

  if (!employee) {
    return <div className="p-6 text-lg font-semibold">⏳ جاري تحميل بيانات الموظف...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col sticky top-0 h-screen">
        <div className="p-6 text-center border-b border-indigo-700">
          <h2 className="text-2xl font-bold">Jawda HR</h2>
          <p className="text-sm text-gray-300">لإدراة الموارد البشرية</p>
        </div>
        <nav className="flex-1 p-4 space-y-3">
                  <button
                  onClick={() => navigate("/dashboard")}
                   className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right">
                    <Cog6ToothIcon className="h-5 w-5" /> لوحة التحكم
                  </button>
                  <button
                    onClick={() => navigate("/employees")}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right"
                  >
                    <UserGroupIcon className="h-5 w-5" /> الموظفين
                  </button>
                  <button
                    onClick={() => navigate("/departments")}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right"
                  >
                    <BuildingOfficeIcon className="h-5 w-5" /> الأقسام
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right">
                    <Cog6ToothIcon className="h-5 w-5" /> الإعدادات
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-right">
                    <ChartBarIcon className="h-5 w-5" /> التقارير
                  </button>
                </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">تفاصيل الموظف</h1>
          <button
            onClick={() => navigate("/employees")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-lg"
          >
            ⬅ رجوع للقائمة
          </button>
        </header>

        {/* Toolbar */}
<div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
  <span className="text-indigo-800 font-bold text-xl">الموظف: {employee.name}</span>
  <div className="flex flex-col text-right">
    <span className="text-lg font-semibold">
      الحالة:{" "}
      {employee.status === "terminated" ? (
        <span className="text-red-600">مفصول</span>
      ) : employee.status === "warning" ? (
        <span className="text-yellow-500">إنذار</span>
      ) : employee.status === "vacation" ? (
        <span className="text-blue-600">إجازة</span>
      ) : (
        <span className="text-green-600">نشط</span>
      )}

      {/* Badge إضافي إذا كان الفصل بسبب الإنذارات */}
      {employee.status === "terminated" && employee.warnings >= 4 && (
        <span className="ml-2 px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">
          مفصول بسبب الإنذارات
        </span>
      )}
    </span>

    <span className="text-gray-600 text-sm">
      آخر تحديث: {new Date(employee.updated_at).toLocaleString("ar-EG")}
    </span>

    {employee.warnings > 0 && (
      <span className="text-orange-600 font-semibold text-sm">
        عدد الإنذارات: {employee.warnings}
      </span>
    )}

    {employee.leave_count > 0 && (
      <span className="text-blue-600 font-semibold text-sm">
        عدد الإجازات: {employee.leave_count} | النوع:{" "}
        {employee.leave_type === "sick" ? "مرضية" : "رسمية"} | المدة:{" "}
        {employee.leave_duration} يوم | {employee.leave_paid ? "بمرتب" : "بدون مرتب"}
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
              className="w-40 h-40 rounded-full border-4 border-indigo-300 mb-6 cursor-pointer"
              onClick={() => {
                if (employee.profile_photo) window.open(employee.profile_photo, "_blank");
              }}
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{employee.name}</h2>
            <p className="text-xl text-gray-700 mb-1">{employee.position}</p>
            <p className="text-lg text-gray-600 mb-1">القسم: {employee.department?.name || "غير محدد"}</p>
            <p className="text-lg text-green-700 font-semibold mb-1">💰 المرتب: {employee.salary}</p>
            <p className="text-lg text-gray-600 mb-1">📅 تاريخ التعيين: {employee.hire_date}</p>
            <p className="text-lg text-gray-600 mb-1">📞 الهاتف: {employee.phone}</p>
            <p className="text-lg text-gray-600 mb-1">🏠 العنوان: {employee.address}</p>

            {employee.cv && (
              <button onClick={() => window.open(employee.cv, "_blank")} className="text-blue-600 underline text-lg mb-4">
                📄 عرض السيرة الذاتية
              </button>
            )}

            <p className="text-lg text-gray-600 mb-4">📝 ملاحظات: {employee.notes || "لا توجد"}</p>

            {/* أزرار */}
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

              <button
                onClick={() => setShowVacationModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-lg"
              >
                🌴 إجازة
              </button>
            </div>
          </div>

          {/* مودل إدخال بيانات الإجازة */}
          {showVacationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4">📝 إدخال بيانات الإجازة</h2>

                {/* نوع الإجازة */}
                <label className="block mb-2">نوع الإجازة:</label>
                <select
                  value={vacationData.leave_type}
                  onChange={(e) => setVacationData({ ...vacationData, leave_type: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                >
                  <option value="official">رسمية</option>
                  <option value="sick">مرضية</option>
                </select>

                {/* مدة الإجازة */}
                <label className="block mb-2">مدة الإجازة (بالأيام):</label>
                <input
                  type="number"
                  min="1"
                  value={vacationData.leave_duration}
                  onChange={(e) =>
                    setVacationData({
                      ...vacationData,
                      leave_duration: Math.max(1, parseInt(e.target.value || 1)),
                    })
                  }
                  className="w-full border rounded p-2 mb-4"
                />

                {/* بمرتب أو بدون مرتب */}
                <label className="block mb-2">هل الإجازة بمرتب؟</label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="leave_paid"
                      checked={vacationData.leave_paid === true}
                      onChange={() => setVacationData({ ...vacationData, leave_paid: true })}
                    />
                    بمرتب
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="leave_paid"
                      checked={vacationData.leave_paid === false}
                      onChange={() => setVacationData({ ...vacationData, leave_paid: false })}
                    />
                    بدون مرتب
                  </label>
                </div>

                {/* أزرار التحكم */}
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowVacationModal(false);
                      // reset form if cancelled
                      setVacationData({ leave_type: "official", leave_duration: 1, leave_paid: true });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>

                  <button
                    onClick={() => {
                      // basic client-side validation
                      if (!vacationData.leave_duration || vacationData.leave_duration < 1) {
                        toast.error("الرجاء إدخال مدة صحيحة للإجازة (يوم واحد على الأقل).");
                        return;
                      }
                      updateStatus("vacation", "تم وضع الموظف في إجازة", vacationData);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    حفظ الإجازة
                  </button>
                </div>
              </div>
            </div>
          )}

          <ToastContainer position="top-right" autoClose={3000} />
        </main>
      </div>
    </div>
  );
}