import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import api, { getStorageUrl } from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { listDevices, syncDevice, syncAttendance } from "../services/fingerprintApi";

ChartJS.register(ArcElement, Tooltip, Legend);

const formatCurrency = (v) => {
  if (!v || v === 0) return "0";
  return new Intl.NumberFormat("ar-SD").format(v);
};

const GRADIENTS = {
  total: "from-indigo-500 to-purple-600",
  departments: "from-blue-500 to-cyan-500",
  terminated: "from-red-500 to-rose-600",
  vacation: "from-teal-500 to-emerald-500",
  absent: "from-orange-500 to-red-500",
  nocheck: "from-gray-500 to-slate-600",
  late: "from-yellow-500 to-amber-600",
  salary: "from-green-500 to-emerald-600",
  gross: "from-emerald-500 to-teal-600",
  advances: "from-violet-500 to-purple-600",
  ideal: "from-amber-500 to-yellow-500",
  base: "from-sky-500 to-blue-600",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [data, setData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    api.get("/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => setData(res.data)).catch(console.error);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await listDevices();
        const arr = Array.isArray(d) ? d : d?.data || [];
        if (cancelled) return;
        setDevices(arr);
        if (!selectedDeviceId && arr?.[0]?.id) setSelectedDeviceId(String(arr[0].id));
      } catch { }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      if (selectedDeviceId) {
        const res = await syncDevice(selectedDeviceId);
        toast.success(res?.message || "تمت المزامنة");
      } else {
        const res = await syncAttendance();
        toast.success(res?.message || "تمت المزامنة");
      }
    } catch (e) {
      toast.error(e?.message || "فشل المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  const s = data?.stats || {};
  const pie = data?.pie_charts || {};

  const makeChartData = (chartData) => ({
    labels: chartData?.map((d) => d.label) || [],
    datasets: [
      {
        data: chartData?.map((d) => d.value) || [],
        backgroundColor: chartData?.map((d) => d.color) || [],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { font: { size: 11, family: "Tahoma" }, usePointStyle: true, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="لوحة التحكم" />

        <main className="flex-1 p-5 space-y-6">

          {/* Sync bar */}
          <div className="bg-white shadow-sm rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100">
            <span className="text-indigo-800 font-semibold text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              مزامنة جهاز البصمة
            </span>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="border rounded-lg px-3 py-1.5 text-sm"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={!devices?.length || syncing}
              >
                {!devices?.length ? (
                  <option value="">لا يوجد أجهزة</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name || `جهاز #${d.id}`}</option>
                  ))
                )}
              </select>
              <button onClick={handleQuickSync} disabled={syncing}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50"
              >
                {syncing ? "جارٍ المزامنة..." : "مزامنة الآن"}
              </button>
              <button onClick={() => navigate("/attendance-logs")}
                className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
              >
                سجل الحضور
              </button>
            </div>
          </div>

          {/* ===== STAT CARDS ROW 1 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard gradient={GRADIENTS.total} icon="👥" label="إجمالي الموظفين" value={s.total_employees} />
            <StatCard gradient={GRADIENTS.departments} icon="🏢" label="عدد الأقسام" value={s.total_departments} />
            <StatCard gradient={GRADIENTS.terminated} icon="🚫" label="مفصولون" value={s.terminated_employees} />
            <StatCard gradient={GRADIENTS.vacation} icon="🌴" label="في إجازة الآن" value={s.on_leave_now} />
          </div>

          {/* ===== STAT CARDS ROW 2 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard gradient={GRADIENTS.absent} icon="❌" label="غياب اليوم" value={s.absences_today} />
            <StatCard gradient={GRADIENTS.nocheck} icon="⏳" label="غير مداومين اليوم" value={s.not_clocked_today} />
            <StatCard gradient={GRADIENTS.late} icon="⏰" label="متأخرون اليوم" value={s.late_today} />
            <StatCard gradient={GRADIENTS.base} icon="💰" label="المرتبات الأساسية" value={formatCurrency(s.total_base_salaries)} />
          </div>

          {/* ===== STAT CARDS ROW 3 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard gradient={GRADIENTS.gross} icon="💵" label="إجمالي المرتبات" value={formatCurrency(s.total_gross_salaries)} />
            <StatCard gradient={GRADIENTS.advances} icon="💳" label="سلف الشهر الجاري" value={formatCurrency(s.advances_this_month)} />
            <StatCard gradient={GRADIENTS.total} icon="⚠️" label="إنذارات هذا الشهر" value={s.warnings_this_month} />
            <StatCard gradient={GRADIENTS.terminated} icon="⚠️" label="إنذارات هذه السنة" value={s.warnings_this_year} />
          </div>

          {/* ===== STAT CARDS ROW 4 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard gradient={GRADIENTS.vacation} icon="📋" label="طلبات إجازات الشهر" value={s.leaves_this_month} />
            <StatCard gradient={GRADIENTS.departments} icon="📋" label="طلبات إجازات السنة" value={s.leaves_this_year} />
            <StatCard gradient={GRADIENTS.attendance_rate ? "from-green-500 to-teal-500" : "from-gray-400 to-gray-500"} icon="📊" label="نسبة الحضور" value={s.attendance_rate != null ? `${s.attendance_rate}%` : "-"} />
            <StatCard gradient={GRADIENTS.ideal} icon="🏆" label="معدل الحضور" value={s.attendance_rate != null ? `${s.attendance_rate}%` : "-"} />
          </div>

          {/* ===== PIE CHARTS + IDEAL EMPLOYEE + ACTIVITIES ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COL 1: Pie charts */}
            <div className="space-y-6">
              <PieCard title="الحضور والغياب" data={pie.attendance} options={chartOptions} makeChartData={makeChartData} />
              <PieCard title="الإجازات (معتمدة)" data={pie.leaves} options={chartOptions} makeChartData={makeChartData} />
            </div>

            <div className="space-y-6">
              <PieCard title="السلفيات هذا الشهر" data={pie.advances} options={chartOptions} makeChartData={makeChartData} formatter={formatCurrency} />
              <PieCard title="الإنذارات" data={pie.warnings} options={chartOptions} makeChartData={makeChartData} />
            </div>

            {/* COL 3: Ideal employee + Pending + Activities */}
            <div className="space-y-6">
              {/* Ideal employee */}
              {data?.ideal_employee && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="text-lg">🏆</span> الموظف المثالي لهذا الشهر
                  </h3>
                  <div className="flex items-center gap-4">
                    <img
                      src={getStorageUrl(data.ideal_employee.profile_photo) || "/default-avatar.svg"}
                      alt={data.ideal_employee.name}
                      className="w-16 h-16 rounded-full border-2 border-amber-400 object-cover shadow"
                      onError={(e) => { (e.target).src = "/default-avatar.svg"; }}
                    />
                    <div>
                      <p className="font-bold text-gray-800">{data.ideal_employee.name}</p>
                      <p className="text-xs text-gray-500">{data.ideal_employee.position || "-"}</p>
                      <p className="text-xs text-gray-500">{data.ideal_employee.department || "-"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {data.ideal_employee.stars && (
                          <span className="text-amber-500 text-sm">
                            {"★".repeat(data.ideal_employee.stars.total)}
                            {"☆".repeat(30 - data.ideal_employee.stars.total)}
                          </span>
                        )}
                        <span className="text-amber-600 font-bold text-sm">
                          {data.ideal_employee.combined_score}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                    <div className={`p-2 rounded-lg ${data.ideal_employee.attendance_score >= 70 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      حضور<br /><strong>{data.ideal_employee.attendance_score}</strong>
                    </div>
                    <div className={`p-2 rounded-lg ${data.ideal_employee.leave_score >= 70 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      إجازات<br /><strong>{data.ideal_employee.leave_score}</strong>
                    </div>
                    <div className={`p-2 rounded-lg ${data.ideal_employee.warning_score >= 70 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      إنذارات<br /><strong>{data.ideal_employee.warning_score}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending requests */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">📌</span> الطلبات المعلقة
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-700">إجازات معلقة</span>
                    <span className="bg-blue-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">{data?.pending?.leaves || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-700">سلف معلقة</span>
                    <span className="bg-green-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">{data?.pending?.advances || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent activities */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">🕐</span> النشاطات الأخيرة
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data?.recent_activities?.slice(0, 7).map((act, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 border-b border-gray-50 last:border-0">
                      <span className="text-base mt-0.5">
                        {act.type === "leave" ? "🏖️" : act.type === "warning" ? "⚠️" : "💳"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{act.message}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          act.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          act.status === "approved" ? "bg-green-100 text-green-700" :
                          act.status === "active" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {act.status === "pending" ? "معلق" :
                           act.status === "approved" ? "موافق" :
                           act.status === "active" ? "نشط" : act.status}
                        </span>
                        <span className="text-[10px] text-gray-400 mr-1">
                          {act.date ? new Date(act.date).toLocaleString("ar-EG") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== DEPARTMENT STATS ===== */}
          {data?.department_stats?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-lg">🏢</span> إحصائيات الأقسام
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.department_stats.map((dept) => (
                  <div key={dept.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-sm font-bold text-gray-800 truncate">{dept.name}</p>
                    <p className="text-lg font-bold text-indigo-600">{dept.employee_count}</p>
                    <p className="text-[10px] text-gray-500">موظف</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">{formatCurrency(dept.total_salary)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}

function StatCard({ gradient, icon, label, value }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white shadow-md hover:shadow-lg transform transition hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-extrabold tracking-tight">{value ?? "-"}</span>
      </div>
      <p className="text-xs font-medium opacity-90">{label}</p>
    </div>
  );
}

function PieCard({ title, data, options, makeChartData, formatter }) {
  if (!data || data.every((d) => d.value === 0)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
        <p className="text-xs text-gray-400 text-center py-6">لا توجد بيانات</p>
      </div>
    );
  }

  const chartData = makeChartData(data);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="w-36 h-36 flex-shrink-0">
          <Doughnut data={chartData} options={options} />
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-bold text-gray-700">
                {formatter ? formatter(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
