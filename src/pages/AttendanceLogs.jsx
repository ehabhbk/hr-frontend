import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listAttendanceLogs, listDevices } from "../services/fingerprintApi";

export default function AttendanceLogs() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  const [loading, setLoading] = useState(true);
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
      const data = await listAttendanceLogs(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      toast.error(e.message || "فشل في جلب السجلات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = useMemo(() => (Array.isArray(logs) ? logs.length : 0), [logs]);

  const deviceNameById = useMemo(() => {
    const m = new Map();
    for (const d of devices || []) m.set(String(d.id), d.name || `Device #${d.id}`);
    return m;
  }, [devices]);

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar sticky />

      <div className="flex-1 flex flex-col">
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
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
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
              <label className="text-sm text-gray-600 mb-1">الموظف (ID)</label>
              <input
                value={filters.employee_id}
                onChange={(e) => setFilters((f) => ({ ...f, employee_id: e.target.value }))}
                className="border rounded-lg px-3 py-2"
                placeholder="مثال: 12"
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
                    {d.name || `Device #${d.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 md:mr-auto">
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

          <div className="text-indigo-800 font-bold">
            عدد السجلات: <span className="font-extrabold">{count}</span>
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
                      <th className="p-3">الموظف</th>
                      <th className="p-3">الجهاز</th>
                      <th className="p-3">الوقت</th>
                      <th className="p-3">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs || []).map((row, idx) => {
                      const employeeLabel =
                        row.employee_name ||
                        row.employee?.name ||
                        row.employee_id ||
                        row.user_id ||
                        "-";
                      const deviceLabel =
                        row.device_name ||
                        deviceNameById.get(String(row.device_id)) ||
                        row.device_id ||
                        "-";
                      const timeLabel = row.time || row.timestamp || row.created_at || "-";
                      const typeLabel = row.type || row.event || row.status || "-";
                      return (
                        <tr key={row.id || idx} className="border-t">
                          <td className="p-3">{employeeLabel}</td>
                          <td className="p-3">{deviceLabel}</td>
                          <td className="p-3">{timeLabel}</td>
                          <td className="p-3">{typeLabel}</td>
                        </tr>
                      );
                    })}
                    {!logs?.length && (
                      <tr>
                        <td className="p-6 text-center text-gray-600" colSpan={4}>
                          لا توجد سجلات.
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

