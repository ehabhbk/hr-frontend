import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
      .catch((err) => console.error(err));
  }, [token]);

  useEffect(() => {
    fetchDepartments();

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

  const handleAddDepartment = (e) => {
    e.preventDefault();
    api
      .post("/departments", newDept, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setNewDept({ name: "", description: "" });
        setShowModal(false);
        fetchDepartments();
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col">
        <div className="p-6 text-center border-b border-indigo-700">
          <h2 className="text-xl font-bold">Jawda HR</h2>
          <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
        </div>
        <nav className="flex-1 p-4 space-y-3">
          <a href="/employees" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700">
            <UserGroupIcon className="h-5 w-5" /> الموظفين
          </a>
          <a href="/departments" className="flex items-center gap-2 px-3 py-2 rounded bg-indigo-700">
            <BuildingOfficeIcon className="h-5 w-5" /> الأقسام
          </a>
          <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-left">
            <Cog6ToothIcon className="h-5 w-5" /> الإعدادات
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700 w-full text-left">
            <ChartBarIcon className="h-5 w-5" /> التقارير
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
          <h1 className="text-xl font-semibold text-indigo-800">الأقسام</h1>
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
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border">
                <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
                  الملف الشخصي
                </button>
                <button className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">
                  الإعدادات
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6 space-y-8">
          {/* زر إضافة قسم جديد */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              ➕ إضافة قسم جديد
            </button>
          </div>

          {/* مودال إضافة قسم */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">إضافة قسم جديد</h2>
                <form onSubmit={handleAddDepartment} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">اسم القسم</label>
                    <input
                      type="text"
                      value={newDept.name}
                      onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">الوصف</label>
                    <textarea
                      value={newDept.description}
                      onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                      حفظ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* عرض الأقسام والموظفين */}
          {departments.map((dep) => (
            <div key={dep.id} className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏢 {dep.name}</h2>
              <p className="text-gray-600 mb-4">{dep.description}</p>

              <h3 className="text-lg font-semibold text-indigo-700 mb-2">👨‍💼 الموظفين في هذا القسم</h3>
              <table className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-4 py-2 border">الاسم</th>
                    <th className="px-4 py-2 border">البريد</th>
                    <th className="px-4 py-2 border">الوظيفة</th>
                    <th className="px-4 py-2 border">الراتب</th>
                    <th className="px-4 py-2 border">نسبة الانضباط</th>
                  </tr>
                </thead>
                <tbody>
           {dep.employees?.map((emp) => (
  <tr key={emp.id} className="hover:bg-gray-50 transition">
    <td className="px-4 py-2 border">{emp.name}</td>
    <td className="px-4 py-2 border">{emp.email}</td>
    <td className="px-4 py-2 border">{emp.position}</td>
    <td className="px-4 py-2 border text-green-600 font-semibold">{emp.salary}</td>
    <td className="px-4 py-2 border">{emp.discipline_percentage}%</td>
  </tr>
))}

{dep.employees?.length === 0 && (
  <tr>
    <td colSpan="5" className="px-4 py-2 text-center text-gray-500">
      لا يوجد موظفين في هذا القسم
    </td>
  </tr>
)}
                </tbody>
              </table>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}