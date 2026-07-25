import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
  leave: "bg-blue-100 text-blue-700",
  rest: "bg-gray-100 text-gray-400",
  holiday: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS: Record<string, string> = {
  present: "حضور",
  absent: "غياب",
  late: "متأخر",
  leave: "إجازة",
  rest: "عطلة",
  holiday: "عطلة رسمية",
};

export default function CalendarPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchAttendance(); }, [year, month, selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data?.data?.data || res.data?.data || []);
    } catch {}
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const params: any = { month: monthStr };
      if (selectedEmployee !== "all") params.employee_id = selectedEmployee;
      const res = await api.get("/attendance-records", { params });
      const records = res.data?.data?.data || res.data?.data || [];
      const map: Record<string, any> = {};
      records.forEach((r: any) => {
        const key = `${r.employee_id}-${r.date}`;
        map[key] = r;
      });
      setAttendance(map);
    } catch { toast.error("خطأ في تحميل بيانات الحضور"); }
    finally { setLoading(false); }
  };

  const getDayStatus = (empId: number, day: number): string => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = `${empId}-${dateStr}`;
    const record = attendance[key];
    if (!record) {
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) return "rest";
      return "";
    }
    if (record.is_on_leave || record.active_leave) return "leave";
    if (record.is_absent) return "absent";
    if (record.is_late) return "late";
    return "present";
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="تقويم الحضور" />
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={prevMonth} className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">السابق</button>
              <h2 className="text-lg font-bold text-gray-800">{monthName}</h2>
              <button onClick={nextMonth} className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">التالي</button>
            </div>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">جميع الموظفين</option>
              {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS[key]}`} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-right font-medium text-gray-600 min-w-[140px]">الموظف</th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <th key={d} className="px-1 py-3 text-center font-medium text-gray-600 min-w-[50px]">
                        <div>{d}</div>
                        <div className="text-[10px] text-gray-400">{DAY_NAMES[new Date(year, month, d).getDay()]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(emp => selectedEmployee === "all" || emp.id == selectedEmployee).map(emp => (
                    <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">{emp.name}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                        const status = getDayStatus(emp.id, d);
                        return (
                          <td key={d} className="px-1 py-2 text-center">
                            {status ? (
                              <div className={`w-full h-8 rounded flex items-center justify-center text-[10px] font-medium ${STATUS_COLORS[status]}`}>
                                {STATUS_LABELS[status]}
                              </div>
                            ) : (
                              <div className="w-full h-8" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
