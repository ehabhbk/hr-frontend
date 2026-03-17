import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
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
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700">
            <UserGroupIcon className="h-5 w-5" /> الموظفين
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700">
            <BuildingOfficeIcon className="h-5 w-5" /> الأقسام
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700">
            <Cog6ToothIcon className="h-5 w-5" /> الإعدادات
          </a>
          <a href="#" className="flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-700">
            <ChartBarIcon className="h-5 w-5" /> التقارير
          </a>
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
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border">
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  الملف الشخصي
                </a>
                <a href="#" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  الإعدادات
                </a>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700">عدد الموظفين</h2>
              <p className="text-2xl font-bold text-indigo-600 mt-2">120</p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700">عدد الأقسام</h2>
              <p className="text-2xl font-bold text-green-600 mt-2">8</p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-700">إشعارات جديدة</h2>
              <p className="text-2xl font-bold text-red-600 mt-2">5</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}