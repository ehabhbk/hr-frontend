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

const fmt = (v) => {
  if (v == null || v === 0) return "0";
  return Number(v).toLocaleString("en-US");
};

const GRADIENTS = [
  "from-indigo-600 to-purple-600", "from-blue-500 to-cyan-500",
  "from-red-500 to-rose-600", "from-teal-500 to-emerald-500",
  "from-orange-500 to-red-500", "from-gray-600 to-slate-700",
  "from-yellow-500 to-amber-600", "from-green-600 to-emerald-600",
  "from-emerald-500 to-teal-600", "from-violet-500 to-purple-600",
  "from-amber-500 to-yellow-500", "from-sky-500 to-blue-600",
];

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
    datasets: [{ data: chartData?.map((d) => d.value) || [], backgroundColor: chartData?.map((d) => d.color) || [], borderWidth: 2, borderColor: "#fff" }],
  });

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "55%",
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12, family: "Tahoma" }, usePointStyle: true, padding: 14, boxWidth: 10 } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
    },
  };

  const smallChartOptions = { ...chartOptions, cutout: "50%" };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="لوحة التحكم" />

        <main className="flex-1 p-6 space-y-8">

          {/* Sync bar */}
          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100">
            <span className="text-indigo-800 font-bold flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              مزامنة جهاز البصمة
            </span>
            <div className="flex flex-wrap gap-2 items-center">
              <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)} disabled={!devices?.length || syncing}>
                {!devices?.length ? (<option value="">لا يوجد أجهزة</option>) : (
                  devices.map((d) => (<option key={d.id} value={String(d.id)}>{d.name || `جهاز #${d.id}`}</option>))
                )}
              </select>
              <button onClick={handleQuickSync} disabled={syncing}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 shadow-sm">
                {syncing ? "جارٍ المزامنة..." : "مزامنة الآن"}
              </button>
              <button onClick={() => navigate("/attendance-logs")}
                className="border border-gray-300 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 font-medium">
                سجل الحضور
              </button>
            </div>
          </div>

          {/* ===== ROW 1: MAIN CARDS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card bg={GRADIENTS[0]} icon="👥" label="إجمالي الموظفين" value={s.total_employees} />
            <Card bg={GRADIENTS[1]} icon="🏢" label="عدد الأقسام" value={s.total_departments} />
            <Card bg={GRADIENTS[2]} icon="🚫" label="مفصولون" value={s.terminated_employees} />
            <Card bg={GRADIENTS[3]} icon="🌴" label="في إجازة الآن" value={s.on_leave_now} />
          </div>

          {/* ===== ROW 2 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card bg={GRADIENTS[4]} icon="❌" label="غياب اليوم" value={s.absences_today} />
            <Card bg={GRADIENTS[5]} icon="⏳" label="غير مداومين اليوم" value={s.not_clocked_today} />
            <Card bg={GRADIENTS[6]} icon="⏰" label="متأخرون اليوم" value={s.late_today} />
            <Card bg={GRADIENTS[7]} icon="💰" label="المرتبات الأساسية" value={`${fmt(s.total_base_salaries)} ج`} />
          </div>

          {/* ===== ROW 3 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card bg={GRADIENTS[8]} icon="💵" label="إجمالي المرتبات" value={`${fmt(s.total_gross_salaries)} ج`} />
            <Card bg={GRADIENTS[9]} icon="💳" label="سلف الشهر الجاري" value={`${fmt(s.advances_this_month)} ج`} />
            <Card bg={GRADIENTS[10]} icon="⚠️" label="إنذارات هذا الشهر" value={s.warnings_this_month} />
            <Card bg={GRADIENTS[11]} icon="📊" label="إنذارات السنة" value={s.warnings_this_year} />
          </div>

          {/* ===== ROW 4 ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card bg={GRADIENTS[3]} icon="📋" label="إجازات الشهر" value={s.leaves_this_month} />
            <Card bg={GRADIENTS[1]} icon="📋" label="إجازات السنة" value={s.leaves_this_year} />
            <Card bg={GRADIENTS[7]} icon="📊" label="نسبة الحضور" value={s.attendance_rate != null ? `${s.attendance_rate}%` : "-"} />
            {data?.ideal_employee && (
              <div
                onClick={() => navigate(`/employee/${data.ideal_employee.id}`)}
                className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transform transition hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🏆</span>
                  <span className="text-3xl font-extrabold tracking-tight">{data.ideal_employee.combined_score}%</span>
                </div>
                <p className="font-bold text-lg truncate">{data.ideal_employee.name}</p>
                <p className="text-xs opacity-90">الموظف المثالي للشهر</p>
              </div>
            )}
          </div>

          {/* ===== PIE CHARTS GRID (3 cols on desktop, 2 on tablet) ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PieCard title="📊 الحضور والغياب" data={pie.attendance} options={chartOptions} makeChartData={makeChartData} />
            <PieCard title="📋 الإجازات (معتمدة)" data={pie.leaves} options={chartOptions} makeChartData={makeChartData} />
            <PieCard title="💳 السلفيات هذا الشهر" data={pie.advances} options={chartOptions} makeChartData={makeChartData} formatter={fmt} />
            <PieCard title="⚠️ الإنذارات (الإجمالي)" data={pie.warnings} options={chartOptions} makeChartData={makeChartData} />
            <PieCard title="🏢 الأقسام — عدد الموظفين" data={pie.departments_employees} options={smallChartOptions} makeChartData={makeChartData} />
            <PieCard title="🏢 الأقسام — إجمالي المرتبات" data={pie.departments_salary} options={smallChartOptions} makeChartData={makeChartData} formatter={fmt} />
            <PieCard title="💼 توزيع المسميات الوظيفية" data={pie.positions} options={smallChartOptions} makeChartData={makeChartData} />
            <PieCard title="📋 الإجازات المرفوضة" data={pie.leaves_rejected} options={smallChartOptions} makeChartData={makeChartData} />
            <PieCard title="📋 الإجازات المعلقة" data={pie.leaves_pending} options={smallChartOptions} makeChartData={makeChartData} />
            <PieCard title="📊 حالة طلبات الإجازات" data={pie.leaves_status} options={smallChartOptions} makeChartData={makeChartData} />
            <PieCard title="💳 طلبات السلفيات" data={pie.advances_count} options={smallChartOptions} makeChartData={makeChartData} />
          </div>

          {/* ===== IDEAL EMPLOYEE + ACTIVITIES + PENDING ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Ideal employee detail */}
            {data?.ideal_employee && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-xl">🏆</span> الموظف المثالي — تحليل الأداء
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={getStorageUrl(data.ideal_employee.profile_photo) || "/default-avatar.svg"}
                    alt={data.ideal_employee.name}
                    className="w-20 h-20 rounded-full border-2 border-amber-400 object-cover shadow"
                    onError={(e) => { (e.target).src = "/default-avatar.svg"; }}
                  />
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{data.ideal_employee.name}</p>
                    <p className="text-sm text-gray-500">{data.ideal_employee.position || "-"}</p>
                    <p className="text-sm text-gray-500">{data.ideal_employee.department || "-"}</p>
                    {data.ideal_employee.stars && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-amber-500 text-base">
                          {"★".repeat(data.ideal_employee.stars.total)}
                          {"☆".repeat(30 - data.ideal_employee.stars.total)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ScoreBox label="حضور" value={data.ideal_employee.attendance_score} />
                  <ScoreBox label="إجازات" value={data.ideal_employee.leave_score} />
                  <ScoreBox label="إنذارات" value={data.ideal_employee.warning_score} />
                </div>
              </div>
            )}

            {/* Pending */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">📌</span> الطلبات المعلقة
              </h3>
              <div className="space-y-4">
                <PendingRow label="إجازات معلقة" count={data?.pending?.leaves || 0} color="blue" />
                <PendingRow label="سلف معلقة" count={data?.pending?.advances || 0} color="green" />
              </div>
            </div>

            {/* Activities */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">🕐</span> النشاطات الأخيرة
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data?.recent_activities?.slice(0, 8).map((act, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-lg mt-0.5">{act.type === "leave" ? "🏖️" : act.type === "warning" ? "⚠️" : "💳"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium truncate">{act.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          act.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          act.status === "approved" ? "bg-green-100 text-green-700" :
                          act.status === "active" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {act.status === "pending" ? "معلق" : act.status === "approved" ? "موافق" : act.status === "active" ? "نشط" : act.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {act.date ? new Date(act.date).toLocaleString("ar-EG") : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== DEPARTMENT DETAILED STATS ===== */}
          {data?.department_stats?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-700 mb-5 flex items-center gap-2">
                <span className="text-xl">🏢</span> إحصائيات الأقسام
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.department_stats.map((dept, idx) => (
                  <div key={dept.id}
                    className={`rounded-2xl p-5 text-white shadow-md hover:shadow-lg transform transition hover:scale-105 bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]}`}
                  >
                    <p className="font-bold text-lg truncate">{dept.name}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-center">
                        <p className="text-3xl font-extrabold">{dept.employee_count}</p>
                        <p className="text-xs opacity-80">موظف</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-extrabold">{fmt(dept.total_salary)}</p>
                        <p className="text-xs opacity-80">المرتبات</p>
                      </div>
                    </div>
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

/* ===== SUB COMPONENTS ===== */

function Card({ bg, icon, label, value }) {
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-xl p-4 text-white shadow-md hover:shadow-lg transform transition hover:scale-105 cursor-default`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-extrabold tracking-tight">{value ?? "-"}</span>
      </div>
      <p className="text-base font-bold opacity-95">{label}</p>
    </div>
  );
}

function PieCard({ title, data, options, makeChartData, formatter }) {
  if (!data || data.every((d) => d.value === 0)) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
        <p className="text-xs text-gray-400 text-center py-10">لا توجد بيانات</p>
      </div>
    );
  }

  const chartData = makeChartData(data);
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
      <h3 className="text-sm font-bold text-gray-700 mb-4">{title}</h3>
      <div className="flex flex-col items-center gap-4">
        <div className="w-44 h-44">
          <Doughnut data={chartData} options={options} />
        </div>
        <div className="w-full space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-gray-700">{item.label}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">{formatter ? formatter(item.value) : item.value}</span>
                <span className="text-xs text-gray-400">({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, value }) {
  const color = value >= 80 ? "bg-green-50 text-green-700" : value >= 60 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700";
  return (
    <div className={`p-3 rounded-xl text-center ${color}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function PendingRow({ label, count, color }) {
  const map = { blue: "bg-blue-500", green: "bg-green-500", red: "bg-red-500", yellow: "bg-yellow-500" };
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <span className="font-medium text-gray-700">{label}</span>
      <span className={`${map[color] || "bg-gray-500"} text-white px-4 py-1 rounded-full text-sm font-bold`}>
        {count}
      </span>
    </div>
  );
}
