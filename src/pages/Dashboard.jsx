import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";

export default function Dashboard() {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const token = localStorage.getItem("token");

  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [terminatedCount, setTerminatedCount] = useState(0);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // جلب الموظفين
    api.get("/employees", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      setEmployeeCount(res.data.data.length);
      const totalWarnings = res.data.data.reduce((sum, emp) => sum + (emp.warnings || 0), 0);
      setWarningsCount(totalWarnings);
      const terminated = res.data.data.filter((emp) => emp.status === "terminated").length;
      setTerminatedCount(terminated);
    })
    .catch((err) => console.error(err));

    // جلب الأقسام
    api.get("/departments", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => setDepartmentCount(res.data.data.length))
    .catch((err) => console.error(err));
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col">
        <div className="p-6 text-center border-b border-indigo-700">
          <h2 className="text-xl font-bold">Jawda HR</h2>
          <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
        </div>
        <nav className="flex-1 p-4 space-y-3">
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

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-8">
            <img
              src={avatar}
              alt="User Avatar"
              className="w-12 h-12 rounded-full border"
            />
            <p className="text-gray-600 text-lg">
              مرحباً <span className="font-semibold">{username}</span> 👋، سعيدون بعودتك إلى نظام جودة لإدارة الموارد البشرية
            </p>
          </div>

          {/* بطاقات الملخص */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div
              onClick={() => navigate("/employees")}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition"
            >
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                عدد الموظفين
              </h2>
              <p className="text-2xl font-bold text-indigo-600 mt-2">{employeeCount}</p>
            </div>

            <div
              onClick={() => navigate("/departments")}
              className="bg-white shadow-md rounded-lg p-6 cursor-pointer hover:shadow-lg transition"
            >
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
                عدد الأقسام
              </h2>
              <p className="text-2xl font-bold text-green-600 mt-2">{departmentCount}</p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <UserMinusIcon className="h-6 w-6 text-red-600" />
                عدد الموظفين المفصولين
              </h2>
              <p className="text-2xl font-bold text-red-600 mt-2">{terminatedCount}</p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                عدد الإنذارات الكلي
              </h2>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{warningsCount}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}