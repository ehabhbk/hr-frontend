import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { API_BASE, getStorageUrl } from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDateArabic, formatDateDisplay } from "../utils/dateUtils";
import { getCurrentPermissions } from "../utils/auth";

const ALL_TABS = [
  { key: "organization", label: "معلومات المؤسسة", icon: "🏢", permission: "settings.organization" },
  { key: "attendance", label: "الحضور والإنذارات", icon: "⏰", permission: "settings.attendance" },
  { key: "leaves", label: "الإجازات", icon: "🏖️", permission: "settings.leaves" },
  { key: "advances", label: "السلفيات", icon: "💰", permission: "settings.advances" },
  { key: "shifts", label: "الورديات", icon: "👥", permission: "settings.shifts" },
  { key: "financials", label: "المالية", icon: "💵", permission: "settings.financials" },
  { key: "settlements", label: "التسوية والمعاشات", icon: "📋", permission: "settings.settlements" },
  { key: "whatsapp", label: "واتساب", icon: "📱", permission: "settings.whatsapp" },
  { key: "roles", label: "الصلاحيات", icon: "🔐", permission: "roles.view" },
];

function getPermissions() {
  try {
    const savedPerms = localStorage.getItem("permissions");
    const perms = savedPerms ? JSON.parse(savedPerms) : [];
    console.log('SettingsPage - loaded permissions:', perms);
    console.log('SettingsPage - is admin (*):', perms.includes('*'));
    return perms;
  } catch {
    console.log('SettingsPage - failed to parse permissions');
    return [];
  }
}

function hasCurrentPermission(perm) {
  const perms = getPermissions();
  return perms.includes('*') || perms.includes(perm);
}

function getFilteredTabs() {
  const perms = getPermissions();
  if (perms.includes('*')) {
    return ALL_TABS;
  }
  return ALL_TABS.filter(tab => hasCurrentPermission(tab.permission));
}

// Dynamic tabs - recalculated on each render
function useSettingsTabs() {
  const [permVersion, setPermVersion] = React.useState(0);
  
  // Refresh permissions when window gets focus
  React.useEffect(() => {
    const handleFocus = () => {
      setPermVersion(v => v + 1);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  
  const perms = getPermissions();
  const isAdmin = perms.includes('*');
  
  // Admin sees all tabs
  if (isAdmin) {
    return ALL_TABS;
  }
  
  // Filter tabs based on permissions
  return ALL_TABS.filter(tab => hasCurrentPermission(tab.permission));
}

// Get first allowed tab for redirect
function getFirstAllowedTab() {
  const perms = getPermissions();
  if (perms.includes('*')) {
    return ALL_TABS[0]?.key || 'organization';
  }
  const allowedTabs = ALL_TABS.filter(tab => hasCurrentPermission(tab.permission));
  return allowedTabs[0]?.key || 'organization';
}

function SettingsPage() {
  // Get tab from URL params (e.g., /settings/financials)
  const { tab: urlTab } = useParams();
  const navigate = useNavigate();
  
  const tabs = useSettingsTabs();
  const firstAllowedTab = getFirstAllowedTab();
  
  // Determine active tab
  const [activeTab, setActiveTab] = useState(() => {
    // If there's a URL tab and it's in allowed tabs, use it
    if (urlTab && tabs.some(t => t.key === urlTab)) {
      return urlTab;
    }
    // Otherwise use first allowed tab
    return firstAllowedTab || 'organization';
});
  
  // Update URL when tab changes
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    navigate(`/settings/${tabKey}`);
  };
  
  const [, setLoading] = useState(false);

  const [org, setOrg] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftAssignments, setShiftAssignments] = useState({});

  const [orgForm, setOrgForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    commercial_register: "",
    activity: "",
    employee_count: "",
    foundation_year: "",
    currency: "SDG",
    currency_symbol: "جنيه",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [stampFile, setStampFile] = useState(null);

  const currencyOptions = [
    { value: "SDG", label: "جنيه سوداني (SDG)", symbol: "جنيه", icon: "💵" },
    { value: "USD", label: "دولار أمريكي (USD)", symbol: "$", icon: "💵" },
    { value: "SAR", label: "ريال سعودي (SAR)", symbol: "ر.س", icon: "💵" },
    { value: "AED", label: "درهم إماراتي (AED)", symbol: "د.إ", icon: "💵" },
    { value: "EGP", label: "جنيه مصري (EGP)", symbol: "ج.م", icon: "💵" },
  ];

  const [attendance, setAttendance] = useState({
    shift_ids: [],
    allowed_delay_minutes: 5,
    delay_before_warning: 2,
    delay_before_deduction: 5,
    late_deduction_percent: 1.5,
    absence_after_minutes: 60,
    absence_deduction_days: 1,
    termination_after_days: 30,
  });

  const [leaveSettings, setLeaveSettings] = useState({
    annual_days: 21,
    sick_days: 10,
    maternity_days: 90,
    notice_days: 3,
    by_grade: {},
    hajj_days: 14,
    emergency_days: 3,
    unpaid_leave_max_days: 30,
    leave_without_salary: true,
  });

  const [advanceSettings, setAdvanceSettings] = useState({
    enabled: true,
    // سلفة قصيرة - من إجمالي المرتب الشهري
    short_advance: {
      enabled: true,
      max_percent: 50, // نسبة من إجمالي المرتب
      max_amount: 50000, // الحد الأقصى بالجنيه
      min_service_months: 0, // لا تشترط مدة خدمة
      deduction_percent: 100, // نسبة خصم من إجمالي المرتب (100% يعني تخصم كلها)
    },
    // سلفة طويلة - تقسط على أشهر
    long_advance: {
      enabled: true,
      max_percent: 100, // نسبة من إجمالي المرتب
      max_amount: 500000, // الحد الأقصى بالجنيه
      min_amount: 10000, // الحد الأدنى بالجنيه
      min_service_months: 6, // أشهر الخدمة المطلوبة
      max_installments: 12, // أقساط شهرية
      min_installments: 3, // أقساط شهرية
    },
  });

  const [taxBrackets, setTaxBrackets] = useState([
    { min: 0, max: 6000, rate: 0 },
    { min: 6000, max: 12000, rate: 5 },
    { min: 12000, max: 24000, rate: 10 },
    { min: 24000, max: 999999999, rate: 15 },
  ]);

  const [salaryIncrease, setSalaryIncrease] = useState({
    default_percent: 10,
    per_job_title: {},
    apply_automatically: false,
    min_service_months: 12,
  });

  const [whatsapp, setWhatsapp] = useState({
    enabled: false,
    api_url: "",
    api_key: "",
    phone_number: "",
    notify_on_warning: true,
    notify_on_leave: true,
    notify_on_advance: true,
    notify_on_late: true,
    message_template_warning: "عزيزي {name}، تم إصدار إنذار رقم {warning_no} بسبب {reason}",
    message_template_leave: "عزيزي {name}، تم {action} طلب الإجازة المقدم من {from} إلى {to}",
    message_template_advance: "عزيزي {name}، تم {action} طلب السلفة بمبلغ {amount}",
    message_template_late: "عزيزي {name}، تم تسجيل تأخير اليوم",
    notify_on_appointment: true,
    message_template_appointment: "عزيزي {name}، يسعدنا إخباركم بانضمامكم إلينا في {company} بتاريخ {date}. الوظيفة: {position}، القسم: {department}، الراتب: {salary}",
    notify_on_leave_end: true,
    message_template_leave_end: "عزيزي {name}، نذكّركم بأن إجازتكم ستنتهي غداً. نرجو العودة في الموعد المحدد.",
  });

  const [settlements, setSettlements] = useState({
    service_end_bonus: {
      enabled: true,
      months_per_year: 1,
      max_months: 0,
      description: "مكافأة نهاية الخدمة - شهر لكل سنة خدمة",
    },
    severance_pay: {
      enabled: true,
      first_5_years_months: 1,
      after_5_years_months: 2,
      max_years: 12,
      description: "مكافأة إنهاء الخدمة حسب قانون العمل",
    },
    notice_period: {
      enabled: true,
      min_days: 30,
      by_service_years: { "0-5": 30, "5-10": 60, "10+": 90 },
      description: "فترة الإخطار المسبقة",
    },
    annual_leave_encashment: {
      enabled: true,
      max_days_per_year: 0,
      min_service_months: 0,
      description: "استبدال الإجازات السنوية نقداً",
    },
    ticket_allowance: {
      enabled: true,
      amount_per_year: 0,
      description: "بدل تذكرة السفر السنوي",
    },
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSettlement, setEmployeeSettlement] = useState(null);
  const [allSettlements, setAllSettlements] = useState([]);
  const [settlementTotals, setSettlementTotals] = useState(null);

  const [loadingStates, setLoadingStates] = useState({
    saveOrg: false,
    saveAttendance: false,
    saveLeaveSettings: false,
    saveAdvanceSettings: false,
    saveShift: false,
    deleteShift: false,
    saveSalaryIncrease: false,
    saveTax: false,
    saveWhatsApp: false,
    saveSettlements: false,
    handleLeaveStatus: false,
    handleAdvanceStatus: false,
    handleWarningStatus: false,
    calculateSettlement: false,
  });

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    is_overnight: false,
    color: "#3B82F6",
    working_hours: 8,
    week_days: [0, 1, 2, 3, 4],
    weekend_days: [5, 6],
  });

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [
        orgRes,
        leavesRes,
        advancesRes,
        rolesRes,
        warningsRes,
        empsRes,
        shiftsRes,
        attendanceRes,
        leaveSettingsRes,
        advanceSettingsRes,
        taxRes,
        salaryIncRes,
        whatsappRes,
        shiftAssignRes,
        settlementsRes
      ] = await Promise.all([
        api.get("/organization"),
        api.get("/leaves/requests"),
        api.get("/advances/requests"),
        api.get("/roles"),
        api.get("/discipline/warnings"),
        api.get("/employees"),
        api.get("/work-shifts"),
        api.get("/settings/attendance"),
        api.get("/settings/leaves"),
        api.get("/settings/advances"),
        api.get("/settings/tax-brackets"),
        api.get("/settings/salary-increase"),
        api.get("/settings/whatsapp"),
        api.get("/shift-assignments?permanent=1"),
        api.get("/settlements"),
      ]);

      console.log("Organization:", orgRes.data?.data);
      console.log("Leave requests:", leavesRes.data?.data);
      console.log("Advance requests:", advancesRes.data?.data);
      console.log("Roles:", rolesRes.data?.data);
      console.log("Settlements:", settlementsRes.data?.data);

      if (settlementsRes.data?.data) {
        const settlementData = settlementsRes.data.data;
        setSettlements(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(settlementData).map(([key, value]) => [key, { ...prev[key], ...value }])
          ),
        }));
      }

      if (orgRes.data?.data) {
        setOrg(orgRes.data.data);
        setOrgForm({
          name: orgRes.data.data.name || "",
          phone: orgRes.data.data.phone || "",
          email: orgRes.data.data.email || "",
          address: orgRes.data.data.address || "",
          tax_number: orgRes.data.data.tax_number || "",
          commercial_register: orgRes.data.data.commercial_register || "",
          activity: orgRes.data.data.activity || "",
          employee_count: orgRes.data.data.employee_count || "",
          foundation_year: orgRes.data.data.foundation_year || "",
          currency: orgRes.data.data.currency || "SDG",
          currency_symbol: orgRes.data.data.currency_symbol || "جنيه",
        });
      }

      setLeaveRequests(leavesRes.data?.data || leavesRes.data || []);
      setAdvanceRequests(advancesRes.data?.data || advancesRes.data || []);
      setRoles(rolesRes.data?.data || rolesRes.data || []);
      setWarnings(warningsRes.data?.data || warningsRes.data || []);
      setEmployees(empsRes.data?.data || empsRes.data || []);
      setShifts(shiftsRes.data?.data || shiftsRes.data || []);
      
      if (attendanceRes.data?.data) {
        const attData = attendanceRes.data.data;
        if (attData.shift_ids && attData.shift_ids.length > 0) {
          setAttendance(attData);
        } else {
          setAttendance({ ...attData, shift_ids: shiftsRes.data?.data?.map(s => s.id) || [] });
        }
      } else {
        setAttendance({ ...attendance, shift_ids: shiftsRes.data?.data?.map(s => s.id) || [] });
      }
      if (leaveSettingsRes.data?.data) setLeaveSettings(leaveSettingsRes.data.data);
      if (advanceSettingsRes.data?.data) setAdvanceSettings(advanceSettingsRes.data.data);
      if (taxRes.data?.data) setTaxBrackets(taxRes.data.data);
      if (salaryIncRes.data?.data) setSalaryIncrease(salaryIncRes.data.data);
      if (whatsappRes.data?.data) setWhatsapp(whatsappRes.data.data);
      
      if (shiftAssignRes.data?.data) {
        const assignments = {};
        (shiftAssignRes.data.data).forEach(a => {
          assignments[parseInt(a.id)] = {
            employee_id: parseInt(a.employee_id),
            shift_id: parseInt(a.work_shift_id)
          };
        });
        setShiftAssignments(assignments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveOrg() {
    setLoadingStates(prev => ({ ...prev, saveOrg: true }));
    try {
      const fd = new FormData();
      fd.append("name", orgForm.name);
      fd.append("phone", orgForm.phone);
      fd.append("email", orgForm.email);
      fd.append("address", orgForm.address);
      fd.append("tax_number", orgForm.tax_number);
      fd.append("commercial_register", orgForm.commercial_register);
      fd.append("activity", orgForm.activity);
      fd.append("employee_count", orgForm.employee_count);
      fd.append("foundation_year", orgForm.foundation_year);
      fd.append("currency", orgForm.currency);
      fd.append("currency_symbol", orgForm.currency_symbol);
      if (logoFile) fd.append("logo", logoFile);
      if (stampFile) fd.append("stamp", stampFile);
      const res = await api.post("/organization", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOrg(res.data?.data || {});
      toast.success("تم حفظ بيانات المؤسسة بنجاح ✅");
    } catch (err) {
      toast.error("فشل حفظ البيانات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveOrg: false }));
    }
  }

  async function saveAttendance() {
    setLoadingStates(prev => ({ ...prev, saveAttendance: true }));
    try {
      const res = await api.put("/settings/attendance", attendance);
      // Recalculate all attendance records with new settings
      await api.post("/attendance-records/recalculate");
      toast.success("تم حفظ الإعدادات وإعادة حساب السجلات ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveAttendance: false }));
    }
  }
  
  async function recalculateRecords() {
    setLoadingStates(prev => ({ ...prev, recalculate: true }));
    try {
      const res = await api.post("/attendance-records/recalculate");
      toast.success(res.data?.message || "تم إعادة حساب السجلات ✅");
    } catch (err) {
      toast.error("فشل إعادة حساب السجلات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, recalculate: false }));
    }
  }

  async function saveLeaveSettings() {
    setLoadingStates(prev => ({ ...prev, saveLeaveSettings: true }));
    try {
      await api.put("/settings/leaves", leaveSettings);
      toast.success("تم حفظ إعدادات الإجازات ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveLeaveSettings: false }));
    }
  }

  async function handleLeaveStatus(id, status) {
    setLoadingStates(prev => ({ ...prev, handleLeaveStatus: true }));
    try {
      await api.post(`/leaves/requests/${id}/status`, { status });
      toast.success(`تم ${status === "approved" ? "الموافقة على" : "رفض"} الإجازة ✅`);
      loadAll();
    } catch (err) {
      toast.error("فشل تحديث الحالة ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, handleLeaveStatus: false }));
    }
  }

  async function saveAdvanceSettings() {
    setLoadingStates(prev => ({ ...prev, saveAdvanceSettings: true }));
    try {
      await api.put("/settings/advances", advanceSettings);
      toast.success("تم حفظ إعدادات السلفيات ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveAdvanceSettings: false }));
    }
  }

  async function handleAdvanceStatus(id, action) {
    setLoadingStates(prev => ({ ...prev, handleAdvanceStatus: true }));
    try {
      await api.post(`/advances/requests/${id}/${action}`);
      toast.success(`تم ${action === "approve" ? "الموافقة على" : "رفض"} السلفة ✅`);
      loadAll();
    } catch (err) {
      toast.error("فشل تحديث الحالة ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, handleAdvanceStatus: false }));
    }
  }

  async function saveTax() {
    setLoadingStates(prev => ({ ...prev, saveTax: true }));
    try {
      await api.put("/settings/tax-brackets", { brackets: taxBrackets });
      toast.success("تم حفظ شرائح الضريبة ✅");
    } catch (err) {
      toast.error("فشل حفظ الشرائح ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveTax: false }));
    }
  }

  function addTaxBracket() {
    setTaxBrackets([...taxBrackets, { min: 0, max: 0, rate: 0 }]);
  }

  function removeTaxBracket(index) {
    setTaxBrackets(taxBrackets.filter((_, i) => i !== index));
  }

  function updateTaxBracket(index, field, value) {
    const updated = [...taxBrackets];
    updated[index][field] = parseFloat(value) || 0;
    setTaxBrackets(updated);
  }

  async function saveSalaryIncrease() {
    setLoadingStates(prev => ({ ...prev, saveSalaryIncrease: true }));
    try {
      await api.put("/settings/salary-increase", salaryIncrease);
      toast.success("تم حفظ إعدادات الزيادة السنوية ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveSalaryIncrease: false }));
    }
  }

  async function saveWhatsApp() {
    setLoadingStates(prev => ({ ...prev, saveWhatsApp: true }));
    try {
      await api.put("/settings/whatsapp", whatsapp);
      toast.success("تم حفظ إعدادات واتساب ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveWhatsApp: false }));
    }
  }

  async function testWhatsApp() {
    try {
      await api.post("/settings/whatsapp/test", {
        phone: whatsapp.phone_number,
        message: "اختبار من نظام Jawda HR",
      });
      toast.success("تم إرسال رسالة الاختبار");
    } catch (err) {
      toast.error("فشل إرسال الاختبار");
    }
  }

  async function saveSettlements() {
    setLoadingStates(prev => ({ ...prev, saveSettlements: true }));
    try {
      await api.put("/settlements", settlements);
      toast.success("تم حفظ إعدادات التسوية والمعاشات ✅");
    } catch (err) {
      toast.error("فشل حفظ الإعدادات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveSettlements: false }));
    }
  }

  async function calculateEmployeeSettlement(empId) {
    if (!empId) {
      setEmployeeSettlement(null);
      return;
    }
    setLoadingStates(prev => ({ ...prev, calculateSettlement: true }));
    try {
      const res = await api.get(`/settlements/calculate/${empId}`);
      setEmployeeSettlement(res.data?.data);
      setSelectedEmployee(empId);
    } catch (err) {
      toast.error("فشل حساب التسوية ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, calculateSettlement: false }));
    }
  }

  async function calculateAllSettlements() {
    setLoadingStates(prev => ({ ...prev, calculateSettlement: true }));
    try {
      const res = await api.get("/settlements/calculate");
      setAllSettlements(res.data?.data || []);
      setSettlementTotals(res.data?.totals);
    } catch (err) {
      toast.error("فشل حساب التسويات ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, calculateSettlement: false }));
    }
  }

  async function exportSettlementPDF(empId) {
    try {
      const res = await api.get(`/settlements/export/${empId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `تسوية_موظف_${empId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("تم تحميل ملف التسوية ✅");
    } catch (err) {
      toast.error("فشل تحميل ملف التسوية ❌");
    }
  }

  async function saveShift() {
    setLoadingStates(prev => ({ ...prev, saveShift: true }));
    try {
      const shiftData = {
        ...shiftForm,
        daily_hours: shiftForm.working_hours,
        is_overnight: shiftForm.is_overnight || false,
        active: true,
      };
      await api.post("/work-shifts", shiftData);
      toast.success("تم إنشاء الوردية ✅");
      const res = await api.get("/work-shifts");
      setShifts(res.data?.data || []);
      setShiftForm({ name: "", start_time: "08:00", end_time: "16:00", is_overnight: false, color: "#3B82F6", working_hours: 8, week_days: [0, 1, 2, 3, 4], weekend_days: [5, 6] });
    } catch (err) {
      toast.error("فشل إنشاء الوردية ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, saveShift: false }));
    }
  }

  const confirmDeleteShift = (id, name) => {
    setConfirmDialog({
      show: true,
      title: "تأكيد حذف الوردية",
      message: `هل أنت متأكد من حذف الوردية "${name}"؟ سيتم إلغاء تعيين جميع الموظفين منها.`,
      onConfirm: () => deleteShift(id),
    });
  };

  const confirmUnassign = (assignmentId, employeeName) => {
    setConfirmDialog({
      show: true,
      title: "تأكيد إلغاء تعيين الموظف",
      message: `هل أنت متأكد من إلغاء تعيين الموظف "${employeeName}" من الوردية؟`,
      onConfirm: () => unassignEmployee(assignmentId),
    });
  };

  async function deleteShift(id) {
    setLoadingStates(prev => ({ ...prev, deleteShift: true }));
    try {
      await api.delete(`/work-shifts/${id}`);
      toast.success("تم حذف الوردية ✅");
      setShifts(shifts.filter((s) => s.id !== id));
    } catch (err) {
      toast.error("فشل حذف الوردية ❌");
    } finally {
      setLoadingStates(prev => ({ ...prev, deleteShift: false }));
    }
  }

  async function assignEmployee(employeeId, shiftId) {
    try {
      const res = await api.post("/shift-assignments", {
        employee_id: employeeId,
        work_shift_id: shiftId,
      });
      console.log("Assignment response:", res.data);
      toast.success("تم تعيين الموظف في الوردية");
      setShiftAssignments(prev => ({
        ...prev,
        [res.data.data.id]: {
          employee_id: employeeId,
          shift_id: shiftId
        }
      }));
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("فشل تعيين الموظف: " + (err.response?.data?.message || err.message));
    }
  }

  async function unassignEmployee(assignmentId) {
    try {
      await api.delete(`/shift-assignments/${assignmentId}`);
      setShiftAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[assignmentId];
        return newAssignments;
      });
      toast.success("تم إزالة الموظف من الوردية");
    } catch (err) {
      console.error("Unassign error:", err);
      toast.error("فشل إزالة الموظف");
    }
  }

  const [gradeKey, setGradeKey] = useState("");
  const [gradeDays, setGradeDays] = useState(0);

  function addGradeLeave() {
    if (!gradeKey) return;
    setLeaveSettings({
      ...leaveSettings,
      by_grade: { ...leaveSettings.by_grade, [gradeKey]: gradeDays },
    });
    setGradeKey("");
    setGradeDays(0);
  }

  function removeGradeLeave(key) {
    const newByGrade = { ...leaveSettings.by_grade };
    delete newByGrade[key];
    setLeaveSettings({ ...leaveSettings, by_grade: newByGrade });
  }

  const [jobTitleSelect, setJobTitleSelect] = useState("");
  const [jobIncrease, setJobIncrease] = useState(0);

  function addJobIncrease() {
    if (!jobTitleSelect) return;
    setSalaryIncrease({
      ...salaryIncrease,
      per_job_title: { ...salaryIncrease.per_job_title, [jobTitleSelect]: jobIncrease },
    });
    setJobTitleSelect("");
    setJobIncrease(0);
  }

  function removeJobIncrease(key) {
    const newPerJob = { ...salaryIncrease.per_job_title };
    delete newPerJob[key];
    setSalaryIncrease({ ...salaryIncrease, per_job_title: newPerJob });
  }

  function getStatusBadge(status) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels = { pending: "قيد الانتظار", approved: "موافق", rejected: "مرفوض" };
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <main className="flex-1 flex flex-col main-content">
        <Topbar title="لوحة الإعدادات" />
        <div className="flex-1 p-6 pl-8">
          <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.key ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {tab.label}
                <span className="mr-2">{tab.icon}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === "organization" && (
              <OrganizationTab
                org={org}
                orgForm={orgForm}
                setOrgForm={setOrgForm}
                logoFile={logoFile}
                setLogoFile={setLogoFile}
                stampFile={stampFile}
                setStampFile={setStampFile}
                saveOrg={saveOrg}
                loadingSave={loadingStates.saveOrg}
                currencyOptions={currencyOptions}
              />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab
                attendance={attendance}
                setAttendance={setAttendance}
                warnings={warnings}
                saveAttendance={saveAttendance}
                recalculateRecords={recalculateRecords}
                shifts={shifts}
                loadingSave={loadingStates.saveAttendance || loadingStates.recalculate}
              />
            )}
            {activeTab === "leaves" && (
              <LeavesTab
                leaveSettings={leaveSettings}
                setLeaveSettings={setLeaveSettings}
                leaveRequests={leaveRequests}
                gradeKey={gradeKey}
                setGradeKey={setGradeKey}
                gradeDays={gradeDays}
                setGradeDays={setGradeDays}
                addGradeLeave={addGradeLeave}
                removeGradeLeave={removeGradeLeave}
                saveLeaveSettings={saveLeaveSettings}
                handleLeaveStatus={handleLeaveStatus}
                getStatusBadge={getStatusBadge}
                loadingStates={loadingStates}
              />
            )}
            {activeTab === "advances" && (
              <AdvancesTab
                advanceSettings={advanceSettings}
                setAdvanceSettings={setAdvanceSettings}
                advanceRequests={advanceRequests}
                saveAdvanceSettings={saveAdvanceSettings}
                handleAdvanceStatus={handleAdvanceStatus}
                getStatusBadge={getStatusBadge}
                loadingStates={loadingStates}
              />
            )}
            {activeTab === "shifts" && (
              <ShiftsTab
                shifts={shifts}
                shiftForm={shiftForm}
                setShiftForm={setShiftForm}
                saveShift={saveShift}
                deleteShift={confirmDeleteShift}
                confirmDeleteShift={confirmDeleteShift}
                employees={employees}
                shiftAssignments={shiftAssignments}
                assignEmployee={assignEmployee}
                unassignEmployee={confirmUnassign}
                loadingStates={loadingStates}
              />
            )}
            {activeTab === "financials" && (
              <FinancialsTab
                taxBrackets={taxBrackets}
                setTaxBrackets={setTaxBrackets}
                salaryIncrease={salaryIncrease}
                setSalaryIncrease={setSalaryIncrease}
                employees={employees}
                jobTitleSelect={jobTitleSelect}
                setJobTitleSelect={setJobTitleSelect}
                jobIncrease={jobIncrease}
                setJobIncrease={setJobIncrease}
                addJobIncrease={addJobIncrease}
                removeJobIncrease={removeJobIncrease}
                saveTax={saveTax}
                saveSalaryIncrease={saveSalaryIncrease}
                addTaxBracket={addTaxBracket}
                removeTaxBracket={removeTaxBracket}
                updateTaxBracket={updateTaxBracket}
                loadingStates={loadingStates}
              />
            )}
            {activeTab === "whatsapp" && (
              <WhatsAppTab
                whatsapp={whatsapp}
                setWhatsapp={setWhatsapp}
                saveWhatsApp={saveWhatsApp}
                testWhatsApp={testWhatsApp}
                loadingSave={loadingStates.saveWhatsApp}
              />
            )}
            {activeTab === "settlements" && (
              <SettlementsTab
                settlements={settlements}
                setSettlements={setSettlements}
                employees={employees}
                selectedEmployee={selectedEmployee}
                setSelectedEmployee={setSelectedEmployee}
                employeeSettlement={employeeSettlement}
                allSettlements={allSettlements}
                settlementTotals={settlementTotals}
                saveSettlements={saveSettlements}
                calculateEmployeeSettlement={calculateEmployeeSettlement}
                calculateAllSettlements={calculateAllSettlements}
                exportSettlementPDF={exportSettlementPDF}
                loadingSave={loadingStates.saveSettlements}
                loadingCalc={loadingStates.calculateSettlement}
              />
            )}
            {activeTab === "roles" && <RolesTab roles={roles} />}
          </div>
        </div>
      </main>
      
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 9999 }}
      />

      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-right">
              {confirmDialog.title}
            </h3>
            <p className="text-gray-600 mb-6 text-right">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDialog({ show: false, title: "", message: "", onConfirm: null })}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) {
                    confirmDialog.onConfirm();
                  }
                  setConfirmDialog({ show: false, title: "", message: "", onConfirm: null });
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrganizationTab({ org, orgForm, setOrgForm, logoFile, setLogoFile, stampFile, setStampFile, saveOrg, loadingSave, currencyOptions }) {
  const [customCurrency, setCustomCurrency] = useState({ name: "", symbol: "", code: "" });
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [currencies, setCurrencies] = useState(currencyOptions);
  
  const selectedCurrency = currencies.find(c => c.value === orgForm.currency) || currencies[0];

  const addCurrency = () => {
    if (customCurrency.name && customCurrency.symbol && customCurrency.code) {
      const newCurrency = {
        value: customCurrency.code,
        label: `${customCurrency.name} (${customCurrency.code})`,
        symbol: customCurrency.symbol,
        icon: "💱",
        isCustom: true,
      };
      setCurrencies([...currencies, newCurrency]);
      setOrgForm({ 
        ...orgForm, 
        currency: customCurrency.code,
        currency_symbol: customCurrency.symbol
      });
      setCustomCurrency({ name: "", symbol: "", code: "" });
      setShowAddCurrency(false);
      toast.success("تم إضافة العملة بنجاح ✅");
    }
  };

  const removeCurrency = (code) => {
    const currency = currencies.find(c => c.value === code);
    if (currency?.isCustom) {
      setCurrencies(currencies.filter(c => c.value !== code));
      if (orgForm.currency === code) {
        setOrgForm({ ...orgForm, currency: "SDG", currency_symbol: "جنيه" });
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right flex items-center gap-2">
        <span className="text-2xl">🏢</span> معلومات المؤسسة
      </h2>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-blue-800">المعلومات الأساسية</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">اسم المؤسسة</label>
              <input
                type="text"
                value={orgForm.name}
                onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل اسم المؤسسة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">رقم الهاتف</label>
              <input
                type="text"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">البريد الإلكتروني</label>
              <input
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل البريد الإلكتروني"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">العنوان</label>
              <input
                type="text"
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل العنوان"
              />
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-green-800">التسجيل والجهات الرقابية</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">رقم التسجيل الضريبي</label>
              <input
                type="text"
                value={orgForm.tax_number}
                onChange={(e) => setOrgForm({ ...orgForm, tax_number: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل رقم التسجيل الضريبي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">السجل التجاري</label>
              <input
                type="text"
                value={orgForm.commercial_register}
                onChange={(e) => setOrgForm({ ...orgForm, commercial_register: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل السجل التجاري"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">النشاط التجاري</label>
              <input
                type="text"
                value={orgForm.activity}
                onChange={(e) => setOrgForm({ ...orgForm, activity: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل النشاط التجاري"
              />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-purple-800">المعلومات الإضافية</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">عدد الموظفين</label>
              <input
                type="number"
                value={orgForm.employee_count}
                onChange={(e) => setOrgForm({ ...orgForm, employee_count: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="أدخل عدد الموظفين"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">سنة التأسيس</label>
              <input
                type="number"
                value={orgForm.foundation_year}
                onChange={(e) => setOrgForm({ ...orgForm, foundation_year: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right"
                placeholder="مثال: 2020"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-amber-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-amber-800">شعار وختم المؤسسة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">شعار المؤسسة</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
                className="w-full border rounded-lg px-4 py-2 bg-white"
              />
              {org.logo_url && (
                <div className="mt-3 text-center">
                  <img src={getStorageUrl(org.logo_url)} alt="Logo" className="h-24 mx-auto rounded-lg shadow" onError={(e) => { e.target.style.display = 'none'; console.error('Logo failed to load:', org.logo_url); }} />
                  <p className="text-sm text-gray-500 mt-1">الشعار الحالي</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">ختم المؤسسة</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setStampFile(e.target.files[0])}
                className="w-full border rounded-lg px-4 py-2 bg-white"
              />
              {org.stamp_url && (
                <div className="mt-3 text-center">
                  <img src={getStorageUrl(org.stamp_url)} alt="Stamp" className="h-24 mx-auto rounded-lg shadow" onError={(e) => { e.target.style.display = 'none'; console.error('Stamp failed to load:', org.stamp_url); }} />
                  <p className="text-sm text-gray-500 mt-1">الختم الحالي</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-5 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {org.logo_url ? (
                <img src={getStorageUrl(org.logo_url)} alt="Logo Preview" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span className="text-5xl">🏢</span>
              )}
            </div>
            <p className="text-indigo-600 font-medium">معاينة الشعار والختم</p>
            <p className="text-sm text-gray-500 mt-1">سيظهران في التقارير والخطابات</p>
          </div>
        </div>
      </div>

      {/* قسم العملة - تحت الشعار والختم */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6 border-2 border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2">
            <span className="text-2xl">💰</span> العملة الرسمية
          </h3>
          <button
            onClick={() => setShowAddCurrency(!showAddCurrency)}
            className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-orange-600"
          >
            {showAddCurrency ? "إلغاء" : "+ إضافة عملة"}
          </button>
        </div>
        
        {showAddCurrency && (
          <div className="bg-white p-4 rounded-lg mb-4 border border-orange-200">
            <h4 className="font-medium mb-3 text-right">إضافة عملة جديدة</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-right">اسم العملة</label>
                <input
                  type="text"
                  value={customCurrency.name}
                  onChange={(e) => setCustomCurrency({ ...customCurrency, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  placeholder="مثال: جنيه سوداني"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-right">الرمز</label>
                <input
                  type="text"
                  value={customCurrency.symbol}
                  onChange={(e) => setCustomCurrency({ ...customCurrency, symbol: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  placeholder="مثال: ج.س"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-right">الكود</label>
                <input
                  type="text"
                  value={customCurrency.code}
                  onChange={(e) => setCustomCurrency({ ...customCurrency, code: e.target.value.toUpperCase() })}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                  placeholder="مثال: SDG"
                />
              </div>
            </div>
            <button
              onClick={addCurrency}
              className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600"
            >
              إضافة
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-right">اختر العملة</label>
            <select
              value={orgForm.currency}
              onChange={(e) => {
                const selected = currencies.find(c => c.value === e.target.value);
                setOrgForm({ 
                  ...orgForm, 
                  currency: e.target.value,
                  currency_symbol: selected?.symbol || "جنيه"
                });
              }}
              className="w-full border rounded-lg px-4 py-3 bg-white"
            >
              {currencies.map(curr => (
                <option key={curr.value} value={curr.value}>
                  {curr.icon} {curr.label} {curr.isCustom && "✓"}
                </option>
              ))}
            </select>
            {selectedCurrency?.isCustom && (
              <button
                onClick={() => removeCurrency(orgForm.currency)}
                className="mt-2 text-red-500 text-xs hover:underline"
              >
                حذف هذه العملة
              </button>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">{selectedCurrency?.icon || "💱"}</div>
              <div className="text-2xl font-bold text-orange-700">{orgForm.currency_symbol || selectedCurrency?.symbol}</div>
              <div className="text-sm text-gray-500">الرمز المستخدم في التقارير</div>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-orange-100 p-3 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>💡 ملاحظة:</strong> هذه العملة ستُستخدم في جميع التقارير والعقود والمرتبات والسلفيات والضرائب.
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button 
          onClick={saveOrg} 
          disabled={loadingSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center gap-2"
        >
          {loadingSave ? (
            <>
              <span className="animate-spin">⟳</span> جاري الحفظ...
            </>
          ) : (
            <>💾 حفظ التغييرات</>
          )}
        </button>
      </div>
    </div>
  );
}

function AttendanceTab({ attendance, setAttendance, warnings, saveAttendance, recalculateRecords, shifts, loadingSave }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right flex items-center gap-2">
        <span className="text-2xl">⏰</span> إعدادات الحضور والإنذارات
      </h2>

      <div className="bg-blue-50 p-5 rounded-lg mb-6">
        <h3 className="font-bold mb-4 text-right text-blue-800">أوقات العمل حسب الورديات</h3>
        {shifts.length === 0 ? (
          <p className="text-center text-gray-500 py-4">لا توجد ورديات. أضف وردية جديدة من تبويب الورديات.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white">
                  <th className="border p-3 text-right">#</th>
                  <th className="border p-3 text-right">الوردية</th>
                  <th className="border p-3 text-right">زمن الحضور</th>
                  <th className="border p-3 text-right">زمن الانصراف</th>
                  <th className="border p-3 text-right">عدد الساعات</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift, index) => {
                  const startParts = shift.start_time?.split(":") || ["08", "00"];
                  const endParts = shift.end_time?.split(":") || ["16", "00"];
                  const hours = parseInt(endParts[0]) - parseInt(startParts[0]);
                  return (
                    <tr key={shift.id} className="bg-white hover:bg-blue-50 transition">
                      <td className="border p-3">{index + 1}</td>
                      <td className="border p-3 font-medium">{shift.name}</td>
                      <td className="border p-3">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                          {shift.start_time}
                        </span>
                      </td>
                      <td className="border p-3">
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold">
                          {shift.end_time}
                        </span>
                      </td>
                      <td className="border p-3">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                          {hours} ساعات
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-yellow-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-yellow-800 flex items-center gap-2">
            <span>⏱️</span> قواعد التأخير
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">زمن التأخير المسموح (دقيقة)</label>
              <input
                type="number"
                value={attendance.allowed_delay_minutes || 5}
                onChange={(e) => setAttendance({ ...attendance, allowed_delay_minutes: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">عدد التأخيرات قبل الإنذار</label>
              <input
                type="number"
                value={attendance.delay_before_warning || 2}
                onChange={(e) => setAttendance({ ...attendance, delay_before_warning: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">عدد التأخيرات قبل الخصم</label>
              <input
                type="number"
                value={attendance.delay_before_deduction || 5}
                onChange={(e) => setAttendance({ ...attendance, delay_before_deduction: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">نسبة الخصم لكل تأخير (%)</label>
              <input
                type="number"
                step="0.1"
                value={attendance.late_deduction_percent}
                onChange={(e) => setAttendance({ ...attendance, late_deduction_percent: parseFloat(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-red-800 flex items-center gap-2">
            <span>❌</span> قواعد الغياب والخصم
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">احتساب الغياب بعد (دقيقة)</label>
              <input
                type="number"
                value={attendance.absence_after_minutes || 60}
                onChange={(e) => setAttendance({ ...attendance, absence_after_minutes: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">خصم يوم عن كل غياب</label>
              <input
                type="number"
                value={attendance.absence_deduction_days || 1}
                onChange={(e) => setAttendance({ ...attendance, absence_deduction_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">فصل بعد غياب (يوم)</label>
              <input
                type="number"
                value={attendance.termination_after_days || 30}
                onChange={(e) => setAttendance({ ...attendance, termination_after_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">سيتم تنبيه الإدارة عند الوصول لهذا الحد</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-purple-800 flex items-center gap-2">
            <span>📊</span> ملخص الإعدادات
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-white rounded">
              <span className="font-bold text-purple-800">{attendance.allowed_delay_minutes} دقيقة</span>
              <span className="text-gray-600">التأخير المسموح</span>
            </div>
            <div className="flex justify-between p-3 bg-white rounded">
              <span className="font-bold text-purple-800">{attendance.delay_before_warning} تأخير</span>
              <span className="text-gray-600">قبل الإنذار</span>
            </div>
            <div className="flex justify-between p-3 bg-white rounded">
              <span className="font-bold text-purple-800">{attendance.delay_before_deduction} تأخير</span>
              <span className="text-gray-600">قبل الخصم</span>
            </div>
            <div className="flex justify-between p-3 bg-white rounded">
              <span className="font-bold text-purple-800">{attendance.late_deduction_percent}%</span>
              <span className="text-gray-600">نسبة الخصم</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center mt-6">
        <button 
          onClick={recalculateRecords} 
          disabled={loadingSave}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium disabled:bg-purple-400 flex items-center gap-2"
        >
          <span>🔄</span> إعادة حساب السجلات
        </button>
        <button 
          onClick={saveAttendance} 
          disabled={loadingSave}
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium disabled:bg-green-400 flex items-center gap-2 justify-center"
        >
          {loadingSave ? (
            <>
              <span className="animate-spin">⟳</span> جاري الحفظ...
            </>
          ) : (
            <>💾 حفظ وتحديث السجلات</>
          )}
        </button>
      </div>

      <div className="bg-gray-50 p-5 rounded-lg mt-6">
        <h3 className="font-bold mb-4 text-right flex items-center gap-2">
          <span>📋</span> سجل الإنذارات ({warnings.length})
        </h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white">
              <th className="border p-3 text-right">#</th>
              <th className="border p-3 text-right">الموظف</th>
              <th className="border p-3 text-right">الإنذار</th>
              <th className="border p-3 text-right">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {warnings.slice(0, 10).map((w, i) => (
              <tr key={w.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-3">{i + 1}</td>
                <td className="border p-3 font-medium">{w.employee?.name || w.employee_id}</td>
                <td className="border p-3">{w.note}</td>
                <td className="border p-3">{formatDateDisplay(w.created_at)}</td>
              </tr>
            ))}
            {warnings.length === 0 && (
              <tr>
                <td colSpan="4" className="border p-4 text-center text-gray-500">لا توجد إنذارات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeavesTab({
  leaveSettings,
  setLeaveSettings,
  leaveRequests,
  gradeKey,
  setGradeKey,
  gradeDays,
  setGradeDays,
  addGradeLeave,
  removeGradeLeave,
  saveLeaveSettings,
  handleLeaveStatus,
  getStatusBadge,
  loadingStates,
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right flex items-center gap-2">
        <span className="text-2xl">🏖️</span> إعدادات الإجازات
      </h2>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-purple-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-purple-800">أيام الإجازات الأساسية</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">الإجازة السنوية</label>
              <input
                type="number"
                value={leaveSettings.annual_days}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, annual_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">الإجازة المرضية</label>
              <input
                type="number"
                value={leaveSettings.sick_days}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, sick_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">إجازة الأمومة</label>
              <input
                type="number"
                value={leaveSettings.maternity_days}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, maternity_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">إجازة الحج</label>
              <input
                type="number"
                value={leaveSettings.hajj_days || 14}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, hajj_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-indigo-800">قواعد ومتطلبات الإجازات</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-right">إشعار قبل الإجازة (أيام)</label>
              <input
                type="number"
                value={leaveSettings.notice_days}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, notice_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">إجازة الطوارئ</label>
              <input
                type="number"
                value={leaveSettings.emergency_days || 3}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, emergency_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-right">الحد الأقصى للإجازة بدون راتب</label>
              <input
                type="number"
                value={leaveSettings.unpaid_leave_max_days || 30}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, unpaid_leave_max_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <span className="text-sm">السماح بالإجازة بدون راتب</span>
              <input
                type="checkbox"
                checked={leaveSettings.leave_without_salary}
                onChange={(e) => setLeaveSettings({ ...leaveSettings, leave_without_salary: e.target.checked })}
                className="w-5 h-5"
              />
            </div>
          </div>
        </div>

        <div className="bg-cyan-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4 text-right text-cyan-800">الإجازات بالدرجة الوظيفية</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={addGradeLeave} className="bg-cyan-600 text-white px-4 py-2 rounded-lg">+</button>
            <input
              type="number"
              placeholder="أيام"
              value={gradeDays}
              onChange={(e) => setGradeDays(parseInt(e.target.value))}
              className="w-20 border rounded px-3 py-2 text-right"
            />
            <input
              placeholder="الدرجة"
              value={gradeKey}
              onChange={(e) => setGradeKey(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-right"
            />
          </div>
          <div className="space-y-2 max-h-40 overflow-auto">
            {Object.entries(leaveSettings.by_grade || {}).map(([key, days]) => (
              <div key={key} className="flex justify-between items-center bg-white p-2 rounded">
                <button onClick={() => removeGradeLeave(key)} className="text-red-600 font-bold">×</button>
                <span className="font-medium">{key}: {days} يوم</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={saveLeaveSettings} 
        disabled={loadingStates?.saveLeaveSettings}
        className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 font-medium mb-6 disabled:bg-purple-400 flex items-center gap-2 justify-center"
      >
        {loadingStates?.saveLeaveSettings ? (
          <>
            <span className="animate-spin">⟳</span> جاري الحفظ...
          </>
        ) : (
          <>💾 حفظ إعدادات الإجازات</>
        )}
      </button>

      <h3 className="font-bold mb-4 text-right flex items-center gap-2">
        <span>📋</span> طلبات الإجازات ({leaveRequests.length})
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-3 text-right">#</th>
            <th className="border p-3 text-right">الموظف</th>
            <th className="border p-3 text-right">النوع</th>
            <th className="border p-3 text-right">من</th>
            <th className="border p-3 text-right">إلى</th>
            <th className="border p-3 text-right">الأيام</th>
            <th className="border p-3 text-right">الحالة</th>
            <th className="border p-3 text-center">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.length === 0 ? (
            <tr>
              <td colSpan="8" className="border p-4 text-center text-gray-500">لا توجد طلبات</td>
            </tr>
          ) : (
            leaveRequests.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-3">{i + 1}</td>
                <td className="border p-3 font-medium">{r.employee?.name || r.employee_id}</td>
                <td className="border p-3">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">{r.type}</span>
                </td>
                <td className="border p-3">{formatDateDisplay(r.from_date)}</td>
                <td className="border p-3">{formatDateDisplay(r.to_date)}</td>
                <td className="border p-3">{r.days || 1}</td>
                <td className="border p-3">{getStatusBadge(r.status)}</td>
                <td className="border p-3 text-center">
                  {r.status === "pending" && (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleLeaveStatus(r.id, "rejected")}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                      >
                        رفض
                      </button>
                      <button
                        onClick={() => handleLeaveStatus(r.id, "approved")}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        موافقة
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdvancesTab({
  advanceSettings,
  setAdvanceSettings,
  advanceRequests,
  saveAdvanceSettings,
  handleAdvanceStatus,
  getStatusBadge,
  loadingStates,
}) {
  const shortAdvance = advanceSettings.short_advance || {};
  const longAdvance = advanceSettings.long_advance || {};

  const updateShortAdvance = (key, value) => {
    setAdvanceSettings({
      ...advanceSettings,
      short_advance: { ...shortAdvance, [key]: value }
    });
  };

  const updateLongAdvance = (key, value) => {
    setAdvanceSettings({
      ...advanceSettings,
      long_advance: { ...longAdvance, [key]: value }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right flex items-center gap-2">
        <span className="text-2xl">💰</span> إعدادات السلفيات
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* سلفة قصيرة */}
        <div className="bg-green-50 p-5 rounded-lg border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-right text-green-800 flex items-center gap-2">
              <span className="text-2xl">⚡</span> سلفة قصيرة
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm">تفعيل</span>
              <input
                type="checkbox"
                checked={shortAdvance.enabled ?? true}
                onChange={(e) => updateShortAdvance('enabled', e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">تخصم من مرتب الشهر الجاري</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-right">النسبة من إجمالي المرتب (%)</label>
                <input
                  type="number"
                  value={shortAdvance.max_percent || 50}
                  onChange={(e) => updateShortAdvance('max_percent', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-right">الحد الأقصى بالجنيه</label>
                <input
                  type="number"
                  value={shortAdvance.max_amount || 50000}
                  onChange={(e) => updateShortAdvance('max_amount', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">نسبة الخصم من إجمالي المرتب (%)</label>
              <input
                type="number"
                value={shortAdvance.deduction_percent || 100}
                onChange={(e) => updateShortAdvance('deduction_percent', parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-right"
              />
              <p className="text-xs text-gray-500 mt-1">100% = تخصم من الراتب كامل، 50% = نصف الراتب</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>مثال:</strong> راتب 200,000 × {shortAdvance.max_percent || 50}% = {((200000 * (shortAdvance.max_percent || 50)) / 100).toLocaleString()} ج.س (الحد الأقصى: {shortAdvance.max_amount || 50}%)
              </p>
            </div>
          </div>
        </div>

        {/* سلفة طويلة */}
        <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-right text-blue-800 flex items-center gap-2">
              <span className="text-2xl">📅</span> سلفة طويلة
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm">تفعيل</span>
              <input
                type="checkbox"
                checked={longAdvance.enabled ?? true}
                onChange={(e) => updateLongAdvance('enabled', e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">تقسط على عدة أشهر</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-right">النسبة من إجمالي المرتب (%)</label>
                <input
                  type="number"
                  value={longAdvance.max_percent || 100}
                  onChange={(e) => updateLongAdvance('max_percent', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-right">الحد الأقصى بالجنيه</label>
                <input
                  type="number"
                  value={longAdvance.max_amount || 500000}
                  onChange={(e) => updateLongAdvance('max_amount', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-right">الحد الأدنى (SDG)</label>
                <input
                  type="number"
                  value={longAdvance.min_amount || 10000}
                  onChange={(e) => updateLongAdvance('min_amount', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-right">أشهر الخدمة المطلوبة</label>
                <input
                  type="number"
                  value={longAdvance.min_service_months || 6}
                  onChange={(e) => updateLongAdvance('min_service_months', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-right">أقل عدد أقساط</label>
                <input
                  type="number"
                  value={longAdvance.min_installments || 3}
                  onChange={(e) => updateLongAdvance('min_installments', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-right">أكثر عدد أقساط</label>
                <input
                  type="number"
                  value={longAdvance.max_installments || 12}
                  onChange={(e) => updateLongAdvance('max_installments', parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-right"
                />
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>مثال:</strong> راتب 200,000 × {longAdvance.max_percent || 100}% = {((200000 * (longAdvance.max_percent || 100)) / 100).toLocaleString()} ج.س
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ملخص */}
      <div className="bg-yellow-50 p-5 rounded-lg mb-6">
        <h3 className="font-bold mb-4 text-right text-yellow-800">ملخص الإعدادات</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{shortAdvance.enabled ? "✅" : "❌"}</p>
            <p className="text-sm">سلفة قصيرة</p>
            <p className="text-xs text-gray-500">حتى {shortAdvance.max_percent || 50}% ({shortAdvance.max_amount || 50}%)</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{longAdvance.enabled ? "✅" : "❌"}</p>
            <p className="text-sm">سلفة طويلة</p>
            <p className="text-xs text-gray-500">حتى {longAdvance.max_installments || 12} شهر</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-2xl font-bold">{longAdvance.min_service_months || 6}</p>
            <p className="text-sm">أشهر الخدمة</p>
            <p className="text-xs text-gray-500">لل سلفة طويلة</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-2xl font-bold">{advanceSettings.enabled ? "✅" : "❌"}</p>
            <p className="text-sm">السلفيات</p>
            <p className="text-xs text-gray-500">الحالة العامة</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={saveAdvanceSettings}
          disabled={loadingStates?.saveAdvanceSettings}
          className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-medium disabled:bg-yellow-300 flex items-center gap-2"
        >
          {loadingStates?.saveAdvanceSettings ? (
            <><span className="animate-spin">⟳</span> جاري الحفظ...</>
          ) : (
            <>💾 حفظ إعدادات السلفيات</>
          )}
        </button>
      </div>

      <h3 className="font-bold mb-4 text-right flex items-center gap-2">
        <span>📋</span> طلبات السلفيات ({advanceRequests.length})
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-3 text-right">#</th>
            <th className="border p-3 text-right">الموظف</th>
            <th className="border p-3 text-right">النوع</th>
            <th className="border p-3 text-right">المبلغ</th>
            <th className="border p-3 text-right">الأقساط</th>
            <th className="border p-3 text-right">التاريخ</th>
            <th className="border p-3 text-right">الحالة</th>
            <th className="border p-3 text-center">إجراء</th>
          </tr>
        </thead>
        <tbody>
          {advanceRequests.length === 0 ? (
            <tr>
              <td colSpan="8" className="border p-4 text-center text-gray-500">لا توجد طلبات</td>
            </tr>
          ) : (
            advanceRequests.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-3">{i + 1}</td>
                <td className="border p-3 font-medium">{r.employee?.name || r.employee_id}</td>
                <td className="border p-3">
                  <span className={`px-2 py-1 rounded text-xs ${r.type === 'short' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {r.type === 'short' ? 'قصيرة' : 'طويلة'}
                  </span>
                </td>
                <td className="border p-3">{parseFloat(r.amount).toLocaleString()} ج.س</td>
                <td className="border p-3">{r.installments || 1} شهر</td>
                <td className="border p-3">{formatDateDisplay(r.created_at)}</td>
                <td className="border p-3">{getStatusBadge(r.status)}</td>
                <td className="border p-3 text-center">
                  {r.status === "pending" && (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleAdvanceStatus(r.id, "reject")}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                      >
                        رفض
                      </button>
                      <button
                        onClick={() => handleAdvanceStatus(r.id, "approve")}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        موافقة
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ShiftsTab({ shifts, shiftForm, setShiftForm, saveShift, deleteShift, confirmDeleteShift, employees, shiftAssignments, assignEmployee, unassignEmployee }) {
  const [selectedShift, setSelectedShift] = useState(shifts[0]?.id || "");

  const DAYS = [
    { value: 0, label: "الأحد" },
    { value: 1, label: "الاثنين" },
    { value: 2, label: "الثلاثاء" },
    { value: 3, label: "الأربعاء" },
    { value: 4, label: "الخميس" },
    { value: 5, label: "الجمعة" },
    { value: 6, label: "السبت" },
  ];

  const toggleDay = (day, type) => {
    const key = type === 'work' ? 'week_days' : 'weekend_days';
    const otherKey = type === 'work' ? 'weekend_days' : 'week_days';
    const current = shiftForm[key] || [];
    if (current.includes(day)) return;
    
    const other = shiftForm[otherKey] || [];
    const newOther = other.filter(d => d !== day);
    
    setShiftForm({
      ...shiftForm,
      [key]: [...current, day].sort(),
      [otherKey]: newOther,
    });
  };

  const getShiftEmployees = (shiftId) => {
    const shiftIdNum = parseInt(shiftId);
    const result = [];
    Object.entries(shiftAssignments).forEach(([assignId, data]) => {
      if (parseInt(data.shift_id) === shiftIdNum) {
        const emp = employees.find(e => e.id === parseInt(data.employee_id));
        if (emp) {
          result.push({ ...emp, assignmentId: parseInt(assignId) });
        }
      }
    });
    return result;
  };

  const getUnassignedEmployees = (shiftId) => {
    const shiftIdNum = parseInt(shiftId);
    const assignedEmployeeIds = Object.values(shiftAssignments)
      .filter(data => parseInt(data.shift_id) === shiftIdNum)
      .map(data => parseInt(data.employee_id));
    return employees.filter(emp => !assignedEmployeeIds.includes(parseInt(emp.id)));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right">👥 إعدادات الورديات</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-cyan-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4 text-right">إنشاء وردية جديدة</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-right">اسم الوردية</label>
              <input
                type="text"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right"
                placeholder="مثال: وردية صباحية"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1 text-right">وقت البدء</label>
                <input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-right"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-right">وقت الانتهاء</label>
                <input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-right"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftForm.is_overnight || false}
                  onChange={(e) => {
                    const isOvernight = e.target.checked;
                    let hours = 8;
                    if (isOvernight) {
                      hours = 24;
                    } else {
                      const [startH, startM] = (shiftForm.start_time || "08:00").split(":").map(Number);
                      const [endH, endM] = (shiftForm.end_time || "16:00").split(":").map(Number);
                      hours = (endH * 60 + endM - startH * 60 - startM) / 60;
                      if (hours <= 0) hours = hours + 24;
                    }
                    setShiftForm({ ...shiftForm, is_overnight: isOvernight, working_hours: hours });
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">الوردية تمر بعد منتصف الليل (24 ساعة)</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mr-6">
                {shiftForm.is_overnight 
                  ? "مثال: من 08:00 صباحاً إلى 08:00 صباحاً (اليوم التالي) = 24 ساعة"
                  : "الوقت ينتهي في نفس اليوم"
                }
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <label className="block text-sm mb-1 text-right">ساعات العمل</label>
                <input
                  type="number"
                  value={shiftForm.working_hours}
                  onChange={(e) => setShiftForm({ ...shiftForm, working_hours: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2 text-right"
                  min="1"
                  max="24"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-right">اللون</label>
                <input
                  type="color"
                  value={shiftForm.color}
                  onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-10 cursor-pointer"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm mb-2 text-right">أيام العمل</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value, 'work')}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      (shiftForm.week_days || []).includes(day.value)
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm mb-2 text-right">أيام الراحة</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value, 'off')}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      (shiftForm.weekend_days || []).includes(day.value)
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={saveShift}
            className="w-full bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 mt-4"
          >
            إنشاء الوردية
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4 text-right">الورديات الحالية ({shifts.length})</h3>
          <div className="space-y-2 max-h-40 overflow-auto">
            {shifts.length === 0 ? (
              <p className="text-gray-500 text-center">لا توجد ورديات</p>
            ) : (
              shifts.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-gray-500 mr-2">
                      {s.start_time} - {s.end_time} {s.is_overnight ? "(24 س)" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmDeleteShift(s.id, s.name)}
                    className="text-red-600 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-bold mb-4 text-right">تعيين الموظفين في الورديات</h3>
        
        <div className="mb-4">
          <label className="block text-sm mb-2 text-right">اختر الوردية</label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full border rounded px-3 py-2 text-right"
          >
            <option value="">اختر الوردية</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.start_time} - {s.end_time}){s.is_overnight ? " [24 س]" : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedShift && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-bold mb-3 text-right">الموظفين المعينين ({getShiftEmployees(selectedShift).length})</h4>
              <div className="space-y-2 max-h-48 overflow-auto">
                {getShiftEmployees(selectedShift).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا يوجد موظفين معيين</p>
                ) : (
                  getShiftEmployees(selectedShift).map((emp) => (
                    <div key={emp.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-sm">{emp.name}</span>
                      <button
                        onClick={() => unassignEmployee(emp.assignmentId, emp.name)}
                        className="text-red-600 hover:bg-red-100 px-2 py-1 rounded text-xs"
                      >
                        إزالة
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-bold mb-3 text-right">تعيين موظف جديد</h4>
              <div className="flex gap-2">
                <select
                  id="emp-select"
                  className="flex-1 border rounded px-3 py-2 text-right"
                >
                  <option value="">اختر الموظف</option>
                  {getUnassignedEmployees(selectedShift).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('emp-select');
                    if (select.value) {
                      assignEmployee(parseInt(select.value), parseInt(selectedShift));
                      select.value = "";
                    }
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  تعيين
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FinancialsTab({
  taxBrackets,
  salaryIncrease,
  setSalaryIncrease,
  employees,
  jobTitleSelect,
  setJobTitleSelect,
  jobIncrease,
  setJobIncrease,
  addJobIncrease,
  removeJobIncrease,
  saveTax,
  saveSalaryIncrease,
  addTaxBracket,
  removeTaxBracket,
  updateTaxBracket,
  loadingStates,
}) {
  const jobTitles = [...new Set(employees.map((emp) => emp.job_title).filter(Boolean))];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-right">💵 الإعدادات المالية</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* الزيادة السنوية */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4 text-right">📈 الزيادة السنوية للمرتب</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-right">النسبة الافتراضية للزيادة (%)</label>
              <input
                type="number"
                value={salaryIncrease.default_percent}
                onChange={(e) =>
                  setSalaryIncrease({ ...salaryIncrease, default_percent: parseFloat(e.target.value) })
                }
                className="w-full border rounded px-3 py-2 text-right"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">الحد الأدنى لفترة الخدمة (أشهر)</label>
              <input
                type="number"
                value={salaryIncrease.min_service_months}
                onChange={(e) =>
                  setSalaryIncrease({ ...salaryIncrease, min_service_months: parseInt(e.target.value) })
                }
                className="w-full border rounded px-3 py-2 text-right"
              />
            </div>
            <div className="p-3 bg-white rounded-lg flex items-center justify-between">
              <span className="font-medium">تطبيق الزيادة تلقائياً</span>
              <input
                type="checkbox"
                checked={salaryIncrease.apply_automatically}
                onChange={(e) =>
                  setSalaryIncrease({ ...salaryIncrease, apply_automatically: e.target.checked })
                }
                className="w-5 h-5"
              />
            </div>
            <div className="border-t pt-3 mt-3">
              <h4 className="font-medium mb-2 text-right">زيادة مخصصة حسب الوظيفة</h4>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={addJobIncrease}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  +
                </button>
                <input
                  type="number"
                  placeholder="%"
                  value={jobIncrease}
                  onChange={(e) => setJobIncrease(parseFloat(e.target.value))}
                  className="w-20 border rounded px-3 py-2 text-right"
                />
                <select
                  value={jobTitleSelect}
                  onChange={(e) => setJobTitleSelect(e.target.value)}
                  className="flex-1 border rounded px-3 py-2 text-right"
                >
                  <option value="">اختر الوظيفة</option>
                  {jobTitles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 max-h-32 overflow-auto">
                {Object.entries(salaryIncrease.per_job_title || {}).map(([title, percent]) => (
                  <div key={title} className="flex justify-between items-center bg-white p-2 rounded">
                    <button onClick={() => removeJobIncrease(title)} className="text-red-600 font-bold">
                      ×
                    </button>
                    <span className="text-sm">
                      {title}: {percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={saveSalaryIncrease}
            disabled={loadingStates?.saveSalaryIncrease}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mt-4 disabled:bg-green-400 flex items-center justify-center gap-2"
          >
            {loadingStates?.saveSalaryIncrease ? (
              <><span className="animate-spin">⟳</span> جاري الحفظ...</>
            ) : (
              <>💾 حفظ الزيادة السنوية</>
            )}
          </button>
        </div>

        {/* ضريبة الدخل */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">📊 ضريبة الدخل الشخصي</h3>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm">شرائح الضريبة (SDG شهري)</span>
            <button
              onClick={addTaxBracket}
              className="bg-orange-600 text-white px-3 py-1 rounded text-sm"
            >
              + إضافة
            </button>
          </div>
          <table className="w-full border-collapse text-sm mb-3">
            <thead>
              <tr className="bg-white">
                <th className="border p-2 text-left">من</th>
                <th className="border p-2 text-left">إلى</th>
                <th className="border p-2 text-left">%</th>
                <th className="border p-2 text-center">حذف</th>
              </tr>
            </thead>
            <tbody>
              {taxBrackets.map((b, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border p-1">
                    <input
                      type="number"
                      value={b.min}
                      onChange={(e) => updateTaxBracket(i, "min", e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      value={b.max === 999999999 ? "" : b.max}
                      onChange={(e) => updateTaxBracket(i, "max", e.target.value || 999999999)}
                      className="w-full border rounded px-2 py-1"
                      placeholder="بدون حد"
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      step="0.5"
                      value={b.rate}
                      onChange={(e) => updateTaxBracket(i, "rate", e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <td className="border p-1 text-center">
                    <button onClick={() => removeTaxBracket(i)} className="text-red-600 font-bold">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={saveTax}
            disabled={loadingStates?.saveTax}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
          >
            {loadingStates?.saveTax ? (
              <><span className="animate-spin">⟳</span> جاري الحفظ...</>
            ) : (
              <>💾 حفظ الشرائح</>
            )}
          </button>
        </div>
      </div>

      {/* مثال على حساب الضريبة */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold mb-4">مثال على حساب الضريبة</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded">
            <p className="font-medium mb-2">مرتب 8,000 SDG</p>
            <p className="text-sm text-gray-600">0 - 6,000: معفى</p>
            <p className="text-sm text-gray-600">6,000 - 8,000: 2,000 × 5% = 100 SDG</p>
            <p className="font-bold text-orange-600 mt-2">الضريبة: 100 SDG</p>
          </div>
          <div className="bg-white p-3 rounded">
            <p className="font-medium mb-2">مرتب 20,000 SDG</p>
            <p className="text-sm text-gray-600">6,000 × 5% = 300</p>
            <p className="text-sm text-gray-600">8,000 × 10% = 800</p>
            <p className="font-bold text-orange-600 mt-2">الضريبة: 1,100 SDG</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppTab({ whatsapp, setWhatsapp, saveWhatsApp, testWhatsApp, loadingSave }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">📱 إعدادات واتساب</h2>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-emerald-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">الإعدادات</h3>
          <div className="space-y-3">
            <div className="p-3 bg-emerald-100 rounded">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsapp.enabled}
                  onChange={(e) => setWhatsapp({ ...whatsapp, enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="font-bold text-emerald-800">تفعيل إشعارات واتساب</span>
              </label>
            </div>
            <div>
              <label className="block text-sm mb-1">API URL</label>
              <input
                type="text"
                value={whatsapp.api_url}
                onChange={(e) => setWhatsapp({ ...whatsapp, api_url: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://api.whatsapp.com/send"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">API Key</label>
              <input
                type="password"
                value={whatsapp.api_key}
                onChange={(e) => setWhatsapp({ ...whatsapp, api_key: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">رقم الواتساب</label>
              <input
                type="text"
                value={whatsapp.phone_number}
                onChange={(e) => setWhatsapp({ ...whatsapp, phone_number: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="249xxxxxxxxx"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveWhatsApp}
              disabled={loadingSave}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 flex items-center justify-center gap-2"
            >
              {loadingSave ? (
                <><span className="animate-spin">⟳</span> جاري الحفظ...</>
              ) : (
                <>💾 حفظ</>
              )}
            </button>
            <button
              onClick={testWhatsApp}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              اختبار
            </button>
          </div>
        </div>

        <div className="bg-emerald-100 p-4 rounded-lg">
          <h3 className="font-bold mb-4">قوالب الرسائل</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة الإنذار</label>
              <textarea
                value={whatsapp.message_template_warning}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_warning: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، تم إصدار إنذار رقم {warning_no} بسبب {reason}"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة الإجازة</label>
              <textarea
                value={whatsapp.message_template_leave}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_leave: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، تم {action} طلب الإجازة المقدم من {from} إلى {to}"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة السلفة</label>
              <textarea
                value={whatsapp.message_template_advance}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_advance: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، تم {action} طلب السلفة بمبلغ {amount}"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة التأخير</label>
              <textarea
                value={whatsapp.message_template_late}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_late: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، تم تسجيل تأخير اليوم"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة التعيين</label>
              <textarea
                value={whatsapp.message_template_appointment}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_appointment: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، يسعدنا إخباركم بانضمامكم إلينا في {company} بتاريخ {date}..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-right">قالب رسالة انتهاء الإجازة</label>
              <textarea
                value={whatsapp.message_template_leave_end}
                onChange={(e) => setWhatsapp({ ...whatsapp, message_template_leave_end: e.target.value })}
                className="w-full border rounded px-3 py-2 text-right text-sm"
                rows={2}
                placeholder="عزيزي {name}، نذكّركم بأن إجازتكم ستنتهي غداً..."
              />
            </div>
          </div>
        </div>

        <div className="bg-lime-50 p-4 rounded-lg">
          <h3 className="font-bold mb-4">إرسال الإشعارات عند:</h3>
          <div className="space-y-2">
            {[
              { key: "notify_on_warning", label: "إصدار إنذار" },
              { key: "notify_on_leave", label: "موافقة/رفض إجازة" },
              { key: "notify_on_advance", label: "موافقة/رفض سلفة" },
              { key: "notify_on_late", label: "التأخير في الحضور" },
              { key: "notify_on_appointment", label: "تعيين موظف جديد" },
              { key: "notify_on_leave_end", label: "انتهاء الإجازة (قبل يوم)" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3 p-3 bg-white rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsapp[item.key]}
                  onChange={(e) => setWhatsapp({ ...whatsapp, [item.key]: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettlementsTab({
  settlements,
  setSettlements,
  employees,
  selectedEmployee,
  setSelectedEmployee,
  employeeSettlement,
  allSettlements,
  settlementTotals,
  saveSettlements,
  calculateEmployeeSettlement,
  calculateAllSettlements,
  exportSettlementPDF,
  loadingSave,
  loadingCalc
}) {
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return new Intl.NumberFormat('ar-SD', { minimumFractionDigits: 2 }).format(amount);
  };

  const updateSettlement = (key, field, value) => {
    setSettlements(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">📋 التسوية والمعاشات</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              مكافأة نهاية الخدمة
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-green-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settlements.service_end_bonus?.enabled ?? true}
                  onChange={(e) => updateSettlement('service_end_bonus', 'enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <span>تفعيل مكافأة نهاية الخدمة</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">الأشهر لكل سنة خدمة</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={settlements.service_end_bonus?.months_per_year ?? 1}
                    onChange={(e) => updateSettlement('service_end_bonus', 'months_per_year', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.service_end_bonus?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأقصى للأشهر (0=بدون حد)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.service_end_bonus?.max_months ?? 0}
                    onChange={(e) => updateSettlement('service_end_bonus', 'max_months', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.service_end_bonus?.enabled}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                مثال: إذا كان الراتب 10,000 وعدد الأشهر = 1، فالمكافأة = 10,000 × 1 = 10,000 جنيه لكل سنة
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              تعويض إنهاء الخدمة (حسب قانون العمل)
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settlements.severance_pay?.enabled ?? true}
                  onChange={(e) => updateSettlement('severance_pay', 'enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <span>تفعيل تعويض إنهاء الخدمة</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">الأشهر (أول 5 سنوات)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.severance_pay?.first_5_years_months ?? 1}
                    onChange={(e) => updateSettlement('severance_pay', 'first_5_years_months', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.severance_pay?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الأشهر (بعد 5 سنوات)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.severance_pay?.after_5_years_months ?? 2}
                    onChange={(e) => updateSettlement('severance_pay', 'after_5_years_months', parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.severance_pay?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأقصى للسنوات</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.severance_pay?.max_years ?? 12}
                    onChange={(e) => updateSettlement('severance_pay', 'max_years', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.severance_pay?.enabled}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                مثال: 1 شهر للسنة الأولى، 2 شهر بعد 5 سنوات (حسب قانون العمل)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">📢</span>
              فترة الإخطار المسبقة
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settlements.notice_period?.enabled ?? true}
                  onChange={(e) => updateSettlement('notice_period', 'enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <span>تفعيل تعويض فترة الإخطار</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">أقل من 5 سنوات (أيام)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.notice_period?.by_service_years?.["0-5"] ?? 30}
                    onChange={(e) => updateSettlement('notice_period', 'by_service_years', { ...settlements.notice_period?.by_service_years, "0-5": parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.notice_period?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">5-10 سنوات (أيام)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.notice_period?.by_service_years?.["5-10"] ?? 60}
                    onChange={(e) => updateSettlement('notice_period', 'by_service_years', { ...settlements.notice_period?.by_service_years, "5-10": parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.notice_period?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">أكثر من 10 سنوات (أيام)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.notice_period?.by_service_years?.["10+"] ?? 90}
                    onChange={(e) => updateSettlement('notice_period', 'by_service_years', { ...settlements.notice_period?.by_service_years, "10+": parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.notice_period?.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">🏖️</span>
              استبدال الإجازات النقدية
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settlements.annual_leave_encashment?.enabled ?? true}
                  onChange={(e) => updateSettlement('annual_leave_encashment', 'enabled', e.target.checked)}
                  className="w-5 h-5"
                />
                <span>تفعيل استبدال الإجازات</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأقصى للأيام (0=بدون حد)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.annual_leave_encashment?.max_days_per_year ?? 0}
                    onChange={(e) => updateSettlement('annual_leave_encashment', 'max_days_per_year', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.annual_leave_encashment?.enabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأدنى لخدمة (أشهر)</label>
                  <input
                    type="number"
                    min="0"
                    value={settlements.annual_leave_encashment?.min_service_months ?? 0}
                    onChange={(e) => updateSettlement('annual_leave_encashment', 'min_service_months', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!settlements.annual_leave_encashment?.enabled}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={saveSettlements}
            disabled={loadingSave}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center gap-2 font-medium"
          >
            {loadingSave ? (
              <><span className="animate-spin">⟳</span> جاري الحفظ...</>
            ) : (
              <>💾 حفظ الإعدادات</>
            )}
          </button>
        </div>

        {/* Right: Calculator */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-lg mb-4">🧮 حساب تسوية موظف</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">اختر الموظف</label>
              <select
                value={selectedEmployee || ""}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  calculateEmployeeSettlement(e.target.value);
                }}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">-- اختر موظف --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position || 'بدون مسمى'})
                  </option>
                ))}
              </select>
            </div>

            {employeeSettlement && (
              <div className="mt-4 space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-3">معلومات الخدمة</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>سنوات الخدمة: <strong>{employeeSettlement.years_of_service} سنة</strong></div>
                    <div>أشهر الخدمة: <strong>{employeeSettlement.months_of_service} شهر</strong></div>
                    <div>تاريخ التعيين: <strong>{employeeSettlement.hire_date}</strong></div>
                    <div>تاريخ الانتهاء: <strong>{employeeSettlement.service_end_date}</strong></div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-3">المستحقات</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>مكافأة إنهاء الخدمة:</span>
                      <strong className="text-green-600">{formatCurrency(employeeSettlement.severance_pay)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>تعويض فترة الإخطار ({employeeSettlement.notice_period_days} يوم):</span>
                      <strong className="text-green-600">{formatCurrency(employeeSettlement.notice_period_amount)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>استبدال الإجازات ({employeeSettlement.unused_leave_days} يوم):</span>
                      <strong className="text-green-600">{formatCurrency(employeeSettlement.unused_leave_amount)}</strong>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>إجمالي المستحقات:</span>
                      <span className="text-green-600">{formatCurrency(employeeSettlement.total_due)}</span>
                    </div>
                  </div>
                </div>

                {employeeSettlement.total_deduct > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-3">الخصومات</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>سلفيات مستحقة الخصم:</span>
                        <strong className="text-red-600">{formatCurrency(employeeSettlement.remaining_advances)}</strong>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                        <span>إجمالي الخصومات:</span>
                        <span className="text-red-600">{formatCurrency(employeeSettlement.total_deduct)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-indigo-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">صافي التسوية:</span>
                    <span className="font-bold text-2xl text-indigo-700">{formatCurrency(employeeSettlement.net_settlement)}</span>
                  </div>
                </div>

                <button
                  onClick={() => selectedEmployee && exportSettlementPDF(selectedEmployee)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  📄 تحميل تسوية PDF
                </button>
              </div>
            )}

            {!employeeSettlement && (
              <p className="text-gray-500 text-center py-4">اختر موظفاً لحساب تسويته</p>
            )}
          </div>

          <button
            onClick={calculateAllSettlements}
            disabled={loadingCalc}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2 font-medium"
          >
            {loadingCalc ? (
              <><span className="animate-spin">⟳</span> جاري الحساب...</>
            ) : (
              <>📊 حساب تسويات جميع الموظفين</>
            )}
          </button>

          {allSettlements.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-bold text-lg mb-4">📊 ملخص التسويات ({settlementTotals?.total_employees} موظف)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-right">#</th>
                      <th className="p-2 text-right">الاسم</th>
                      <th className="p-2 text-right">سنوات الخدمة</th>
                      <th className="p-2 text-right">صافي التسوية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSettlements.map((s, i) => (
                      <tr key={s.employee_id} className="border-t">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 font-medium">{s.employee_name}</td>
                        <td className="p-2">{s.years_of_service} سنة</td>
                        <td className="p-2 font-bold text-indigo-600">{formatCurrency(s.net_settlement)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-100 font-bold">
                      <td colspan="3" className="p-2">الإجمالي</td>
                      <td className="p-2">{formatCurrency(settlementTotals?.total_net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AVAILABLE_PERMISSIONS = [
  // Employees
  { key: 'employees.view', label: 'عرض الموظفين', module: 'employees' },
  { key: 'employees.create', label: 'إضافة موظف', module: 'employees' },
  { key: 'employees.edit', label: 'تعديل موظف', module: 'employees' },
  { key: 'employees.delete', label: 'حذف موظف', module: 'employees' },
  { key: 'employees.terminate', label: 'إنهاء خدمة الموظف', module: 'employees' },
  { key: 'employees.restore', label: 'استعادة موظف', module: 'employees' },
  { key: 'employees.evaluate', label: 'تقييم موظف', module: 'employees' },
  // Departments
  { key: 'departments.view', label: 'عرض الأقسام', module: 'departments' },
  { key: 'departments.create', label: 'إضافة قسم', module: 'departments' },
  { key: 'departments.edit', label: 'تعديل قسم', module: 'departments' },
  { key: 'departments.delete', label: 'حذف قسم', module: 'departments' },
  // Attendance
  { key: 'attendance.view', label: 'عرض الحضور', module: 'attendance' },
  { key: 'attendance.manage', label: 'إدارة الحضور', module: 'attendance' },
  { key: 'attendance.sync', label: 'مزامنة الحضور', module: 'attendance' },
  { key: 'attendance.excuse', label: 'قبول عذر', module: 'attendance' },
  // Devices
  { key: 'devices.view', label: 'عرض الأجهزة', module: 'devices' },
  { key: 'devices.manage', label: 'إدارة الأجهزة', module: 'devices' },
  // Leaves
  { key: 'leaves.view', label: 'عرض الإجازات', module: 'leaves' },
  { key: 'leaves.approve', label: 'موافقة على إجازات', module: 'leaves' },
  { key: 'leaves.reject', label: 'رفض إجازات', module: 'leaves' },
  { key: 'leaves.manage', label: 'إدارة الإجازات', module: 'leaves' },
  { key: 'leaves.request', label: 'طلب إجازة', module: 'leaves' },
  // Advances
  { key: 'advances.view', label: 'عرض السلفيات', module: 'advances' },
  { key: 'advances.approve', label: 'موافقة على سلفية', module: 'advances' },
  { key: 'advances.reject', label: 'رفض سلفية', module: 'advances' },
  { key: 'advances.manage', label: 'إدارة السلفيات', module: 'advances' },
  { key: 'advances.request', label: 'طلب سلفة', module: 'advances' },
  // Warnings
  { key: 'warnings.view', label: 'عرض الإنذارات', module: 'warnings' },
  { key: 'warnings.create', label: 'إنشاء إنذار', module: 'warnings' },
  { key: 'warnings.delete', label: 'حذف إنذار', module: 'warnings' },
  { key: 'warnings.manage', label: 'إدارة الإنذارات', module: 'warnings' },
  // Incentives
  { key: 'incentives.view', label: 'عرض الحوافز', module: 'incentives' },
  { key: 'incentives.manage', label: 'إدارة الحوافز', module: 'incentives' },
  // Reports
  { key: 'reports.view', label: 'عرض التقارير', module: 'reports' },
  { key: 'reports.export', label: 'تصدير التقارير', module: 'reports' },
  { key: 'reports.print', label: 'طباعة التقارير', module: 'reports' },
  { key: 'reports.dashboard', label: 'لوحة التقارير', module: 'reports' },
  { key: 'reports.salary', label: 'كشف المرتبات', module: 'reports' },
  { key: 'reports.income_tax', label: 'ضريبة الدخل', module: 'reports' },
  { key: 'reports.salary_increase', label: 'الزيادة السنوية', module: 'reports' },
  { key: 'reports.leaves_warnings', label: 'الإجازات والإنذارات', module: 'reports' },
  { key: 'reports.employee', label: 'تقرير الموظف', module: 'reports' },
  { key: 'reports.evaluation', label: 'تقييم الموظفين', module: 'reports' },
  { key: 'reports.department', label: 'تقارير الأقسام', module: 'reports' },
  { key: 'reports.history', label: 'سجل التقارير', module: 'reports' },
  { key: 'reports.letters', label: 'الخطابات', module: 'reports' },
  // Letters
  { key: 'letters.view', label: 'عرض الخطابات', module: 'letters' },
  { key: 'letters.create', label: 'إنشاء خطاب', module: 'letters' },
  { key: 'letters.print', label: 'طباعة خطاب', module: 'letters' },
  { key: 'letters.delete', label: 'حذف خطاب', module: 'letters' },
  // Bank
  { key: 'bank.view', label: 'عرض التصدير البنكي', module: 'bank' },
  { key: 'bank.export', label: 'تصدير بنكي', module: 'bank' },
  // Assets
  { key: 'assets.view', label: 'عرض الأصول', module: 'assets' },
  { key: 'assets.manage', label: 'إدارة الأصول', module: 'assets' },
  { key: 'assets.return', label: 'تسليم أصول', module: 'assets' },
  // Settings
  { key: 'settings.view', label: 'عرض الإعدادات', module: 'settings' },
  { key: 'settings.edit', label: 'تعديل الإعدادات', module: 'settings' },
  { key: 'settings.organization', label: 'معلومات المؤسسة', module: 'settings' },
  { key: 'settings.attendance', label: 'إعدادات الحضور', module: 'settings' },
  { key: 'settings.leaves', label: 'إعدادات الإجازات', module: 'settings' },
  { key: 'settings.advances', label: 'إعدادات السلفيات', module: 'settings' },
  { key: 'settings.shifts', label: 'إعدادات الورديات', module: 'settings' },
  { key: 'settings.financials', label: 'الإعدادات المالية', module: 'settings' },
  { key: 'settings.settlements', label: 'إعدادات التسوية', module: 'settings' },
  { key: 'settings.whatsapp', label: 'إعدادات الواتساب', module: 'settings' },
  // Roles
  { key: 'roles.view', label: 'عرض الأدوار', module: 'roles' },
  { key: 'roles.edit', label: 'تعديل الأدوار', module: 'roles' },
  { key: 'roles.manage', label: 'إدارة الأدوار', module: 'roles' },
  // Users
  { key: 'users.view', label: 'عرض المستخدمين', module: 'users' },
  { key: 'users.create', label: 'إضافة مستخدم', module: 'users' },
  { key: 'users.edit', label: 'تعديل مستخدم', module: 'users' },
  { key: 'users.delete', label: 'حذف مستخدم', module: 'users' },
  // Notifications
  { key: 'notifications.view', label: 'عرض الإشعارات', module: 'notifications' },
  { key: 'notifications.send', label: 'إرسال إشعارات', module: 'notifications' },
  // Profile
  { key: 'profile.view', label: 'عرض الملف', module: 'profile' },
  { key: 'profile.edit', label: 'تعديل الملف', module: 'profile' },
  // Menu
  { key: 'menu.dashboard', label: 'قائمة لوحة التحكم', module: 'menu' },
  { key: 'menu.employees', label: 'قائمة الموظفين', module: 'menu' },
  { key: 'menu.departments', label: 'قائمة الأقسام', module: 'menu' },
  { key: 'menu.fingerprint', label: 'قائمة البصمة', module: 'menu' },
  { key: 'menu.attendance', label: 'قائمة الحضور', module: 'menu' },
  { key: 'menu.bank', label: 'قائمة التصدير البنكي', module: 'menu' },
  { key: 'menu.reports', label: 'قائمة التقارير', module: 'menu' },
  { key: 'menu.settings', label: 'قائمة الإعدادات', module: 'menu' },
];

function RolesTab({ roles }) {
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', display_name: '', description: '', color: '#6366f1' });

  const userPerms = getPermissions();
  const canEdit = userPerms.includes('*') || userPerms.includes('roles.edit') || userPerms.includes('roles.manage');
  const canCreate = canEdit;

  const createRole = async () => {
    if (!newRoleForm.name?.trim() || !newRoleForm.display_name?.trim()) {
      toast.error("الاسم والاسم المعروض مطلوبان");
      return;
    }
    setSaving(true);
    try {
      await api.post("/roles", {
        name: newRoleForm.name,
        name_ar: newRoleForm.display_name,
        description: newRoleForm.description,
        color: newRoleForm.color,
        permissions: selectedPerms.length > 0 ? selectedPerms : ['*'],
      });
      toast.success("تم إنشاء الدور بنجاح ✅");
      setShowAddRole(false);
      setNewRoleForm({ name: '', display_name: '', description: '', color: '#6366f1' });
      setSelectedPerms([]);
      // Refresh
      const res = await api.get("/roles");
      const updatedRoles = res.data?.data || res.data || [];
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Create role error:", err);
      toast.error(err.response?.data?.message || "فشل إنشاء الدور ❌");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (role: any) => {
    let perms = role.permissions || [];
    if (typeof perms === 'string') perms = [perms];
    setSelectedPerms(perms);
    setEditingRole(role.id);
  };

  const togglePerm = (perm: string) => {
    if (perm === '*') {
      setSelectedPerms(selectedPerms.includes('*') ? [] : ['*']);
    } else {
      if (selectedPerms.includes(perm)) {
        setSelectedPerms(selectedPerms.filter(p => p !== perm));
      } else {
        setSelectedPerms([...selectedPerms, perm]);
      }
    }
  };

  const saveRole = async (roleId: number) => {
    setSaving(true);
    try {
      const currentRole = roles.find(r => r.id === roleId);
      await api.put(`/roles/${roleId}`, { 
        permissions: selectedPerms,
        name_ar: currentRole?.display_name || '',
      });
      toast.success("تم حفظ الصلاحيات بنجاح ✅");
      setEditingRole(null);
      const res = await api.get("/roles");
      const updatedRoles = res.data?.data || res.data || [];
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Save role error:", err);
      toast.error(err.response?.data?.message || "فشل حفظ الصلاحيات ❌");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الدور؟")) return;
    setSaving(true);
    try {
      console.log('Deleting role:', roleId);
      const res = await api.delete(`/roles/${roleId}`);
      console.log('Delete response:', res.data);
      toast.success("تم حذف الدور بنجاح ✅");
      const rolesRes = await api.get("/roles");
      const updatedRoles = rolesRes.data?.data || rolesRes.data || [];
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Delete role error:", err);
      toast.error(err.response?.data?.message || err.response?.data?.error || "فشل حذف الدور ❌");
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = React.useMemo(() => {
    const groups: Record<string, typeof AVAILABLE_PERMISSIONS> = {};
    AVAILABLE_PERMISSIONS.forEach(perm => {
      if (!groups[perm.module]) groups[perm.module] = [];
      groups[perm.module].push(perm);
    });
    return groups;
  }, []);

  const moduleLabels: Record<string, string> = {
    employees: '👥 الموظفين',
    departments: '🏢 الأقسام',
    attendance: '⏰ الحضور',
    devices: '🔐 الأجهزة',
    leaves: '🏖️ الإجازات',
    advances: '💰 السلفيات',
    warnings: '⚠️ الإنذارات',
    incentives: '🎁 الحوافز',
    reports: '📊 التقارير',
    letters: '📝 الخطابات',
    bank: '🏦 التصدير البنكي',
    assets: '📦 الأصول',
    settings: '⚙️ الإعدادات',
    roles: '🔐 الأدوار',
    users: '👤 المستخدمين',
    notifications: '🔔 الإشعارات',
    profile: '👤 الملف',
    menu: '📋 القوائم',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">🔐 الأدوار والصلاحيات</h2>
        <div className="flex gap-2">
          {canCreate && (
            <button
              onClick={() => setShowAddRole(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              ➕ إضافة دور
            </button>
          )}
          {canEdit && (
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm">✓ تعديل</span>
          )}
        </div>
      </div>

      {showAddRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">إضافة دور جديد</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({...newRoleForm, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الاسم المعروض (عربي)</label>
                <input
                  type="text"
                  value={newRoleForm.display_name}
                  onChange={(e) => setNewRoleForm({...newRoleForm, display_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="مدير"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <input
                  type="text"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({...newRoleForm, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">اللون</label>
                <input
                  type="color"
                  value={newRoleForm.color}
                  onChange={(e) => setNewRoleForm({...newRoleForm, color: e.target.value})}
                  className="w-full h-10 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الصلاحيات</label>
                <div className="border rounded p-2 max-h-60 overflow-y-auto">
                  <label className="flex items-center gap-2 p-1 mb-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes('*')}
                      onChange={() => setSelectedPerms(selectedPerms.includes('*') ? [] : ['*'])}
                    />
                    <span className="font-bold text-red-600">كل الصلاحيات</span>
                  </label>
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="mb-3">
                      <div className="font-bold text-sm bg-gray-100 px-2 py-1 rounded mb-1">
                        {moduleLabels[module] || module}
                      </div>
                      {perms.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedPerms.includes(perm.key)}
                            onChange={() => {
                              if (selectedPerms.includes(perm.key)) {
                                setSelectedPerms(selectedPerms.filter(p => p !== perm.key));
                              } else {
                                setSelectedPerms([...selectedPerms, perm.key]);
                              }
                            }}
                            disabled={selectedPerms.includes('*')}
                          />
                          <span className="text-sm">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={createRole}
                disabled={saving}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '...' : '➕ إنشاء'}
              </button>
              <button
                onClick={() => { setShowAddRole(false); setSelectedPerms([]); }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white border-2 rounded-lg p-4"
            style={{ borderTopColor: role.color || "#6366f1", borderTopWidth: "5px" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: role.color || "#6366f1" }}
              >
                {role.display_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold">{role.display_name}</h4>
                <p className="text-sm text-gray-500">{role.description}</p>
              </div>
              {canEdit && editingRole !== role.id && (
                <button
                  onClick={() => startEdit(role)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  ✏️ تعديل
                </button>
              )}
            </div>

            {editingRole === role.id ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes('*')}
                      onChange={() => togglePerm('*')}
                      className="w-4 h-4"
                    />
                    <span className="font-bold text-red-600">كل الصلاحيات (*)</span>
                  </label>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded p-2">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="mb-3">
                      <div className="font-bold text-sm bg-gray-100 px-2 py-1 rounded mb-1">
                        {moduleLabels[module] || module}
                      </div>
                      {perms.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPerms.includes(perm.key)}
                            onChange={() => togglePerm(perm.key)}
                            disabled={selectedPerms.includes('*')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => saveRole(role.id)}
                    disabled={saving}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? '...' : '💾 حفظ'}
                  </button>
                  {role.name !== 'admin' && (
                    <button
                      onClick={() => deleteRole(role.id)}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      🗑️ حذف
                    </button>
                  )}
                  <button
                    onClick={() => setEditingRole(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-gray-600">الصلاحيات:</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                  {role.permissions?.[0] === "*" ? "كاملة" : `${role.permissions?.length || 0} صلاحية`}
                </span>
              </div>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">لا توجد أدوار محددة</div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
