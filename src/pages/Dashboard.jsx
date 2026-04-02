import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
  UserCircleIcon,
  DocumentIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CalendarIcon,
  ClockIcon,
  BanknotesIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listDevices, syncDevice, syncAttendance } from "../services/fingerprintApi";

export default function Dashboard() {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const token = localStorage.getItem("token");

  const [dashboardData, setDashboardData] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [employeesWithWarningsCount, setEmployeesWithWarningsCount] = useState(0);
  const [terminatedCount, setTerminatedCount] = useState(0);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [syncing, setSyncing] = useState(false);

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
    api.get("/dashboard")
      .then((res) => setDashboardData(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    api.get("/employees", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      setEmployeeCount(res.data.data.length);
      const employeesWithWarnings = res.data.data.filter(
        (emp) => (emp.warnings_count || 0) > 0
      ).length;
      setEmployeesWithWarningsCount(employeesWithWarnings);
      const terminated = res.data.data.filter((emp) => emp.status === "terminated").length;
      setTerminatedCount(terminated);
    })
    .catch((err) => console.error(err));

    api.get("/departments", {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => setDepartmentCount(res.data.data.length))
    .catch((err) => console.error(err));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listDevices();
        const arr = Array.isArray(data) ? data : data?.data || [];
        if (cancelled) return;
        setDevices(arr);
        if (!selectedDeviceId && arr?.[0]?.id) {
          setSelectedDeviceId(String(arr[0].id));
        }
      } catch {
        // ignore (devices feature optional)
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      if (selectedDeviceId) {
        const res = await syncDevice(selectedDeviceId);
        toast.success(res?.message || "تمت المزامنة ✅");
      } else {
        const res = await syncAttendance();
        toast.success(res?.message || "تمت المزامنة ✅");
      }
    } catch (e) {
      toast.error(e?.message || "فشل المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <Sidebar />

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
      onClick={() => {
        setOpenMenu(false);
        navigate("/profilesettings");
      }}
      className="w-full flex items-center justify-end px-4 py-2 text-gray-700 hover:bg-gray-100"
    >
      الملف الشخصي
      <UserCircleIcon className="w-5 h-5 ml-2" />
    </button>

    <button
      type="button"
      className="w-full flex items-center justify-end px-4 py-2 text-gray-700 hover:bg-gray-100"
    >
      التقارير
      <DocumentIcon className="w-5 h-5 ml-2" />
    </button>

    <button
      type="button"
      className="w-full flex items-center justify-end px-4 py-2 text-gray-700 hover:bg-gray-100"
    >
      الإعدادات
      <Cog6ToothIcon className="w-5 h-5 ml-2" />
    </button>

    <button
      onClick={handleLogout}
      className="w-full flex items-center justify-end px-4 py-2 text-red-600 hover:bg-gray-100"
    >
      تسجيل الخروج
      <ArrowRightOnRectangleIcon className="w-5 h-5 ml-2" />
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

          <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-indigo-800 font-semibold">مزامنة جهاز البصمة</div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <select
                className="border rounded-lg px-3 py-2"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={!devices?.length || syncing}
              >
                {!devices?.length ? (
                  <option value="">لا يوجد أجهزة</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name || `Device #${d.id}`}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleQuickSync}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-60"
                type="button"
                disabled={syncing}
              >
                {syncing ? "جارٍ المزامنة..." : "مزامنة الآن"}
              </button>
              <button
                onClick={() => navigate("/fingerprint-devices")}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                type="button"
                disabled={syncing}
              >
                إدارة الأجهزة
              </button>
              <button
                onClick={() => navigate("/attendance-logs")}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                type="button"
                disabled={syncing}
              >
                عرض السجلات
              </button>
            </div>
          </div>

          {/* بطاقات الملخص */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                عدد الموظفين الحاصلين على إنذارات
              </h2>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{employeesWithWarningsCount}</p>
            </div>
          </div>

          {/* Dashboard API Stats */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md rounded-lg p-6">
                <h2 className="text-sm font-medium flex items-center gap-2 opacity-90">
                  <CalendarIcon className="h-5 w-5" />
                  التعيينات هذا الشهر
                </h2>
                <p className="text-3xl font-bold mt-2">{dashboardData.stats.new_hires_this_month}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md rounded-lg p-6">
                <h2 className="text-sm font-medium flex items-center gap-2 opacity-90">
                  <CheckCircleIcon className="h-5 w-5" />
                  الحاضرون اليوم
                </h2>
                <p className="text-3xl font-bold mt-2">{dashboardData.attendance.present_today}</p>
                <p className="text-xs opacity-75 mt-1">
                  معدل الحضور: {dashboardData.attendance.attendance_rate}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md rounded-lg p-6">
                <h2 className="text-sm font-medium flex items-center gap-2 opacity-90">
                  <ClockIcon className="h-5 w-5" />
                  المتأخرون اليوم
                </h2>
                <p className="text-3xl font-bold mt-2">{dashboardData.attendance.late_today}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md rounded-lg p-6">
                <h2 className="text-sm font-medium flex items-center gap-2 opacity-90">
                  <BanknotesIcon className="h-5 w-5" />
                  إجمالي المرتبات
                </h2>
                <p className="text-2xl font-bold mt-2">
                  {new Intl.NumberFormat('ar-SD').format(dashboardData.payroll.total_gross)}
                </p>
                <p className="text-xs opacity-75">جنيه سوداني</p>
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">الطلبات المعلقة</h2>
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100"
                    onClick={() => navigate("/employees")}
                  >
                    <span className="text-gray-700">إجازات معلقة</span>
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                      {dashboardData.pending.leaves}
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100"
                    onClick={() => navigate("/employees")}
                  >
                    <span className="text-gray-700">سلف معلقة</span>
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                      {dashboardData.pending.advances}
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
                    onClick={() => navigate("/reports")}
                  >
                    <span className="text-gray-700">إنذارات هذا الشهر</span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                      {dashboardData.pending.warnings}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">النشاطات الأخيرة</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {dashboardData.recent_activities?.slice(0, 5).map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 border-b border-gray-100">
                      <span className="text-lg">
                        {activity.type === 'leave' ? '🏖️' : '⚠️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{activity.message}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.status === 'pending' ? 'معلق' :
                           activity.status === 'approved' ? 'موافق' : 'مرفوض'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">الأقسام</h2>
                <div className="space-y-3">
                  {dashboardData.department_stats?.slice(0, 5).map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between">
                      <span className="text-gray-700">{dept.name}</span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                        {dept.employee_count} موظف
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate("/add-employee")}
              className="bg-indigo-600 text-white p-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <UserGroupIcon className="h-5 w-5" />
              إضافة موظف
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <DocumentIcon className="h-5 w-5" />
              التقارير
            </button>
            <button
              onClick={() => navigate("/bank-exports")}
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <BanknotesIcon className="h-5 w-5" />
              التصدير البنكي
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              الإعدادات
            </button>
          </div>
        </main>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}