import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AddEmployee() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department_id: "",
    hire_date: "",
    salary: "",
    address: "",
    notes: "",
    status: "active",
    profile_photo: null,
    cv: null,
  });

  useEffect(() => {
    api
      .get("/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDepartments(res.data.data))
      .catch(() => toast.error("❌ فشل في جلب الأقسام"));
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      data.append(key, formData[key]);
    });

    api
      .post("/employees", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        toast.success("✅ تم إضافة الموظف بنجاح");
        setTimeout(() => navigate("/employees"), 2000);
      })
      .catch(() => toast.error("❌ حدث خطأ أثناء إضافة الموظف"));
  };

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
          <h1 className="text-2xl font-bold text-indigo-800">إضافة موظف جديد</h1>
          <button
            onClick={() => navigate("/employees")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-lg"
          >
            ⬅ رجوع للقائمة
          </button>
        </header>

        {/* Toolbar ثابت تحت الـ Navbar */}
        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">نموذج إضافة موظف</span>
        </div>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-xl p-8 max-w-2xl mx-auto space-y-6"
          >
            {/* الاسم */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الاسم</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
                required
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
                required
              />
            </div>

            {/* الهاتف */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الهاتف</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الوظيفة */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الوظيفة</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* القسم كقائمة منسدلة */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">القسم</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
                required
              >
                <option value="">اختر القسم</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* تاريخ التعيين */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">تاريخ التعيين</label>
              <input
                type="date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* المرتب */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">المرتب</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* العنوان */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">العنوان</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الملاحظات */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* رفع صورة شخصية */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الصورة الشخصية</label>
              <input
                type="file"
                name="profile_photo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* رفع السيرة الذاتية */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">السيرة الذاتية (CV)</label>
              <input
                type="file"
                name="cv"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

                        {/* أزرار */}
            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-lg"
              >
                ✅ حفظ
              </button>
              <button
                type="button"
                onClick={() => navigate("/employees")}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 text-lg"
              >
                ❌ إلغاء
              </button>
            </div>
          </form>

          {/* Toast Container */}
          <ToastContainer position="top-right" autoClose={3000} />
        </main>
      </div>
    </div>
  );
}