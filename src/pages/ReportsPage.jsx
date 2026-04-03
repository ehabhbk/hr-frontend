import React, { useState, useEffect } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import {
  PrinterIcon,
  DocumentArrowDownIcon,
  ViewColumnsIcon,
  BanknotesIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
  StarIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";

const TABS = [
  { key: "dashboard", label: "لوحة التحكم", icon: ViewColumnsIcon, color: "from-slate-600 to-slate-800", gradient: "bg-gradient-to-r from-slate-600 to-slate-800" },
  { key: "salary", label: "كشف المرتبات", icon: BanknotesIcon, color: "from-emerald-500 to-green-600", gradient: "bg-gradient-to-r from-emerald-500 to-green-600" },
  { key: "incomeTax", label: "ضريبة الدخل", icon: ScaleIcon, color: "from-orange-500 to-red-500", gradient: "bg-gradient-to-r from-orange-500 to-red-500" },
  { key: "salaryIncrease", label: "الزيادة السنوية", icon: ArrowTrendingUpIcon, color: "from-blue-500 to-indigo-600", gradient: "bg-gradient-to-r from-blue-500 to-indigo-600" },
  { key: "leaveWarning", label: "الإجازات والإنذارات", icon: ClipboardDocumentListIcon, color: "from-violet-500 to-purple-600", gradient: "bg-gradient-to-r from-violet-500 to-purple-600" },
  { key: "evaluation", label: "تقييم الموظفين", icon: StarIcon, color: "from-amber-500 to-orange-500", gradient: "bg-gradient-to-r from-amber-500 to-orange-500" },
  { key: "department", label: "تقارير الأقسام", icon: BuildingOfficeIcon, color: "from-cyan-500 to-teal-600", gradient: "bg-gradient-to-r from-cyan-500 to-teal-600" },
  { key: "history", label: "سجل التقارير", icon: ClockIcon, color: "from-gray-500 to-gray-700", gradient: "bg-gradient-to-r from-gray-500 to-gray-700" },
  { key: "letters", label: "الخطابات", icon: DocumentTextIcon, color: "from-pink-500 to-rose-600", gradient: "bg-gradient-to-r from-pink-500 to-rose-600" },
];

const LETTER_TYPES = [
  { key: "termination", label: "إنهاء خدمة", icon: "🚫" },
  { key: "warning", label: "إنذار", icon: "⚠️" },
  { key: "good_conduct", label: "حسن سير", icon: "✅" },
  { key: "salary_verification", label: "إثبات مرتب", icon: "💵" },
  { key: "experience", label: "خبرة", icon: "🏆" },
  { key: "salary_increase", label: "زيادة مرتب", icon: "📈" },
  { key: "leave_approval", label: "موافقة إجازة", icon: "🌴" },
  { key: "loan_approval", label: "موافقة سلفة", icon: "💳" },
  { key: "appointment", label: "تعيين", icon: "📝" },
  { key: "transfer", label: "نقل", icon: "🔄" },
  { key: "commendation", label: "إشادة", icon: "🎉" },
];

const MONTHS = [
  { value: 1, label: "يناير" }, { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" }, { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" }, { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" }, { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" }, { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" }, { value: 12, label: "ديسمبر" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

function formatCurrency(num) {
  return num ? num.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) : "0.00";
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function ReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salaryReport, setSalaryReport] = useState([]);
  const [taxReport, setTaxReport] = useState([]);
  const [increaseReport, setIncreaseReport] = useState([]);
  const [leaveWarningReport, setLeaveWarningReport] = useState([]);
  const [evaluationReport, setEvaluationReport] = useState(null);
  const [departmentReport, setDepartmentReport] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [letterType, setLetterType] = useState("termination");
  const [letterData, setLetterData] = useState(null);
  const [letterParams, setLetterParams] = useState({});
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function exportToPDF(type) {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('month', month);
      params.append('year', year);
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (selectedEmployee) params.append('employee_id', selectedEmployee);

      const endpoints = {
        salary: '/pdf/salary-report',
        incomeTax: '/pdf/income-tax-report',
        leaveWarning: '/pdf/leave-warning-report',
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${endpoints[type]}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/pdf',
        },
        responseType: 'blob',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileNames = {
        salary: `كشف_المرتبات_${MONTHS.find(m => m.value === month)?.label}_${year}.pdf`,
        incomeTax: `تقرير_ضريبة_الدخل_${year}.pdf`,
        leaveWarning: `تقرير_الإجازات_والإنذارات_${year}.pdf`,
      };
      
      a.download = fileNames[type];
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('تم تصدير التقرير بنجاح');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('فشل في تصدير التقرير');
    } finally {
      setExporting(false);
    }
  }

  async function exportToExcel(type) {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', 'excel');
      params.append('month', month);
      params.append('year', year);
      if (selectedDepartment) params.append('department_id', selectedDepartment);

      const endpoints = {
        salary: '/reports/salary',
        incomeTax: '/reports/income-tax',
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}${endpoints[type]}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        toast.warning('لا توجد بيانات للتصدير');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      
      const fileNames = {
        salary: `كشف_المرتبات_${month}_${year}.xlsx`,
        incomeTax: `تقرير_ضريبة_الدخل_${year}.xlsx`,
      };
      
      XLSX.writeFile(wb, fileNames[type]);
      toast.success('تم تصدير ملف Excel بنجاح');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('فشل في تصدير ملف Excel');
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    switch (activeTab) {
      // eslint-disable-next-line default-case
      case "salary": loadSalaryReport(); break;
      case "incomeTax": loadTaxReport(); break;
      case "salaryIncrease": loadIncreaseReport(); break;
      case "leaveWarning": loadLeaveWarningReport(); break;
      case "evaluation": loadEvaluationReport(); break;
      case "department": loadDepartmentReport(); break;
      case "history": loadReportHistory(); break;
      case "dashboard": loadDashboard(); break;
    }
  }, [activeTab, month, year, selectedDepartment]);

  async function loadInitialData() {
    try {
      const [empRes, deptRes, summaryRes] = await Promise.all([
        api.get("/employees"),
        api.get("/departments"),
        api.get("/reports/summary"),
      ]);
      
      console.log("Employees response:", empRes.data);
      setEmployees(empRes.data?.data || []);
      setDepartments(deptRes.data?.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to load initial data:", err);
      toast.error("فشل في تحميل البيانات");
    }
  }

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await api.get("/reports/summary");
      console.log("Dashboard response:", res.data);
      setSummary(res.data);
    } catch (err) {
      console.error("Dashboard error:", err);
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }

  async function loadSalaryReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (selectedEmployee) params.append('employee_id', selectedEmployee);
      const res = await api.get(`/reports/salary?${params}`);
      console.log("Salary report response:", res.data);
      setSalaryReport(res.data?.data || []);
    } catch (err) {
      console.error("Salary report error:", err);
      toast.error("فشل في جلب تقرير المرتبات");
    } finally {
      setLoading(false);
    }
  }

  async function loadTaxReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      const res = await api.get(`/reports/income-tax?${params}`);
      setTaxReport(res.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب تقرير ضريبة الدخل");
    } finally {
      setLoading(false);
    }
  }

  async function loadIncreaseReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      const res = await api.get(`/reports/salary-increase?${params}`);
      setIncreaseReport(res.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب تقرير الزيادة السنوية");
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaveWarningReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      const res = await api.get(`/reports/leave-warning?${params}`);
      setLeaveWarningReport(res.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب تقرير الإجازات والإنذارات");
    } finally {
      setLoading(false);
    }
  }

  async function loadEvaluationReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      const res = await api.get(`/reports/employee-evaluation?${params}`);
      setEvaluationReport(res.data);
    } catch (err) {
      toast.error("فشل في جلب تقرير تقييم الموظفين");
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartmentReport() {
    setLoading(true);
    try {
      const res = await api.get(`/reports/department?year=${year}`);
      setDepartmentReport(res.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب تقرير الأقسام");
    } finally {
      setLoading(false);
    }
  }

  async function loadReportHistory() {
    setLoading(true);
    try {
      const res = await api.get("/reports/history");
      setReportHistory(res.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب سجل التقارير");
    } finally {
      setLoading(false);
    }
  }

  async function generateLetter() {
    if (!selectedEmployee) {
      toast.error("اختر الموظف أولاً");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/letters/generate", {
        type: letterType,
        employee_id: parseInt(selectedEmployee),
        ...letterParams,
      });
      setLetterData(res.data);
      toast.success("تم إنشاء الخطاب بنجاح");
    } catch (err) {
      toast.error("فشل في إنشاء الخطاب");
    } finally {
      setLoading(false);
    }
  }

  function printLetter() {
    if (!letterData) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${letterData.type_label || "خطاب"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; line-height: 2; direction: rtl; }
          @media print { body { padding: 20px; } }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .info { margin-bottom: 20px; }
          .info p { margin-bottom: 5px; }
          .content { margin-bottom: 30px; text-align: justify; }
          .signature { margin-top: 50px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td { padding: 8px; }
        </style>
      </head>
      <body>
        ${document.getElementById("letter-content")?.innerHTML || ""}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  function printReport(title) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #1e3a5f; }
          .header h1 { font-size: 20px; color: #1e3a5f; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>${summary?.organization?.name || 'Jawda HR'}</p>
        </div>
        <div class="meta">
          <span>السنة: ${year}</span>
          <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</span>
        </div>
        <div id="print-content"></div>
        <div class="footer">نظام Jawda HR لإدارة الموارد البشرية</div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const currentTab = TABS.find(t => t.key === activeTab);

  return (
    <div className="flex min-h-screen bg-slate-100" dir="rtl">
      <div className={`flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <Sidebar sticky onCollapseChange={setSidebarCollapsed} />
      </div>
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mr-auto">
          {/* Header */}
          <div className={`${currentTab?.gradient} text-white p-6 rounded-2xl mb-6 shadow-xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  {React.createElement(currentTab?.icon || ViewColumnsIcon, { className: "h-8 w-8" })}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{currentTab?.label}</h1>
                  <p className="text-white/80 text-sm">تقارير وإحصائيات شاملة - جنيه سوداني</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => printReport(currentTab?.label)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <span className="hidden md:inline">طباعة</span>
                </button>
                <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  <span className="hidden md:inline">تصدير</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-2xl shadow-lg">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                    activeTab === tab.key
                      ? `${tab.gradient} text-white shadow-lg`
                      : "text-gray-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-2xl shadow-xl p-6 min-h-[600px]">
            {activeTab === "dashboard" && (
              <DashboardView summary={summary} stats={summary?.stats} formatCurrency={formatCurrency} />
            )}
            {activeTab === "salary" && (
              <SalaryReport
                data={salaryReport}
                loading={loading}
                month={month} setMonth={setMonth}
                year={year} setYear={setYear}
                departments={departments}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                employees={employees}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                formatCurrency={formatCurrency}
                onExportPDF={() => exportToPDF('salary')}
                onExportExcel={() => exportToExcel('salary')}
                exporting={exporting}
              />
            )}
            {activeTab === "incomeTax" && (
              <TaxReport
                data={taxReport}
                loading={loading}
                year={year} setYear={setYear}
                departments={departments}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                formatCurrency={formatCurrency}
                onExportPDF={() => exportToPDF('incomeTax')}
                onExportExcel={() => exportToExcel('incomeTax')}
                exporting={exporting}
              />
            )}
            {activeTab === "salaryIncrease" && (
              <IncreaseReport
                data={increaseReport}
                loading={loading}
                year={year} setYear={setYear}
                departments={departments}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === "leaveWarning" && (
              <LeaveWarningReport
                data={leaveWarningReport}
                loading={loading}
                year={year} setYear={setYear}
                departments={departments}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                expandedEmployee={expandedEmployee}
                setExpandedEmployee={setExpandedEmployee}
                onExportPDF={() => exportToPDF('leaveWarning')}
                exporting={exporting}
              />
            )}
            {activeTab === "evaluation" && (
              <EvaluationReport
                data={evaluationReport}
                loading={loading}
                year={year} setYear={setYear}
                departments={departments}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
              />
            )}
            {activeTab === "department" && (
              <DepartmentReport
                data={departmentReport}
                loading={loading}
                year={year} setYear={setYear}
                formatCurrency={formatCurrency}
                onExportPDF={() => exportToPDF('department')}
                exporting={exporting}
              />
            )}
            {activeTab === "history" && (
              <ReportHistory data={reportHistory} loading={loading} />
            )}
            {activeTab === "letters" && (
              <LettersSection
                employees={employees}
                departments={departments}
                letterType={letterType}
                setLetterType={setLetterType}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                letterData={letterData}
                setLetterData={setLetterData}
                letterParams={letterParams}
                setLetterParams={setLetterParams}
                loading={loading}
                generateLetter={generateLetter}
                printLetter={printLetter}
                LETTER_TYPES={LETTER_TYPES}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ summary, stats, formatCurrency }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-700">
        <ViewColumnsIcon className="h-8 w-8 text-slate-600" />
        لوحة تحكم التقارير
      </h2>

      {summary?.organization && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 rounded-xl mb-8 border border-slate-200">
          <div className="flex items-center gap-4">
            {summary.organization.logo_url && (
              <img src={summary.organization.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-white p-2 shadow" />
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-800">{summary.organization.name}</h3>
              <p className="text-gray-600">{summary.organization.address}</p>
              <p className="text-gray-500 text-sm">الرقم الضريبي: {summary.organization.tax_number}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👥" label="إجمالي الموظفين" value={stats?.total_employees || 0} color="from-blue-500 to-blue-600" />
        <StatCard icon="🏢" label="الأقسام" value={stats?.total_departments || 0} color="from-emerald-500 to-emerald-600" />
        <StatCard icon="📝" label="إجازات معلقة" value={stats?.total_leaves_pending || 0} color="from-orange-500 to-orange-600" />
        <StatCard icon="⚠️" label="إنذارات السنة" value={stats?.total_warnings || 0} color="from-red-500 to-red-600" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="📈" label="زيادات سنوية" value={stats?.total_increases || 0} color="from-violet-500 to-violet-600" />
        <StatCard icon="📄" label="تقارير الشهر" value={stats?.reports_generated || 0} color="from-cyan-500 to-cyan-600" />
        <StatCard icon="✉️" label="خطابات الشهر" value={stats?.letters_generated || 0} color="from-pink-500 to-pink-600" />
        <StatCard icon="💰" label="إجمالي المرتبات" value={formatCurrency(stats?.total_salaries || 0)} color="from-amber-500 to-amber-600" small />
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        العملة: جنيه سوداني (SDG)
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, small }) {
  return (
    <div className={`bg-gradient-to-br ${color} text-white p-4 rounded-xl shadow-lg`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-white/80 text-sm">{label}</p>
          <p className={`font-bold ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ children, onExportPDF, onExportExcel, exporting }) {
  return (
    <div className="flex flex-wrap justify-between items-center mb-6 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex-1 min-w-[200px]">{children[0]}</div>
      <div className="flex flex-wrap gap-2 items-center">
        {children.slice(1)}
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            disabled={exporting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            title="تصدير PDF"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        )}
        {onExportExcel && (
          <button
            onClick={onExportExcel}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            title="تصدير Excel"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SalaryReport({ data, loading, month, setMonth, year, setYear, departments, selectedDepartment, setSelectedDepartment, employees, selectedEmployee, setSelectedEmployee, formatCurrency, onExportPDF, onExportExcel, exporting }) {
  const totals = {
    base: data.reduce((s, e) => s + (e.base_salary || 0), 0),
    allowances: data.reduce((s, e) => s + (e.total_allowances || 0), 0),
    incentives: data.reduce((s, e) => s + (e.total_incentives || 0), 0),
    gross: data.reduce((s, e) => s + (e.gross_salary || 0), 0),
    deductions: data.reduce((s, e) => s + (e.total_deductions || 0), 0),
    tax: data.reduce((s, e) => s + (e.income_tax || 0), 0),
    net: data.reduce((s, e) => s + (e.net_salary || 0), 0),
  };

  const selectedMonth = MONTHS.find(m => m.value === month)?.label;

  return (
    <div>
      <FilterBar onExportPDF={onExportPDF} onExportExcel={onExportExcel} exporting={exporting}>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <BanknotesIcon className="h-6 w-6 text-emerald-600" />
          كشف المرتبات الشهري - {selectedMonth} {year}
        </h2>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[140px]">
            <option value="">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[160px]">
            <option value="">جميع الموظفين</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[120px]">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium">الراتب الأساسي</p>
          <p className="font-bold text-emerald-700">{formatCurrency(totals.base)}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100">
          <p className="text-xs text-green-600 font-medium">البدلات</p>
          <p className="font-bold text-green-700">{formatCurrency(totals.allowances)}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-100">
          <p className="text-xs text-purple-600 font-medium">الحوافز</p>
          <p className="font-bold text-purple-700">{formatCurrency(totals.incentives)}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
          <p className="text-xs text-blue-600 font-medium">إجمالي المستحق</p>
          <p className="font-bold text-blue-700">{formatCurrency(totals.gross)}</p>
        </div>
        <div className="bg-red-50 p-3 rounded-xl text-center border border-red-100">
          <p className="text-xs text-red-600 font-medium">الخصومات</p>
          <p className="font-bold text-red-700">{formatCurrency(totals.deductions)}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-100">
          <p className="text-xs text-orange-600 font-medium">الضريبة</p>
          <p className="font-bold text-orange-700">{formatCurrency(totals.tax)}</p>
        </div>
        <div className="bg-indigo-100 p-3 rounded-xl text-center border border-indigo-200 col-span-2 lg:col-span-1">
          <p className="text-xs text-indigo-600 font-medium">صافي المرتب</p>
          <p className="font-bold text-indigo-700 text-lg">{formatCurrency(totals.net)}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">* جميع المبالغ بـ جنيه سوداني</p>

      {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState icon="💰" message="لا توجد بيانات للمرتبات" /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
                <th className="p-3 border border-slate-600">#</th>
                <th className="p-3 border border-slate-600 text-right">الاسم</th>
                <th className="p-3 border border-slate-600 text-right">القسم</th>
                <th className="p-3 border border-slate-600 text-right">الأساسي</th>
                <th className="p-3 border border-slate-600 text-right">البدلات</th>
                <th className="p-3 border border-slate-600 text-right">الحوافز</th>
                <th className="p-3 border border-slate-600 text-right">السلفيات</th>
                <th className="p-3 border border-slate-600 text-right">الخصومات</th>
                <th className="p-3 border border-slate-600 text-right">الضريبة</th>
                <th className="p-3 border border-slate-600 text-right bg-indigo-600">صافي المرتب</th>
              </tr>
            </thead>
            <tbody>
              {data.map((emp, i) => (
                <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="p-3 border border-slate-200 text-center">{i + 1}</td>
                  <td className="p-3 border border-slate-200 font-semibold">{emp.name}</td>
                  <td className="p-3 border border-slate-200 text-slate-600">{emp.department}</td>
                  <td className="p-3 border border-slate-200 text-right">{formatCurrency(emp.base_salary)}</td>
                  <td className="p-3 border border-slate-200 text-right text-emerald-600">{formatCurrency(emp.total_allowances)}</td>
                  <td className="p-3 border border-slate-200 text-right text-purple-600">{formatCurrency(emp.total_incentives)}</td>
                  <td className="p-3 border border-slate-200 text-right text-red-600">{formatCurrency(emp.loan_payments)}</td>
                  <td className="p-3 border border-slate-200 text-right text-red-600">{formatCurrency(Math.max(0, emp.total_deductions - emp.loan_payments))}</td>
                  <td className="p-3 border border-slate-200 text-right text-orange-600">{formatCurrency(emp.income_tax)}</td>
                  <td className="p-3 border border-slate-200 text-right font-bold bg-indigo-50">{formatCurrency(emp.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaxReport({ data, loading, year, setYear, departments, selectedDepartment, setSelectedDepartment, formatCurrency, onExportPDF, onExportExcel, exporting }) {
  const totals = {
    monthly: data.reduce((s, e) => s + (e.monthly_salary || 0), 0),
    annual: data.reduce((s, e) => s + (e.annual_salary || 0), 0),
    monthlyTax: data.reduce((s, e) => s + (e.monthly_tax || 0), 0),
    annualTax: data.reduce((s, e) => s + (e.annual_tax || 0), 0),
  };

  return (
    <div>
      <FilterBar onExportPDF={onExportPDF} onExportExcel={onExportExcel} exporting={exporting}>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <ScaleIcon className="h-6 w-6 text-orange-600" />
          تقرير ضريبة الدخل - سنة {year}
        </h2>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[140px]">
            <option value="">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
          <p className="text-orange-600 font-medium">المرتب الشهري</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(totals.monthly)}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-100">
          <p className="text-yellow-600 font-medium">المرتب السنوي</p>
          <p className="text-2xl font-bold text-yellow-700">{formatCurrency(totals.annual)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
          <p className="text-red-600 font-medium">الضريبة الشهرية</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totals.monthlyTax)}</p>
        </div>
        <div className="bg-pink-50 p-4 rounded-xl text-center border border-pink-100">
          <p className="text-pink-600 font-medium">الضريبة السنوية</p>
          <p className="text-2xl font-bold text-pink-700">{formatCurrency(totals.annualTax)}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl mb-6 border border-orange-100">
        <h3 className="font-bold mb-3 text-orange-700">📋 شرائح ضريبة الدخل (جنيه سوداني)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
          {[
            ["0 - 6,000", "0%"],
            ["6,001 - 12,000", "5%"],
            ["12,001 - 24,000", "10%"],
            ["24,001 - 36,000", "15%"],
            ["36,001 - 72,000", "20%"],
            ["72,001 - 120,000", "22.5%"],
            ["+120,000", "25%"],
          ].map(([range, rate], i) => (
            <div key={i} className="bg-white p-2 rounded-lg text-center shadow-sm">
              <p className="text-gray-500 text-xs">{range}</p>
              <p className="font-bold text-blue-600">{rate}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <th className="p-3 border border-orange-500">#</th>
                <th className="p-3 border border-orange-500 text-right">الاسم</th>
                <th className="p-3 border border-orange-500 text-right">القسم</th>
                <th className="p-3 border border-orange-500 text-right">المرتب الشهري</th>
                <th className="p-3 border border-orange-500 text-right">المرتب السنوي</th>
                <th className="p-3 border border-orange-500 text-right">الضريبة الشهرية</th>
                <th className="p-3 border border-orange-500 text-right">الضريبة السنوية</th>
              </tr>
            </thead>
            <tbody>
              {data.map((emp, i) => (
                <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}>
                  <td className="p-3 border border-orange-100 text-center">{i + 1}</td>
                  <td className="p-3 border border-orange-100 font-semibold">{emp.name}</td>
                  <td className="p-3 border border-orange-100">{emp.department}</td>
                  <td className="p-3 border border-orange-100 text-right">{formatCurrency(emp.monthly_salary)}</td>
                  <td className="p-3 border border-orange-100 text-right">{formatCurrency(emp.annual_salary)}</td>
                  <td className="p-3 border border-orange-100 text-right text-orange-600">{formatCurrency(emp.monthly_tax)}</td>
                  <td className="p-3 border border-orange-100 text-right text-red-600 font-bold">{formatCurrency(emp.annual_tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function IncreaseReport({ data, loading, year, setYear, departments, selectedDepartment, setSelectedDepartment, formatCurrency }) {
  const totalIncrease = data.reduce((s, e) => s + (e.increase_amount || 0), 0);
  const avgPercent = data.length > 0 ? (data.reduce((s, e) => s + parseFloat(e.increase_percent || 0), 0) / data.length).toFixed(2) : 0;

  return (
    <div>
      <FilterBar>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
          تقرير الزيادة السنوية - سنة {year}
        </h2>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[140px]">
            <option value="">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
          <p className="text-emerald-600 font-medium">إجمالي الزيادة</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalIncrease)}</p>
          <p className="text-xs text-emerald-500 mt-1">جنيه سوداني</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
          <p className="text-blue-600 font-medium">عدد المستفيدين</p>
          <p className="text-2xl font-bold text-blue-700">{data.length}</p>
          <p className="text-xs text-blue-500 mt-1">موظف</p>
        </div>
        <div className="bg-violet-50 p-4 rounded-xl text-center border border-violet-100">
          <p className="text-violet-600 font-medium">متوسط الزيادة</p>
          <p className="text-2xl font-bold text-violet-700">{avgPercent}%</p>
          <p className="text-xs text-violet-500 mt-1">نسبة مئوية</p>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState icon="📈" message="لا توجد زيادات سنوية" /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
                <th className="p-3 border border-emerald-500">#</th>
                <th className="p-3 border border-emerald-500 text-right">الاسم</th>
                <th className="p-3 border border-emerald-500 text-right">القسم</th>
                <th className="p-3 border border-emerald-500 text-right">الراتب القديم</th>
                <th className="p-3 border border-emerald-500 text-right">الراتب الجديد</th>
                <th className="p-3 border border-emerald-500 text-right">قيمة الزيادة</th>
                <th className="p-3 border border-emerald-500 text-right">النسبة</th>
                <th className="p-3 border border-emerald-500 text-right">تاريخ التطبيق</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-emerald-50"}>
                  <td className="p-3 border border-emerald-100 text-center">{i + 1}</td>
                  <td className="p-3 border border-emerald-100 font-semibold">{item.name}</td>
                  <td className="p-3 border border-emerald-100">{item.department}</td>
                  <td className="p-3 border border-emerald-100 text-right">{formatCurrency(item.old_salary)}</td>
                  <td className="p-3 border border-emerald-100 text-right text-emerald-600 font-semibold">{formatCurrency(item.new_salary)}</td>
                  <td className="p-3 border border-emerald-100 text-right text-emerald-600 font-bold">{formatCurrency(item.increase_amount)}</td>
                  <td className="p-3 border border-emerald-100 text-center">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">+{item.increase_percent}%</span>
                  </td>
                  <td className="p-3 border border-emerald-100">{formatDate(item.effective_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeaveWarningReport({ data, loading, year, setYear, departments, selectedDepartment, setSelectedDepartment, expandedEmployee, setExpandedEmployee, onExportPDF, exporting }) {
  return (
    <div>
      <FilterBar onExportPDF={onExportPDF} exporting={exporting}>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <ClipboardDocumentListIcon className="h-6 w-6 text-violet-600" />
          تقرير الإجازات والإنذارات - سنة {year}
        </h2>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[140px]">
            <option value="">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterBar>

      {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState icon="📋" message="لا توجد بيانات" /> : (
        <div className="space-y-4">
          {data.map((emp) => (
            <div key={emp.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}
                className="w-full p-4 flex justify-between items-center bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-slate-800">{emp.name}</h3>
                    <p className="text-gray-500 text-sm">{emp.department} - {emp.job_title}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="bg-blue-100 px-4 py-2 rounded-lg text-center">
                    <p className="text-xl font-bold text-blue-600">{emp.leaves.total_count}</p>
                    <p className="text-xs text-blue-500">إجازة</p>
                  </div>
                  <div className="bg-red-100 px-4 py-2 rounded-lg text-center">
                    <p className="text-xl font-bold text-red-600">{emp.warnings.total_count}</p>
                    <p className="text-xs text-red-500">إنذار</p>
                  </div>
                  <span className="text-2xl text-slate-400">{expandedEmployee === emp.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {expandedEmployee === emp.id && (
                <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                      🏖️ الإجازات ({emp.leaves.total_count})
                    </h4>
                    {emp.leaves.total_count === 0 ? (
                      <p className="text-gray-500">لا توجد إجازات</p>
                    ) : (
                      Object.entries(emp.leaves.by_type || {}).map(([type, info]) => (
                        <div key={type} className="flex justify-between mb-2 py-1 border-b border-blue-100">
                          <span className="text-slate-700">{type}</span>
                          <span className="font-medium text-blue-600">{info.count}x ({info.days} يوم)</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                      ⚠️ الإنذارات ({emp.warnings.total_count})
                    </h4>
                    {emp.warnings.total_count === 0 ? (
                      <p className="text-gray-500">لا توجد إنذارات</p>
                    ) : emp.warnings.details?.map((w, i) => (
                      <div key={i} className="flex justify-between mb-2 py-1 border-b border-red-100">
                        <span className="text-slate-600">{formatDate(w.date)}</span>
                        <span className="text-red-600">{w.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationReport({ data, loading, year, setYear, departments, selectedDepartment, setSelectedDepartment }) {
  if (!data) return <LoadingSpinner />;

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div>
      <FilterBar>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <StarIcon className="h-6 w-6 text-amber-600" />
          تقرير تقييم الموظفين - سنة {year}
        </h2>
        <div className="flex flex-wrap gap-3">
          <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="border rounded-lg px-3 py-2 bg-white min-w-[140px]">
            <option value="">جميع الأقسام</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterBar>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
            🏆 أفضل 5 موظفين
          </h3>
          <div className="space-y-3">
            {data.best_employees?.map((emp, i) => (
              <div key={emp.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                  <span className="font-bold text-emerald-600 ml-2">#{i + 1}</span>
                  <span className="font-medium text-slate-700">{emp.name}</span>
                  <p className="text-sm text-gray-500">{emp.department}</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold ${getScoreColor(emp.total_score)}`}>
                  {emp.total_score}%
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-orange-100 border-2 border-red-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
            ⚠️ يحتاج تحسين
          </h3>
          <div className="space-y-3">
            {data.worst_employees?.map((emp, i) => (
              <div key={emp.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                  <span className="font-bold text-red-600 ml-2">#{i + 1}</span>
                  <span className="font-medium text-slate-700">{emp.name}</span>
                  <p className="text-sm text-gray-500">{emp.department}</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold ${getScoreColor(emp.total_score)}`}>
                  {emp.total_score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-700 mb-4">📊 تقييم جميع الموظفين</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <th className="p-3 border border-amber-500">#</th>
              <th className="p-3 border border-amber-500 text-right">الاسم</th>
              <th className="p-3 border border-amber-500 text-right">القسم</th>
              <th className="p-3 border border-amber-500 text-center">الحضور</th>
              <th className="p-3 border border-amber-500 text-center">التأخير</th>
              <th className="p-3 border border-amber-500 text-center">الإنصراف المبكر</th>
              <th className="p-3 border border-amber-500 text-center">الإجازات</th>
              <th className="p-3 border border-amber-500 text-center">الإنذارات</th>
              <th className="p-3 border border-amber-500 text-center">التقييم</th>
            </tr>
          </thead>
          <tbody>
            {data.all_employees?.map((emp, i) => (
              <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-amber-50"}>
                <td className="p-3 border border-amber-100 text-center">{i + 1}</td>
                <td className="p-3 border border-amber-100 font-semibold">{emp.name}</td>
                <td className="p-3 border border-amber-100">{emp.department}</td>
                <td className="p-3 border border-amber-100 text-center text-emerald-600 font-medium">{emp.attendance_days}</td>
                <td className="p-3 border border-amber-100 text-center text-red-600">{emp.late_days}</td>
                <td className="p-3 border border-amber-100 text-center text-orange-600">{emp.early_leave_days}</td>
                <td className="p-3 border border-amber-100 text-center">{emp.leave_count}</td>
                <td className="p-3 border border-amber-100 text-center text-red-600">{emp.warning_count}</td>
                <td className="p-3 border border-amber-100 text-center">
                  <span className={`px-3 py-1 rounded-full font-bold ${getScoreColor(emp.total_score)}`}>
                    {emp.total_score}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DepartmentReport({ data, loading, year, setYear, formatCurrency, onExportPDF, exporting }) {
  const totalEmployees = data.reduce((s, d) => s + (d.employee_count || 0), 0);
  const totalSalaries = data.reduce((s, d) => s + (d.total_salaries || 0), 0);

  return (
    <div>
      <FilterBar onExportPDF={onExportPDF} exporting={exporting}>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <BuildingOfficeIcon className="h-6 w-6 text-cyan-600" />
          تقرير الأقسام - سنة {year}
        </h2>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-2 bg-white min-w-[100px]">
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </FilterBar>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-cyan-50 p-4 rounded-xl text-center border border-cyan-100">
          <p className="text-cyan-600 font-medium">إجمالي الموظفين</p>
          <p className="text-3xl font-bold text-cyan-700">{totalEmployees}</p>
        </div>
        <div className="bg-teal-50 p-4 rounded-xl text-center border border-teal-100">
          <p className="text-teal-600 font-medium">إجمالي المرتبات</p>
          <p className="text-2xl font-bold text-teal-700">{formatCurrency(totalSalaries)}</p>
          <p className="text-xs text-teal-500">جنيه سوداني</p>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((dept) => (
            <div key={dept.id} className="bg-gradient-to-br from-cyan-50 to-teal-100 p-6 rounded-xl border border-cyan-200">
              <h3 className="text-xl font-bold text-cyan-700 mb-4">{dept.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-slate-600">عدد الموظفين:</span>
                  <span className="font-bold text-slate-800">{dept.employee_count}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-slate-600">إجمالي المرتبات:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(dept.total_salaries)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                  <span className="text-slate-600">متوسط المرتب:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(dept.avg_salary)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportHistory({ data, loading }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-slate-700 flex items-center gap-2">
        <ClockIcon className="h-6 w-6 text-gray-600" />
        سجل التقارير
      </h2>
      {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState icon="📜" message="لا توجد تقارير سابقة" /> : (
        <div className="space-y-3">
          {data.map((report) => (
            <div key={report.id} className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200 hover:border-slate-300 transition">
              <div>
                <h3 className="font-bold text-slate-800">{report.title}</h3>
                <p className="text-gray-500 text-sm">{report.report_type} - {report.user?.name || 'النظام'}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(report.created_at)}</p>
              </div>
              <div className="text-left">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  report.status === 'printed' ? 'bg-emerald-100 text-emerald-700' :
                  report.status === 'exported' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {report.status === 'printed' ? '📄 مطبوع' :
                   report.status === 'exported' ? '📥 مصدر' : '📋 سجل'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LettersSection({ employees, departments, letterType, setLetterType, selectedEmployee, setSelectedEmployee, letterData, setLetterData, letterParams, setLetterParams, loading, generateLetter, printLetter, LETTER_TYPES }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-slate-700 flex items-center gap-2">
        <DocumentTextIcon className="h-6 w-6 text-pink-600" />
        إنشاء الخطابات
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block font-semibold mb-3 text-slate-700">نوع الخطاب</label>
          <div className="grid grid-cols-2 gap-2">
            {LETTER_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => { setLetterType(t.key); setLetterParams({}); setLetterData(null); }}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  letterType === t.key
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block font-semibold mb-2 text-slate-700">اختر الموظف</label>
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">-- اختر موظف --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employee_code || `#${e.id}`})
                </option>
              ))}
            </select>
          </div>

          {letterType === "salary_increase" && (
            <div className="grid grid-cols-2 gap-4 bg-pink-50 p-4 rounded-xl border border-pink-100">
              <div>
                <label className="block text-sm mb-1 font-medium">الراتب القديم</label>
                <input
                  type="number"
                  value={letterParams.old_salary || ""}
                  onChange={e => setLetterParams({...letterParams, old_salary: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">الراتب الجديد</label>
                <input
                  type="number"
                  value={letterParams.new_salary || ""}
                  onChange={e => setLetterParams({...letterParams, new_salary: parseFloat(e.target.value) || 0})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">تاريخ التطبيق</label>
                <input
                  type="date"
                  value={letterParams.effective_date || ""}
                  onChange={e => setLetterParams({...letterParams, effective_date: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">السبب</label>
                <input
                  type="text"
                  placeholder="مثال: الزيادة السنوية"
                  value={letterParams.reason || ""}
                  onChange={e => setLetterParams({...letterParams, reason: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          )}

          {(letterType === "termination" || letterType === "warning") && (
            <div className="grid grid-cols-2 gap-4 bg-pink-50 p-4 rounded-xl border border-pink-100">
              {letterType === "termination" ? (
                <>
                  <div>
                    <label className="block text-sm mb-1 font-medium">السبب</label>
                    <select
                      value={letterParams.reason || ""}
                      onChange={e => setLetterParams({...letterParams, reason: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="انهاء الخدمة">انهاء الخدمة</option>
                      <option value="الاستقالة">الاستقالة</option>
                      <option value="نهاية العقد">نهاية العقد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 font-medium">تاريخ الإنهاء</label>
                    <input
                      type="date"
                      value={letterParams.termination_date || ""}
                      onChange={e => setLetterParams({...letterParams, termination_date: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm mb-1 font-medium">نوع الإنذار</label>
                    <select
                      value={letterParams.warning_type || "إنذار"}
                      onChange={e => setLetterParams({...letterParams, warning_type: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="إنذار">إنذار</option>
                      <option value="إنذار كتابي">إنذار كتابي</option>
                      <option value="إنذار نهائي">إنذار نهائي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1 font-medium">السبب</label>
                    <input
                      type="text"
                      placeholder="وصف المخالفة"
                      value={letterParams.warning_reason || ""}
                      onChange={e => setLetterParams({...letterParams, warning_reason: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {["good_conduct", "salary_verification", "experience"].includes(letterType) && (
            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
              <label className="block text-sm mb-1 font-medium">الغرض من الشهادة</label>
              <input
                type="text"
                placeholder="مثال: تقديمها للجهة المختصة"
                value={letterParams.purpose || ""}
                onChange={e => setLetterParams({...letterParams, purpose: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={generateLetter}
              disabled={loading || !selectedEmployee}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 transition"
            >
              {loading ? "جاري الإنشاء..." : "🔍 معاينة الخطاب"}
            </button>
            {letterData && (
              <button
                onClick={printLetter}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-green-700 transition flex items-center gap-2"
              >
                <PrinterIcon className="h-5 w-5" />
                طباعة
              </button>
            )}
          </div>
        </div>
      </div>

      {letterData && (
        <div className="border-2 border-slate-300 rounded-xl p-8 bg-white shadow-lg">
          <p className="text-center text-gray-500 text-sm mb-4">الرقم المرجعي: {letterData.reference_number}</p>
          <div id="letter-content" className="text-slate-800">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{letterData.title}</h1>
            </div>
            <div dangerouslySetInnerHTML={{ __html: letterData.content?.body }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="text-center py-20 text-gray-500">
      <div className="text-6xl mb-4">{icon}</div>
      <p className="text-xl">{message || "لا توجد بيانات"}</p>
    </div>
  );
}

export default ReportsPage;
