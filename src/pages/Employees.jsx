import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import CountUp from "react-countup";
import AOS from "aos";
import "aos/dist/aos.css";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get("/employees", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployees(res.data.data))
      .catch((err) => console.error(err));
  }, [token]);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });

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

  // تحديد لون البطاقة حسب الحالة
  const getCardColor = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-blue-100";       // نشط
    if (normalized.includes("terminated")) return "bg-purple-100"; // مفصول
    if (normalized.includes("warning")) return "bg-yellow-100";    // إنذار
    if (normalized.includes("vacation")) return "bg-teal-100";     // في إجازة (لون مختلف عن نشط)
    return "bg-gray-100";                                          // افتراضي
  };

  // فلترة الموظفين حسب البحث والحالة
  const filteredEmployees = employees.filter((emp) => {
    const name = (emp.name || "").toLowerCase();
    const position = (emp.position || "").toLowerCase();
    const department = (emp.department?.name || "").toLowerCase();
    const normalized = (emp.status || "").toLowerCase();

    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      position.includes(searchTerm.toLowerCase()) ||
      department.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : normalized.includes(statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar ثابت */}
      <aside className="w-64 bg-indigo-800 text-white flex flex-col sticky top-0 h-screen">
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
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar الأول ثابت */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-xl font-semibold text-indigo-800">قائمة الموظفين</h1>
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
                  onClick={handleLogout}
                  className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Toolbar الثاني ثابت تحت الـ Navbar */}
        <div className="bg-gray-50 shadow-md p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 z-40">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="🔍 بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-lg px-3 py-1 w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-1"
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="terminated">مفصول</option>
              <option value="warning">إنذار</option>
              <option value="vacation">في إجازة</option> {/* الحالة الجديدة */}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-indigo-800 font-bold text-lg flex items-center gap-2">
              👨‍💼 عدد الموظفين:{" "}
              <CountUp start={0} end={filteredEmployees.length} duration={1.5} />
            </span>
            <button
              onClick={() => navigate("/add-employee")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
            >
              ➕ إضافة
            </button>
          </div>
        </div>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6">
          {/* شبكة بطاقات الموظفين */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                data-aos="fade-up"
                onClick={() => navigate(`/employee/${emp.id}`)}
                className={`${getCardColor(emp.status)} shadow-md rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transform transition hover:scale-105 cursor-pointer`}
              >
                <img
                  src={emp.profile_photo || "/default-avatar.png"}
                  alt={emp.name}
                  className="w-24 h-24 rounded-full border mb-4"
                />
                <h2 className="text-lg font-bold text-gray-800">{emp.name}</h2>
                <p className="text-gray-600">{emp.position}</p>
                <p className="text-gray-600">القسم: {emp.department?.name || "غير محدد"}</p>
                <p className="text-green-600 font-semibold">💰 {emp.salary}</p>
                <p className="text-gray-600">
                  الحالة: {emp.status === "terminated"
                    ? "مفصول"
                    : emp.status === "warning"
                    ? "إنذار"
                    : emp.status === "vacation"
                    ? "🌴 في إجازة"
                    : "نشط"}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}