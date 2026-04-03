import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listAttendanceLogs, listDevices, syncDevice, syncAttendance } from "../services/fingerprintApi";
import { formatDateArabic } from "../utils/dateUtils";

export default function AttendanceLogs() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    employee_id: "",
    device_id: "",
  });

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

  const loadDevices = async () => {
    try {
      const data = await listDevices();
      setDevices(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      // not fatal
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.employee_id) params.employee_id = filters.employee_id;
      if (filters.device_id) params.device_id = filters.device_id;
      
      const data = await listAttendanceLogs(params);
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      toast.error(e.message || "فشل في جلب السجلات");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (deviceId = null) => {
    setSyncing(true);
    try {
      if (deviceId) {
        const result = await syncDevice(deviceId);
        toast.success(`تم مزامنة الجهاز بنجاح. السجلات: ${result.fetched || 0}`);
      } else {
        await syncAttendance();
        toast.success(`تمت المزامنة`);
      }
      await load();
    } catch (e) {
      toast.error(e.message || "فشل في المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadDevices();
    load();
  }, []);

  const count = useMemo(() => (Array.isArray(logs) ? logs.length : 0), [logs]);

  const getTypeLabel = (log) => {
    if (log.type) return log.type;
    if (log.state !== null && log.state !== undefined) {
      return log.state === 1 ? 'انصراف' : 'حضور';
    }
    return '-';
  };

  const isCheckOut = (log) => {
    if (log.state !== null && log.state !== undefined) {
      return log.state === 1;
    }
    return log.type === 'انصراف';
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-xl font-semibold text-indigo-800">سجل الحضور والانصراف</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-3 focus:outline-none"
              type="button"
            >
              <img
                src={avatar || "/default-avatar.png"}
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
                  className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الملف الشخصي
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                  type="button"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="bg-gray-50 shadow-md p-4 flex flex-col gap-3 sticky top-16 z-40">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">من</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">إلى</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">رقم الموظف</label>
              <input
                value={filters.employee_id}
                onChange={(e) => setFilters((f) => ({ ...f, employee_id: e.target.value }))}
                className="border rounded-lg px-3 py-2"
                placeholder="رقم البصمة"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">الجهاز</label>
              <select
                value={filters.device_id}
                onChange={(e) => setFilters((f) => ({ ...f, device_id: e.target.value }))}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">الكل</option>
                {(devices || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || `جهاز #${d.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 md:mr-auto">
              <button
                onClick={() => handleSync(filters.device_id || null)}
                disabled={syncing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                type="button"
              >
                {syncing ? "جارٍ المزامنة..." : "🔄 مزامنة"}
              </button>
              <button
                onClick={load}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                type="button"
                disabled={loading}
              >
                بحث
              </button>
              <button
                onClick={() => {
                  setFilters({ from: "", to: "", employee_id: "", device_id: "" });
                  setTimeout(load, 0);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                type="button"
                disabled={loading}
              >
                مسح
              </button>
              <button
                onClick={() => navigate("/fingerprint-devices")}
                className="px-4 py-2 rounded-lg border hover:bg-gray-100"
                type="button"
              >
                الأجهزة
              </button>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <span className="text-indigo-800 font-bold">
              عدد السجلات: <span className="font-extrabold">{count}</span>
            </span>
            {devices.filter(d => d.last_sync_at).length > 0 && (
              <span className="text-gray-600">
                آخر مزامنة: {new Date(Math.max(...devices.filter(d => d.last_sync_at).map(d => new Date(d.last_sync_at)))).toLocaleString("ar-EG")}
              </span>
            )}
          </div>
        </div>

        <main className="flex-1 p-6">
          {loading ? (
            <div className="text-gray-700 font-semibold">جارٍ تحميل السجلات...</div>
          ) : (
            <div className="bg-white shadow rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-right text-gray-700">
                      <th className="p-3">#</th>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3">رقم البصمة</th>
                      <th className="p-3">الجهاز</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs || []).map((row, idx) => {
                      const isDeparture = isCheckOut(row);
                      return (
                        <tr key={row.id || idx} className="border-t hover:bg-gray-50">
                          <td className="p-3 text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-semibold">
                            {row.employee_name ? (
                              <span className="text-indigo-700">{row.employee_name}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3">{row.device_user_id || "-"}</td>
                          <td className="p-3 text-gray-600">
                            {row.device_name || row.device_host || "غير معروف"}
                          </td>
                          <td className="p-3">
                            {row.timestamp ? (
                              <div className="text-sm">{formatDateArabic(row.timestamp)}</div>
                            ) : "-"}
                          </td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isDeparture ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {getTypeLabel(row)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!logs?.length && (
                      <tr>
                        <td className="p-6 text-center text-gray-600" colSpan={6}>
                          <div className="flex flex-col items-center gap-2">
                            <span>لا توجد سجلات حضور</span>
                            <span className="text-sm text-gray-400">اضغط على "مزامنة" لجلب السجلات من الأجهزة</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
