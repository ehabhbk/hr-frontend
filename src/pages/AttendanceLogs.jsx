import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const TYPE_COLORS = {
  'attendance': { label: 'حضور', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'attendance_early': { label: 'حضور مبكر', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'attendance_late': { label: 'حضور متأخر', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'checkout': { label: 'انصراف', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'checkout_early': { label: 'انصراف مبكر', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  'checkout_late': { label: 'انصراف متأخر', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'absence': { label: 'غياب', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
};

export default function AttendanceLogs() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const token = localStorage.getItem("token");

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showExcuseModal, setShowExcuseModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [excuseReason, setExcuseReason] = useState("");

  const [manualEntry, setManualEntry] = useState({
    employee_id: "",
    type: "check_in", // check_in or check_out
    date: new Date().toISOString().split('T')[0],
    time: "",
    notes: "",
  });

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
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
      const res = await api.get("/attendance-device", { headers: { Authorization: `Bearer ${token}` } });
      setDevices(res.data?.data || []);
    } catch (e) {
      console.log("No devices");
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/employees", { headers: { Authorization: `Bearer ${token}` } });
      setEmployees(res.data?.data || []);
    } catch (e) {
      console.error("No employees");
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.device_id) params.device_id = filters.device_id;

      // Fetch device logs
      const deviceRes = await api.get("/attendance-logs", {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const deviceLogs = deviceRes.data?.data?.data || deviceRes.data?.data || deviceRes.data || [];
      
      // Fetch manual records
      const recordsRes = await api.get("/attendance-records", {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const records = recordsRes.data?.data?.data || recordsRes.data?.data || recordsRes.data || [];
      
      // Transform manual records to match device log format
      const manualLogs = Array.isArray(records) ? records.map(r => ({
        id: `manual-${r.id}`,
        record_id: r.id,
        device_user_id: r.employee?.device_user_id || '-',
        employee_id: r.employee_id,
        employee_name: r.employee?.name || '-',
        device_id: null,
        device_name: 'تسجيل يدوي',
        device_host: null,
        timestamp: r.check_in_time || r.check_out_time || r.date,
        type: r.is_absent ? 'absence' : (r.check_in_type || (r.check_out_type ? 'checkout' : 'attendance')),
        state: r.check_in_type === 'late' ? 3 : (r.check_in_type === 'early' ? 2 : 1),
        deduction_amount: r.total_deduction || 0,
        has_delay: r.has_delay || false,
        excused: r.delay_excused || r.absence_excused || false,
        is_absent: r.is_absent || false,
        absence_excused: r.absence_excused || false,
        is_manual: true,
        check_in_type: r.check_in_type,
        check_out_type: r.check_out_type,
      })) : [];
      
      // Merge and sort by timestamp
      const allLogs = [...deviceLogs, ...manualLogs].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });
      
      setLogs(allLogs);
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
        const res = await api.post(`/attendance-device/${deviceId}/sync`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`تم المزامنة بنجاح: ${res.data?.fetched || 0} سجل`);
      } else {
        const res = await api.post("/attendance-device/sync-all", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`تم المزامنة بنجاح`);
      }
      await loadLogs();
    } catch (e) {
      toast.error(e.message || "فشل في المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportPDF = async () => {
    if (logs.length === 0) {
      toast.warning("لا توجد سجلات للتصدير");
      return;
    }

    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;

      const res = await api.get("/pdf/export/attendance", {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${filters.from_date || 'all'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تصدير PDF بنجاح");
    } catch (e) {
      toast.error("فشل في تصدير PDF");
    }
  };

  const handleManualEntry = async () => {
    if (!manualEntry.employee_id) {
      toast.error("الرجاء اختيار الموظف");
      return;
    }
    if (!manualEntry.time) {
      toast.error("الرجاء إدخال الوقت");
      return;
    }

    try {
      // Create datetime string
      const dateTime = `${manualEntry.date} ${manualEntry.time}:00`;
      
      if (manualEntry.type === "check_in") {
        await api.post("/attendance-records", {
          employee_id: manualEntry.employee_id,
          date: manualEntry.date,
          check_in_time: dateTime,
          notes: manualEntry.notes || "تسجيل يدوي",
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post("/attendance-records", {
          employee_id: manualEntry.employee_id,
          date: manualEntry.date,
          check_out_time: dateTime,
          notes: manualEntry.notes || "تسجيل يدوي",
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      toast.success("تم تسجيل الحضور بنجاح");
      setShowManualModal(false);
      setManualEntry({
        employee_id: "",
        type: "check_in",
        date: new Date().toISOString().split('T')[0],
        time: "",
        notes: "",
      });
      loadLogs();
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل في تسجيل الحضور");
    }
  };

  useEffect(() => {
    loadDevices();
    loadEmployees();
    loadLogs();
  }, []);

  const getDeviceName = (log) => {
    if (log.device_name) return log.device_name;
    if (log.device_id) {
      const dev = devices.find(d => d.id === parseInt(log.device_id));
      return dev?.name || `جهاز #${log.device_id}`;
    }
    return log.device_host || '-';
  };

  const getTypeInfo = (log) => {
    // For manual records, check check_in_type or check_out_type
    if (log.is_manual) {
      if (log.check_in_type === 'late') return TYPE_COLORS['attendance_late'];
      if (log.check_in_type === 'early') return TYPE_COLORS['attendance_early'];
      if (log.check_in_type === 'on_time') return TYPE_COLORS['attendance'];
      if (log.check_out_type === 'early') return TYPE_COLORS['checkout_early'];
      if (log.check_out_type === 'late') return TYPE_COLORS['checkout_late'];
      if (log.check_out_type === 'on_time') return TYPE_COLORS['checkout'];
      // Fallback based on type
      if (log.type === 'attendance' || log.type === 'check_in') return TYPE_COLORS['attendance'];
      if (log.type === 'checkout' || log.type === 'check_out') return TYPE_COLORS['checkout'];
    }
    
    // Check the 'type' field which comes from the API as a string
    const type = log.type;
    if (type === 'attendance' || type === 1 || type === '1') return TYPE_COLORS['attendance'];
    if (type === 'attendance_early' || type === 2 || type === '2') return TYPE_COLORS['attendance_early'];
    if (type === 'attendance_late' || type === 3 || type === '3') return TYPE_COLORS['attendance_late'];
    if (type === 'checkout' || type === 4 || type === '4') return TYPE_COLORS['checkout'];
    if (type === 'checkout_early' || type === 5 || type === '5') return TYPE_COLORS['checkout_early'];
    if (type === 'checkout_late' || type === 6 || type === '6') return TYPE_COLORS['checkout_late'];
    // If it's a string like 'حضور' or 'انصراف'
    if (type === 'حضور') return TYPE_COLORS['attendance'];
    if (type === 'انصراف') return TYPE_COLORS['checkout'];
    return { label: type || '-', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    // Handle both string and Date objects
    let d;
    if (typeof timestamp === 'string' && !timestamp.includes('T')) {
      // Format: "2026-04-04 09:14:00" - append Z to treat as UTC
      d = new Date(timestamp + 'Z');
    } else {
      d = new Date(timestamp);
    }
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
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
                value={filters.from_date}
                onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">إلى</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
                className="border rounded-lg px-3 py-2"
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
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name || `جهاز #${d.id}`}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 md:mr-auto">
              <button
                onClick={() => setShowManualModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
                type="button"
              >
                + تسجيل يدوي
              </button>
              <button
                onClick={loadLogs}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                type="button"
                disabled={loading}
              >
                بحث
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
                type="button"
              >
                تصدير PDF
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-indigo-800 font-bold">
              عدد السجلات: <span className="font-extrabold">{logs.length}</span>
            </span>
            {devices.filter(d => d.last_sync_at).length > 0 && (
              <span className="text-gray-600">
                آخر مزامنة: {new Date(Math.max(...devices.filter(d => d.last_sync_at).map(d => new Date(d.last_sync_at)))).toLocaleString("ar-EG")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">دليل الأنواع:</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['attendance'].bg} ${TYPE_COLORS['attendance'].text} ${TYPE_COLORS['attendance'].border}`}>حضور</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['attendance_early'].bg} ${TYPE_COLORS['attendance_early'].text} ${TYPE_COLORS['attendance_early'].border}`}>حضور مبكر</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['attendance_late'].bg} ${TYPE_COLORS['attendance_late'].text} ${TYPE_COLORS['attendance_late'].border}`}>حضور متأخر</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['checkout'].bg} ${TYPE_COLORS['checkout'].text} ${TYPE_COLORS['checkout'].border}`}>انصراف</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['checkout_early'].bg} ${TYPE_COLORS['checkout_early'].text} ${TYPE_COLORS['checkout_early'].border}`}>انصراف مبكر</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${TYPE_COLORS['checkout_late'].bg} ${TYPE_COLORS['checkout_late'].text} ${TYPE_COLORS['checkout_late'].border}`}>انصراف متأخر</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleSync()}
            disabled={syncing}
            className="bg-white text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 font-semibold disabled:opacity-50"
            type="button"
          >
            {syncing ? "جارٍ المزامنة..." : "🔄 مزامنة جميع الأجهزة"}
          </button>
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSync(d.id)}
              disabled={syncing}
              className="bg-white/80 text-gray-700 px-3 py-2 rounded-lg hover:bg-white text-sm disabled:opacity-50"
              type="button"
            >
              🔄 {d.name || `جهاز #${d.id}`}
            </button>
          ))}
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
                      <th className="p-3">الموظف</th>
                      <th className="p-3">رقم البصمة</th>
                      <th className="p-3">الجهاز</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">الخصم</th>
                      <th className="p-3">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((row, idx) => {
                      const typeInfo = getTypeInfo(row);
                      const dateTime = formatDateTime(row.timestamp);
                      return (
                        <tr key={row.id || idx} className="border-t hover:bg-gray-50">
                          <td className="p-3 text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-semibold text-indigo-700">
                            {row.employee_name || (row.employee_id ? `موظف #${row.employee_id}` : '-')}
                          </td>
                          <td className="p-3 font-mono text-sm">{row.device_user_id || "-"}</td>
                          <td className="p-3 text-gray-600">{getDeviceName(row)}</td>
                          <td className="p-3 font-mono text-sm">{dateTime}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="p-3 text-red-600 font-medium">
                            {row.deduction_amount > 0 ? Number(row.deduction_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="p-3">
                            {(row.has_delay || row.is_absent) && !row.excused && (
                              <button
                                onClick={() => {
                                  setSelectedRecord(row);
                                  setShowExcuseModal(true);
                                }}
                                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                              >
                                {row.is_absent ? 'عذر غياب' : 'قبول عذر'}
                              </button>
                            )}
                            {row.excused && (
                              <span className="text-xs text-green-600">✓ معطل</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!logs.length && (
                      <tr>
                        <td className="p-6 text-center text-gray-600" colSpan={8}>
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

        {showManualModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">تسجيل حضور يدوي</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الموظف *</label>
                  <select
                    value={manualEntry.employee_id}
                    onChange={(e) => setManualEntry(m => ({ ...m, employee_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">اختر الموظف</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">النوع *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualEntry(m => ({ ...m, type: "check_in" }))}
                      className={`flex-1 py-2 rounded-lg font-semibold ${
                        manualEntry.type === "check_in" 
                          ? "bg-green-600 text-white" 
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      حضور
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualEntry(m => ({ ...m, type: "check_out" }))}
                      className={`flex-1 py-2 rounded-lg font-semibold ${
                        manualEntry.type === "check_out" 
                          ? "bg-purple-600 text-white" 
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      انصراف
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">التاريخ *</label>
                    <input
                      type="date"
                      value={manualEntry.date}
                      onChange={(e) => setManualEntry(m => ({ ...m, date: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الوقت *</label>
                    <input
                      type="time"
                      value={manualEntry.time}
                      onChange={(e) => setManualEntry(m => ({ ...m, time: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظات</label>
                  <textarea
                    value={manualEntry.notes}
                    onChange={(e) => setManualEntry(m => ({ ...m, notes: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="ملاحظات اختيارية..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleManualEntry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {showExcuseModal && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">
                {selectedRecord.is_absent ? 'قبول عذر الغياب' : 'قبول عذر التأخير'}
              </h3>
              <p className="text-gray-600 mb-4">
                الموظف: {selectedRecord.employee_name || '-'}
                <br />
                {selectedRecord.is_absent ? (
                  <>التاريخ: {selectedRecord.timestamp ? formatDateTime(selectedRecord.timestamp) : selectedRecord.date}</>
                ) : (
                  <>الوقت: {formatDateTime(selectedRecord.timestamp)}</>
                )}
                {selectedRecord.deduction_amount > 0 && (
                  <>
                    <br />
                    الخصم: {Number(selectedRecord.deduction_amount).toLocaleString()} جنيه
                  </>
                )}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">سبب العذر (اختياري)</label>
                <textarea
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="أدخل سبب العذر..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowExcuseModal(false);
                    setExcuseReason("");
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    try {
                      const recordId = selectedRecord.is_absent 
                        ? selectedRecord.record_id || selectedRecord.id.replace('manual-', '')
                        : selectedRecord.id.replace('manual-', '');
                      
                      let endpoint = `/attendance-records/${recordId}`;
                      if (selectedRecord.is_absent) {
                        endpoint += '/excuse-absence';
                      } else if (selectedRecord.is_manual) {
                        endpoint += '/excuse';
                      } else {
                        endpoint = `/attendance-logs/${selectedRecord.id}/excuse`;
                      }
                      
                      await api.post(endpoint, {
                        reason: excuseReason || "عذر مقبول"
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      
                      toast.success("تم قبول العذر وإلغاء الخصم");
                      setShowExcuseModal(false);
                      setExcuseReason("");
                      loadLogs();
                    } catch (err) {
                      toast.error("فشل في قبول العذر");
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  قبول العذر وإلغاء الخصم
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
