import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CountUp from "react-countup";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [newDept, setNewDept] = useState({ name: "", description: "" });
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const token = localStorage.getItem("token");

  const fetchDepartments = useCallback(() => {
    api
      .get("/departments", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDepartments(res.data.data))
      .catch(() => toast.error("فشل في جلب الأقسام ❌"));
  }, [token]);

  useEffect(() => {
    fetchDepartments();
    AOS.init({ duration: 1000, once: true });

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [token, fetchDepartments]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  const handleAddOrUpdateDepartment = (e) => {
    e.preventDefault();
    if (editDept) {
      api
        .put(`/departments/${editDept.id}`, newDept, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          toast.success("تم تحديث القسم بنجاح ✅");
          setNewDept({ name: "", description: "" });
          setEditDept(null);
          setShowModal(false);
          fetchDepartments();
        })
        .catch(() => toast.error("فشل في تحديث القسم ❌"));
    } else {
      api
        .post("/departments", newDept, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          toast.success("تم إضافة القسم بنجاح ✅");
          setNewDept({ name: "", description: "" });
          setShowModal(false);
          fetchDepartments();
        })
        .catch(() => toast.error("فشل في إضافة القسم ❌"));
    }
  };

  const handleDeleteDepartment = (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا القسم؟")) {
      api
        .delete(`/departments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          toast.success("تم حذف القسم بنجاح ✅");
          fetchDepartments();
        })
        .catch(() => toast.error("فشل في حذف القسم ❌"));
    }
  };

  const colors = [
    "bg-indigo-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-blue-500",
  ];

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col">
        <div className="p-6 text-center border-b border-indigo-700">
          <h2 className="text-xl font-bold">نظام جودة</h2>
          <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
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
        {/* Top Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
          <h1 className="text-xl font-semibold text-indigo-800">لوحة التحكم</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-3 focus:outline-none"
            >
              <img
                src={avatar}
                alt="User Avatar"
                className="w-10 h-10 rounded-full border"
              />
              <span className="text-gray-700 font-medium">{username}</span>
            </button>

            {openMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg border">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الملف الشخصي
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الإعدادات
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {/* شريط علوي ثابت */}
          <div className="sticky top-0 bg-white shadow-md p-3 flex items-center justify-between mb-6 z-40">
            <div className="flex items-center gap-2 text-indigo-800 font-semibold">
              <BuildingOfficeIcon className="h-6 w-6" />
              <span>
                عدد الأقسام:{" "}
                <CountUp start={0} end={departments.length} duration={1.5} />
              </span>
            </div>
            <button
              onClick={() => {
                setNewDept({ name: "", description: "" });
                setEditDept(null);
                setShowModal(true);
              }}
              className="bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition text-sm font-semibold"
            >
              ➕ إضافة
            </button>
          </div>

          {/* شبكة عرض الأقسام */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {departments.map((dep, index) => (
              <div
                key={dep.id}
                data-aos="fade-up"
                className={`flex flex-col items-center justify-center rounded-2xl h-64 w-64 mx-auto text-white shadow-lg relative transform transition hover:scale-105 ${colors[index % colors.length]}`}
              >
                <h2 className="text-xl font-bold mb-2">{dep.name}</h2>
                <p className="text-sm">{dep.description}</p>
                <p className="text-2xl font-semibold mt-2 flex items-center gap-2">
                  👨‍💼
                  <CountUp start={0} end={dep.employees ? dep.employees.length : 0} duration={1.5} />
                </p>

                {/* أزرار تعديل وحذف */}
                <div className="absolute bottom-3 flex gap-3">
                  <button
                    onClick={() => {
                      setEditDept(dep);
                      setNewDept({ name: dep.name, description: dep.description });
                      setShowModal(true);
                    }}
                    className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm hover:bg-yellow-500 font-semibold"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(dep.id)}
                    className="bg-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-600 font-semibold"
                  >
                    حذف
                                    </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Modal لإضافة/تعديل قسم */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editDept ? "تعديل القسم" : "إضافة قسم جديد"}
              </h2>
              <form onSubmit={handleAddOrUpdateDepartment} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">اسم القسم</label>
                  <input
                    type="text"
                    value={newDept.name}
                    onChange={(e) =>
                      setNewDept({ ...newDept, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">الوصف</label>
                  <textarea
                    value={newDept.description}
                    onChange={(e) =>
                      setNewDept({ ...newDept, description: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditDept(null);
                      setNewDept({ name: "", description: "" });
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
                  >
                    {editDept ? "تحديث" : "حفظ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}