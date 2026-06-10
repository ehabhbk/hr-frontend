import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDateDisplay } from "../utils/dateUtils";

const TABS = [
  { key: "leaves", label: "طلبات الإجازات", icon: "🏖️" },
  { key: "advances", label: "طلبات السلفيات", icon: "💰" },
  { key: "resignations", label: "طلبات الاستقالة", icon: "🚪" },
];

const typeLabels = {
  official: "رسمية",
  sick: "مرضية",
  maternity: "أمومة",
  hajj: "حج",
  unpaid: "بدون مرتب",
};

function getStatusBadge(status) {
  switch (status) {
    case "pending": return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-medium">قيد الانتظار</span>;
    case "approved": return <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-medium">تمت الموافقة</span>;
    case "rejected": return <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-medium">مرفوض</span>;
    default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-xs">{status}</span>;
  }
}

export default function RequestsPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab || "leaves");

  const permissions = React.useMemo(() => {
    try {
      const p = localStorage.getItem("permissions");
      return p ? JSON.parse(p) : [];
    } catch {
      return [];
    }
  }, []);

  const canViewRequests = permissions.includes('*') || permissions.includes('requests.view');
  const canApproveRequests = permissions.includes('*') || permissions.includes('requests.approve');
  const canRejectRequests = permissions.includes('*') || permissions.includes('requests.reject');
  const canViewLeaves = permissions.includes('*') || permissions.includes('requests.leaves');
  const canViewAdvances = permissions.includes('*') || permissions.includes('requests.advances');
  const canViewResignations = permissions.includes('*') || permissions.includes('requests.resignations');

  const availableTabs = React.useMemo(
    () => TABS.filter(t => {
      if (t.key === 'leaves') return canViewLeaves;
      if (t.key === 'advances') return canViewAdvances;
      if (t.key === 'resignations') return canViewResignations;
      return false;
    }),
    [canViewLeaves, canViewAdvances, canViewResignations]
  );
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [resignationRequests, setResignationRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "1");
  const [filters, setFilters] = useState({ from_date: "", to_date: "", employee_id: "" });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  useEffect(() => {
    if (tab && availableTabs.some(t => t.key === tab)) {
      setActiveTab(tab);
    } else if (availableTabs.length > 0 && !availableTabs.some(t => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [tab, availableTabs]);

  useEffect(() => {
    fetchRequests();
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const res = await api.get("/employees").catch(() => null);
    if (res) setEmployees(res.data?.data || res.data || []);
  }

  async function fetchRequests() {
    setLoading(true);
    const [leavesRes, advancesRes, resignationsRes] = await Promise.all([
      api.get("/leaves/requests").catch(() => null),
      api.get("/advances/requests").catch(() => null),
      api.get("/resignation-requests").catch(() => null),
    ]);
    if (leavesRes) setLeaveRequests(leavesRes.data?.data || leavesRes.data || []);
    if (advancesRes) setAdvanceRequests(advancesRes.data?.data || advancesRes.data || []);
    if (resignationsRes) setResignationRequests(resignationsRes.data?.data || resignationsRes.data || []);
    setLoading(false);
  }

  const filteredLeaves = useMemo(() => {
    let data = leaveRequests;
    if (filters.employee_id) data = data.filter(r => String(r.employee_id) === String(filters.employee_id));
    if (filters.from_date) data = data.filter(r => r.from_date && r.from_date >= filters.from_date);
    if (filters.to_date) data = data.filter(r => r.to_date && r.to_date <= filters.to_date);
    return data;
  }, [leaveRequests, filters]);

  const filteredAdvances = useMemo(() => {
    let data = advanceRequests;
    if (filters.employee_id) data = data.filter(r => String(r.employee_id) === String(filters.employee_id));
    if (filters.from_date) data = data.filter(r => r.created_at && r.created_at.slice(0, 10) >= filters.from_date);
    if (filters.to_date) data = data.filter(r => r.created_at && r.created_at.slice(0, 10) <= filters.to_date);
    return data;
  }, [advanceRequests, filters]);

  const filteredResignations = useMemo(() => {
    let data = resignationRequests;
    if (filters.employee_id) data = data.filter(r => String(r.employee_id) === String(filters.employee_id));
    if (filters.from_date) data = data.filter(r => r.resignation_date && r.resignation_date >= filters.from_date);
    if (filters.to_date) data = data.filter(r => r.resignation_date && r.resignation_date <= filters.to_date);
    return data;
  }, [resignationRequests, filters]);

  const leaveStats = useMemo(() => ({
    total: filteredLeaves.length,
    pending: filteredLeaves.filter(r => r.status === "pending").length,
    approved: filteredLeaves.filter(r => r.status === "approved").length,
    rejected: filteredLeaves.filter(r => r.status === "rejected").length,
  }), [filteredLeaves]);

  const advanceStats = useMemo(() => ({
    total: filteredAdvances.length,
    pending: filteredAdvances.filter(r => r.status === "pending").length,
    approved: filteredAdvances.filter(r => r.status === "approved").length,
    rejected: filteredAdvances.filter(r => r.status === "rejected").length,
  }), [filteredAdvances]);

  const resignationStats = useMemo(() => ({
    total: filteredResignations.length,
    pending: filteredResignations.filter(r => r.status === "pending").length,
    approved: filteredResignations.filter(r => r.status === "approved").length,
    rejected: filteredResignations.filter(r => r.status === "rejected").length,
  }), [filteredResignations]);

  const currentStats = activeTab === "leaves" ? leaveStats : activeTab === "advances" ? advanceStats : resignationStats;

  async function handleLeaveStatus(id, status) {
    setActionLoading(id);
    try {
      await api.post(`/leaves/requests/${id}/status`, { status });
      toast.success(`تم ${status === "approved" ? "الموافقة على" : "رفض"} الإجازة ✅`);
      fetchRequests();
    } catch (err) {
      toast.error("فشل تحديث الحالة ❌");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAdvanceStatus(id, action) {
    setActionLoading(id);
    try {
      await api.post(`/advances/requests/${id}/${action}`);
      toast.success(`تم ${action === "approve" ? "الموافقة على" : "رفض"} السلفة ✅`);
      fetchRequests();
    } catch (err) {
      toast.error("فشل تحديث الحالة ❌");
    } finally {
      setActionLoading(null);
    }
  }

  function printLeavesReport() {
    const rows = filteredLeaves.map((r, i) => {
      const empName = r.employee?.name || r.employee_id;
      const type = typeLabels[r.type] || r.type;
      const fromDate = formatDateDisplay(r.from_date);
      const toDate = formatDateDisplay(r.to_date);
      const days = r.days || 1;
      const statusMap = { pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض" };
      const status = statusMap[r.status] || r.status;
      return `<tr><td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td><td style="padding:8px;border:1px solid #ddd">${empName}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${type}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${fromDate}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${toDate}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${days}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${status}</td></tr>`;
    });
    openPrintWindow("تقرير طلبات الإجازات", ["#", "الموظف", "النوع", "من", "إلى", "الأيام", "الحالة"], rows);
  }

  async function handleResignationStatus(id, status) {
    setActionLoading(id);
    try {
      await api.post(`/resignation-requests/${id}/status`, { status });
      toast.success(`تم ${status === "approved" ? "الموافقة على" : "رفض"} طلب الاستقالة ✅`);
      fetchRequests();
    } catch (err) {
      toast.error("فشل تحديث الحالة ❌");
    } finally {
      setActionLoading(null);
    }
  }

  function printResignationsReport() {
    const rows = filteredResignations.map((r, i) => {
      const empName = r.employee?.name || r.employee_id;
      const date = r.resignation_date ? formatDateDisplay(r.resignation_date) : "-";
      const reason = r.reason || "-";
      const statusMap = { pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض" };
      const status = statusMap[r.status] || r.status;
      return `<tr><td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td><td style="padding:8px;border:1px solid #ddd">${empName}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${date}</td><td style="padding:8px;border:1px solid #ddd">${reason}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${status}</td></tr>`;
    });
    openPrintWindow("تقرير طلبات الاستقالة", ["#", "الموظف", "تاريخ الاستقالة", "السبب", "الحالة"], rows);
  }

  function printAdvancesReport() {
    const rows = filteredAdvances.map((r, i) => {
      const empName = r.employee?.name || r.employee_id;
      const type = r.type === "short" ? "قصيرة" : "طويلة";
      const amount = parseFloat(r.amount).toLocaleString() + " ج.س";
      const installments = (r.installments || 1) + " شهر";
      const date = formatDateDisplay(r.created_at);
      const statusMap = { pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض" };
      const status = statusMap[r.status] || r.status;
      return `<tr><td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td><td style="padding:8px;border:1px solid #ddd">${empName}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${type}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${amount}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${installments}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${date}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${status}</td></tr>`;
    });
    openPrintWindow("تقرير طلبات السلفيات", ["#", "الموظف", "النوع", "المبلغ", "الأقساط", "التاريخ", "الحالة"], rows);
  }

  function openPrintWindow(title, headers, rows) {
    const filterInfo = [];
    const selEmp = employees.find(e => String(e.id) === String(filters.employee_id));
    if (selEmp) filterInfo.push(`الموظف: ${selEmp.name}`);
    if (filters.from_date) filterInfo.push(`من: ${filters.from_date}`);
    if (filters.to_date) filterInfo.push(`إلى: ${filters.to_date}`);
    const filterStr = filterInfo.length ? `<p style="color:#666;font-size:13px;margin-bottom:15px;">${filterInfo.join(" | ")}</p>` : "";

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:30px}h1{color:#1e40af;font-size:22px;margin-bottom:5px;text-align:center}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#1e40af;color:#fff;padding:10px;border:1px solid #1e40af;text-align:center;font-size:13px}td{padding:8px;border:1px solid #ddd;text-align:center;font-size:12px}tr:nth-child(even){background:#f8fafc}.footer{margin-top:20px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:15px}@media print{@page{size:landscape;margin:1cm}}</style></head><body><h1>📋 ${title}</h1>${filterStr}<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table><div class="footer">تم إنشاء التقرير في ${new Date().toLocaleDateString("en-GB")} - نظام إدارة الموارد البشرية</div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }

  if (!canViewRequests || availableTabs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex" dir="rtl">
        <Sidebar onCollapseChange={setSidebarCollapsed} />
        <div className="flex-1 flex flex-col" style={{ marginRight: sidebarCollapsed ? "5rem" : "16rem" }}>
          <Topbar title="📋 الطلبيات" />
          <main className="flex-1 overflow-auto p-6">
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">لا تملك صلاحية الوصول</h2>
              <p className="text-gray-500">ليس لديك صلاحية لعرض صفحة الطلبيات</p>
            </div>
          </main>
        </div>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} rtl={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex" dir="rtl">
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col" style={{ marginRight: sidebarCollapsed ? "5rem" : "16rem" }}>
        <Topbar title="📋 الطلبيات" />
        <main className="flex-1 overflow-auto p-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b px-6">
              <div className="flex gap-6">
                {availableTabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTab(t.key);
                      navigate(`/requests/${t.key}`);
                    }}
                    className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col relative">
                <label className="text-sm text-gray-600 mb-1">الموظف</label>
                <input
                  type="text"
                  placeholder="ابحث باسم الموظف..."
                  value={employeeSearch}
                  onChange={e => { setEmployeeSearch(e.target.value); setShowEmployeeDropdown(true); }}
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
                          onMouseDown={() => {
                            setEmployeeSearch(e.name);
                            setFilters(f => ({ ...f, employee_id: e.id }));
                            setShowEmployeeDropdown(false);
                          }}
                          className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
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
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              {(filters.from_date || filters.to_date || filters.employee_id) && (
                <button
                  onClick={() => { setFilters({ from_date: "", to_date: "", employee_id: "" }); setEmployeeSearch(""); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  إلغاء التصفية
                </button>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{currentStats.total}</div>
              <div className="text-sm text-gray-500 mt-1">الإجمالي</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{currentStats.pending}</div>
              <div className="text-sm text-gray-500 mt-1">قيد الانتظار</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{currentStats.approved}</div>
              <div className="text-sm text-gray-500 mt-1">تمت الموافقة</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{currentStats.rejected}</div>
              <div className="text-sm text-gray-500 mt-1">مرفوض</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <button
                onClick={activeTab === "leaves" ? printLeavesReport : activeTab === "advances" ? printAdvancesReport : printResignationsReport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
              >
                🖨️ طباعة
              </button>
              <h3 className="font-bold flex items-center gap-2">
                <span>📋</span>
                {activeTab === "leaves" ? "جميع طلبات الإجازات" : activeTab === "advances" ? "جميع طلبات السلفيات" : "جميع طلبات الاستقالة"}
                <span className="text-gray-400 text-sm font-normal">({activeTab === "leaves" ? filteredLeaves.length : activeTab === "advances" ? filteredAdvances.length : filteredResignations.length})</span>
              </h3>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
              ) : activeTab === "leaves" ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-right">#</th>
                        <th className="border p-3 text-right">الموظف</th>
                        <th className="border p-3 text-right">النوع</th>
                        <th className="border p-3 text-right">من</th>
                        <th className="border p-3 text-right">إلى</th>
                        <th className="border p-3 text-right">الأيام</th>
                        <th className="border p-3 text-right">المرفق</th>
                        <th className="border p-3 text-right">الحالة</th>
                        <th className="border p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="border p-4 text-center text-gray-500">لا توجد طلبات</td>
                        </tr>
                      ) : (
                        filteredLeaves.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border p-3">{i + 1}</td>
                            <td className="border p-3 font-medium">{r.employee?.name || r.employee_id}</td>
                            <td className="border p-3">
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">{typeLabels[r.type] || r.type}</span>
                            </td>
                            <td className="border p-3">{formatDateDisplay(r.from_date)}</td>
                            <td className="border p-3">{formatDateDisplay(r.to_date)}</td>
                            <td className="border p-3">{r.days || 1}</td>
                            <td className="border p-3">
                              {r.attachment_url ? (
                                <a href={r.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                                  📎 عرض المرفق
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="border p-3">{getStatusBadge(r.status)}</td>
                            <td className="border p-3 text-center">
                              {r.status === "pending" && (canApproveRequests || canRejectRequests) && (
                                <div className="flex gap-2 justify-center">
                                  {canRejectRequests && (
                                    <button
                                      onClick={() => handleLeaveStatus(r.id, "rejected")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs disabled:bg-red-400"
                                    >
                                      {actionLoading === r.id ? "..." : "رفض"}
                                    </button>
                                  )}
                                  {canApproveRequests && (
                                    <button
                                      onClick={() => handleLeaveStatus(r.id, "approved")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:bg-green-400"
                                    >
                                      {actionLoading === r.id ? "..." : "موافقة"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "advances" ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-right">#</th>
                        <th className="border p-3 text-right">الموظف</th>
                        <th className="border p-3 text-right">النوع</th>
                        <th className="border p-3 text-right">المبلغ</th>
                        <th className="border p-3 text-right">الأقساط</th>
                        <th className="border p-3 text-right">التاريخ</th>
                        <th className="border p-3 text-right">المرفق</th>
                        <th className="border p-3 text-right">الحالة</th>
                        <th className="border p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdvances.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="border p-4 text-center text-gray-500">لا توجد طلبات</td>
                        </tr>
                      ) : (
                        filteredAdvances.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border p-3">{i + 1}</td>
                            <td className="border p-3 font-medium">{r.employee?.name || r.employee_id}</td>
                            <td className="border p-3">
                              <span className={`px-2 py-1 rounded text-xs ${r.type === "short" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                                {r.type === "short" ? "قصيرة" : "طويلة"}
                              </span>
                            </td>
                            <td className="border p-3">{parseFloat(r.amount).toLocaleString()} ج.س</td>
                            <td className="border p-3">{r.installments || 1} شهر</td>
                            <td className="border p-3">{formatDateDisplay(r.created_at)}</td>
                            <td className="border p-3 text-center">
                              {r.attachment_url ? (
                                <a href={r.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                                  📎 عرض
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="border p-3">{getStatusBadge(r.status)}</td>
                            <td className="border p-3 text-center">
                              {r.status === "pending" && (canApproveRequests || canRejectRequests) && (
                                <div className="flex gap-2 justify-center">
                                  {canRejectRequests && (
                                    <button
                                      onClick={() => handleAdvanceStatus(r.id, "reject")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs disabled:bg-red-400"
                                    >
                                      {actionLoading === r.id ? "..." : "رفض"}
                                    </button>
                                  )}
                                  {canApproveRequests && (
                                    <button
                                      onClick={() => handleAdvanceStatus(r.id, "approve")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:bg-green-400"
                                    >
                                      {actionLoading === r.id ? "..." : "موافقة"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-right">#</th>
                        <th className="border p-3 text-right">الموظف</th>
                        <th className="border p-3 text-right">تاريخ الاستقالة</th>
                        <th className="border p-3 text-right">السبب</th>
                        <th className="border p-3 text-right">الحالة</th>
                        <th className="border p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResignations.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="border p-4 text-center text-gray-500">لا توجد طلبات</td>
                        </tr>
                      ) : (
                        filteredResignations.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border p-3">{i + 1}</td>
                            <td className="border p-3 font-medium">{r.employee?.name || r.employee_id}</td>
                            <td className="border p-3">{formatDateDisplay(r.resignation_date)}</td>
                            <td className="border p-3 max-w-xs truncate">{r.reason || "-"}</td>
                            <td className="border p-3">{getStatusBadge(r.status)}</td>
                            <td className="border p-3 text-center">
                              {r.status === "pending" && (canApproveRequests || canRejectRequests) && (
                                <div className="flex gap-2 justify-center">
                                  {canRejectRequests && (
                                    <button
                                      onClick={() => handleResignationStatus(r.id, "rejected")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs disabled:bg-red-400"
                                    >
                                      {actionLoading === r.id ? "..." : "رفض"}
                                    </button>
                                  )}
                                  {canApproveRequests && (
                                    <button
                                      onClick={() => handleResignationStatus(r.id, "approved")}
                                      disabled={actionLoading === r.id}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:bg-green-400"
                                    >
                                      {actionLoading === r.id ? "..." : "موافقة"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} rtl={true} />
    </div>
  );
}
