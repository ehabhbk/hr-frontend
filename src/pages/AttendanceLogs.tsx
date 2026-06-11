import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
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
  const token = localStorage.getItem("token");

  // Check permissions
  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch {
      return [];
    }
  }, []);

  const canExcuse = permissions.includes('*') || permissions.includes('attendance.excuse') || permissions.includes('attendance.manage');

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calculatingAbsences, setCalculatingAbsences] = useState(false);
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

  const todayStr = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    from_date: todayStr,
    to_date: todayStr,
    device_id: "",
    employee_id: "",
  });
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

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
      if (filters.employee_id) params.employee_id = filters.employee_id;

      // Fetch calculated attendance records (this has the correct late/on_time types)
      const recordsRes = await api.get("/attendance-records", {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const records = recordsRes.data?.data?.data || recordsRes.data?.data || recordsRes.data || [];
      
// Transform attendance records for display
      const processedLogs = Array.isArray(records) ? records.flatMap(r => {
        const logs = [];
        const deviceName = r.device_name || r.employee?.attendance_device?.name || 
                          r.employee?.attendanceDevice?.name || r.employee?.attendance_device?.host || '-';
        
        // Check-in record
        if (r.check_in_time) {
          logs.push({
            id: `in-${r.id}`,
            record_id: r.id,
            device_user_id: r.employee?.device_user_id || '-',
            employee_id: r.employee_id,
            employee_name: r.employee?.name || '-',
            device_id: r.employee?.attendance_device_id || null,
            device_name: deviceName,
            device_host: null,
            timestamp: r.check_in_time,
            type: r.check_in_type === 'late' ? 'attendance_late' : 
                  r.check_in_type === 'early' ? 'attendance_early' : 'attendance',
            state: r.check_in_type === 'late' ? 3 : (r.check_in_type === 'early' ? 2 : 1),
            deduction_amount: r.delay_deduction || 0,
            has_delay: r.has_delay || false,
            excused: r.delay_excused || false,
            is_manual: false,
            check_in_type: r.check_in_type,
            delay_minutes: r.check_in_delay_minutes || 0,
          });
        }
        
        // Check-out record
        if (r.check_out_time) {
          logs.push({
            id: `out-${r.id}`,
            record_id: r.id,
            device_user_id: r.employee?.device_user_id || '-',
            employee_id: r.employee_id,
            employee_name: r.employee?.name || '-',
            device_id: r.employee?.attendance_device_id || null,
            device_name: deviceName,
            device_host: null,
            timestamp: r.check_out_time,
            type: r.check_out_type === 'early' ? 'checkout_early' : 
                  r.check_out_type === 'late' ? 'checkout_late' : 'checkout',
            state: r.check_out_type === 'early' ? 5 : (r.check_out_type === 'late' ? 6 : 4),
            deduction_amount: r.early_leave_deduction || 0,
            has_delay: false,
            excused: r.check_out_excused || false,
            is_manual: false,
            check_out_type: r.check_out_type,
            early_minutes: r.check_out_early_minutes || 0,
          });
        }
        
        // Absence record
        if (!r.check_in_time && r.is_absent) {
          logs.push({
            id: `abs-${r.id}`,
            record_id: r.id,
            device_user_id: r.employee?.device_user_id || '-',
            employee_id: r.employee_id,
            employee_name: r.employee?.name || '-',
            device_id: r.employee?.attendance_device_id || null,
            device_name: deviceName,
            device_host: null,
            timestamp: r.date,
            type: 'absence',
            state: 0,
            deduction_amount: r.absence_deduction || 0,
            has_delay: false,
            excused: r.absence_excused || false,
            is_manual: false,
            is_absent: true,
          });
        }
        
        return logs;
      }) : [];
      
      // Sort by timestamp descending
      processedLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });
      
      setLogs(processedLogs);
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
        const stored = res.data?.stored ?? 0;
        const skipped = res.data?.skipped ?? 0;
        
        // Process device logs to calculate delays based on shifts
        if (stored > 0) {
          await api.post("/attendance-records/process-logs", {
            device_id: deviceId
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        
        if (stored > 0) {
          toast.success(`✅ تمت المزامنة بنجاح - ${stored} سجل جديد`);
        } else if (skipped > 0) {
          toast.info(`ℹ️ لا توجد سجلات جديدة (${skipped} سجل مكرر)`);
        } else {
          toast.info(`ℹ️ لا توجد سجلات جديدة للمزامنة`);
        }
      } else {
        const res = await api.post("/attendance-device/sync-all", {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Process all device logs
        await api.post("/attendance-records/process-logs", {}, {
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

  const handleCalculateAbsences = async () => {
    setCalculatingAbsences(true);
    try {
      const res = await api.post("/attendance-records/calculate-absences", {
        from_date: filters.from_date,
        to_date: filters.to_date,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data?.message || "✅ تم احتساب الغياب");
      await loadLogs();
    } catch (e) {
      toast.error(e.message || "فشل في احتساب الغياب");
    } finally {
      setCalculatingAbsences(false);
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

      const token = localStorage.getItem("token");
      
      const res = await api.get("/pdf/export/attendance", {
        params,
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'text/html'
        }
      });

      // Open in new window
      const printWindow = window.open('', '_blank');
      printWindow.document.write(res.data);
      printWindow.document.close();
      toast.success("تم فتح التقرير للطباعة");
    } catch (e) {
      toast.error("فشل في تصدير التقرير");
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
    if (type === 'absence' || type === 0 || type === '0') return TYPE_COLORS['absence'];
    // If it's a string like 'حضور' or 'انصراف'
    if (type === 'حضور') return TYPE_COLORS['attendance'];
    if (type === 'انصراف') return TYPE_COLORS['checkout'];
    return { label: type || '-', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    let d;
    if (typeof timestamp === 'string' && !timestamp.includes('T')) {
      d = new Date(timestamp + 'Z');
    } else {
      d = new Date(timestamp);
    }
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = dayNames[d.getDay()];
    const date = d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${dayName} ${date} ${time}`;
  };

  const handleWeeklyReport = async () => {
    if (!filters.employee_id) {
      toast.warning("⚠️ اختر موظفاً أولاً");
      return;
    }
    try {
      const employee = employees.find(e => e.id === parseInt(filters.employee_id));
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - dayOfWeek);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);

      const fromDate = sunday.toISOString().split('T')[0];
      const toDate = saturday.toISOString().split('T')[0];

      const res = await api.get("/attendance-records", {
        params: { employee_id: filters.employee_id, from_date: fromDate, to_date: toDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      const records = res.data?.data?.data || res.data?.data || res.data || [];

      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(sunday);
        day.setDate(sunday.getDate() + i);
        const dateStr = day.toISOString().split('T')[0];
        const dayRecord = records.find(r => r.date === dateStr || (r.check_in_time && r.check_in_time.slice(0, 10) === dateStr) || (r.check_out_time && r.check_out_time.slice(0, 10) === dateStr));
        weekDays.push({
          dayName: dayNames[i],
          date: dateStr,
          dateDisplay: day.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
          record: dayRecord || null,
          isToday: dateStr === now.toISOString().split('T')[0],
        });
      }

      setWeeklyReport({
        employeeName: employee?.name || `موظف #${filters.employee_id}`,
        fromDate,
        toDate,
        weekDays,
      });
      setShowWeeklyModal(true);
    } catch (e) {
      toast.error("فشل تحميل التقرير الأسبوعي");
    }
  };

  const printWeeklyReport = () => {
    if (!weeklyReport) return;
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const rows = weeklyReport.weekDays.map((day, idx) => {
      const r = day.record;
      const checkInTime = r?.check_in_time ? new Date(r.check_in_time + (r.check_in_time.includes('T') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
      const checkOutTime = r?.check_out_time ? new Date(r.check_out_time + (r.check_out_time.includes('T') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
      const checkInType = r?.is_absent ? 'غياب' : r?.check_in_type === 'late' ? 'حضور متأخر' : r?.check_in_type === 'early' ? 'حضور مبكر' : r?.check_in_time ? 'حضور' : '-';
      const checkOutType = r?.check_out_type === 'early' ? 'انصراف مبكر' : r?.check_out_type === 'late' ? 'انصراف متأخر' : r?.check_out_time ? 'انصراف' : '-';
      return `<tr${day.isToday ? ' style="background:#f0fdf4"' : ''}><td style="padding:10px;border:1px solid #ddd">${day.dayName}</td><td style="padding:10px;border:1px solid #ddd">${day.dateDisplay}</td><td style="padding:10px;border:1px solid #ddd">${checkInType}</td><td style="padding:10px;border:1px solid #ddd">${checkInTime}</td><td style="padding:10px;border:1px solid #ddd">${checkOutType}</td><td style="padding:10px;border:1px solid #ddd">${checkOutTime}</td></tr>`;
    });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير الحضور الأسبوعي</title><style>body{font-family:Tahoma,sans-serif;padding:20px}h1{color:#0f766e;font-size:20px;margin-bottom:5px}.info{color:#666;margin-bottom:15px;font-size:14px}table{width:100%;border-collapse:collapse}th{background:#ccfbf1;padding:10px;border:1px solid #ddd;text-align:right;color:#0f766e}td{padding:10px;border:1px solid #ddd}@media print{@page{size:landscape}}</style></head><body><h1>📊 تقرير الحضور الأسبوعي</h1><div class="info">الموظف: ${weeklyReport.employeeName} | الأسبوع: ${weeklyReport.fromDate} إلى ${weeklyReport.toDate}</div><table><thead><tr><th>اليوم</th><th>التاريخ</th><th>الحضور</th><th>وقت الحضور</th><th>الانصراف</th><th>وقت الانصراف</th></tr></thead><tbody>${rows.join('')}</tbody></table></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
        <Topbar title="سجل الحضور والانصراف" />

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

            <div className="flex flex-col relative">
              <label className="text-sm text-gray-600 mb-1">بحث الموظف</label>
              <input
                type="text"
                placeholder="ابحث باسم الموظف..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setShowEmployeeDropdown(true);
                }}
                onFocus={() => setShowEmployeeDropdown(true)}
                onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                className="border rounded-lg px-3 py-2 w-48"
              />
              {showEmployeeDropdown && employeeSearch && (
                <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {employees
                    .filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
                    .slice(0, 10)
                    .map(e => (
                      <div
                        key={e.id}
                        onClick={() => {
                          setEmployeeSearch(e.name);
                          setFilters(f => ({ ...f, employee_id: e.id }));
                          setShowEmployeeDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm"
                      >
                        {e.name}
                      </div>
                    ))}
                  {employees.filter(e => e.name.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-gray-400 text-sm">لا توجد نتائج</div>
                  )}
                </div>
              )}
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
                onClick={handleWeeklyReport}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-semibold"
                type="button"
                disabled={!filters.employee_id}
              >
                📊 تقرير الحضور الأسبوعي
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
          <button
            onClick={handleCalculateAbsences}
            disabled={calculatingAbsences}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 mr-auto"
            type="button"
          >
            {calculatingAbsences ? "جارٍ احتساب الغياب..." : "🚫 احتساب الغياب"}
          </button>
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
                              {row.delay_minutes > 0 && ` (${row.delay_minutes} د)`}
                              {row.early_minutes > 0 && ` (${row.early_minutes} د)`}
                            </span>
                          </td>
                          <td className="p-3 text-red-600 font-medium">
                            {row.deduction_amount > 0 ? Number(row.deduction_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="p-3">
                            {canExcuse && ((row.has_delay || row.is_absent || row.check_out_type === 'early') && !row.excused) && (
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
                      // Extract actual record ID from display ID (in-14, out-14, abs-14)
                      const actualRecordId = selectedRecord.record_id || selectedRecord.id.replace(/^(in|out|abs)-/, '');
                      
                      let endpoint = `/attendance-records/${actualRecordId}`;
                      
                      // Determine excuse type based on record type and ID prefix
                      const recordId = selectedRecord.id || '';
                      
                      if (selectedRecord.is_absent) {
                        // Absence - use excuse-absence
                        endpoint += '/excuse-absence';
                      } else if (recordId.startsWith('out-')) {
                        // Checkout record (early leave) - use excuse-early-leave
                        endpoint += '/excuse-early-leave';
                      } else if (selectedRecord.is_manual) {
                        endpoint += '/excuse';
                      } else {
                        // Check-in record (delay) - use excuse-delay
                        endpoint += '/excuse-delay';
                      }
                      
                      console.log('Excuse endpoint:', endpoint, 'record:', selectedRecord);
                      
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
                      console.error('Excuse error:', err);
                      toast.error("فشل في قبول العذر: " + (err.response?.data?.message || err.message));
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

        {showWeeklyModal && weeklyReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-teal-800">📊 تقرير الحضور الأسبوعي</h3>
                <button onClick={() => setShowWeeklyModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>
              <div className="mb-4 text-gray-600">
                <span className="font-semibold">الموظف:</span> {weeklyReport.employeeName}
                <span className="mx-3">|</span>
                <span className="font-semibold">الأسبوع:</span> {weeklyReport.fromDate} إلى {weeklyReport.toDate}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-teal-50 text-right">
                      <th className="p-3 border-b font-semibold text-teal-800">اليوم</th>
                      <th className="p-3 border-b font-semibold text-teal-800">التاريخ</th>
                      <th className="p-3 border-b font-semibold text-teal-800">الحضور</th>
                      <th className="p-3 border-b font-semibold text-teal-800">وقت الحضور</th>
                      <th className="p-3 border-b font-semibold text-teal-800">الانصراف</th>
                      <th className="p-3 border-b font-semibold text-teal-800">وقت الانصراف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyReport.weekDays.map((day, idx) => {
                      const r = day.record;
                      const checkInTime = r?.check_in_time ? new Date(r.check_in_time + (r.check_in_time.includes('T') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
                      const checkOutTime = r?.check_out_time ? new Date(r.check_out_time + (r.check_out_time.includes('T') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';

                      let checkInType = r?.is_absent ? 'غياب' : r?.check_in_type === 'late' ? 'حضور متأخر' : r?.check_in_type === 'early' ? 'حضور مبكر' : r?.check_in_time ? 'حضور' : '-';
                      let checkOutType = r?.check_out_type === 'early' ? 'انصراف مبكر' : r?.check_out_type === 'late' ? 'انصراف متأخر' : r?.check_out_time ? 'انصراف' : '-';

                      const checkInColor = r?.is_absent ? 'bg-red-100 text-red-700' : r?.check_in_type === 'late' ? 'bg-red-100 text-red-700' : r?.check_in_type === 'early' ? 'bg-blue-100 text-blue-700' : r?.check_in_time ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
                      const checkOutColor = r?.check_out_type === 'early' ? 'bg-yellow-100 text-yellow-700' : r?.check_out_type === 'late' ? 'bg-orange-100 text-orange-700' : r?.check_out_time ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500';

                      return (
                        <tr key={idx} className={`${day.isToday ? 'bg-teal-50' : ''} hover:bg-gray-50 border-b`}>
                          <td className="p-3 font-medium">{day.dayName}</td>
                          <td className="p-3">{day.dateDisplay}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${checkInColor}`}>{checkInType}</span></td>
                          <td className="p-3 text-gray-600">{checkInTime}</td>
                          <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${checkOutColor}`}>{checkOutType}</span></td>
                          <td className="p-3 text-gray-600">{checkOutTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-4">
                <button onClick={printWeeklyReport} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">🖨️ طباعة</button>
                <button onClick={() => setShowWeeklyModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">إغلاق</button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
