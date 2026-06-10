import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getStorageUrl } from "../services/api";
import Sidebar from "../components/Sidebar";
import StarRating from "../components/StarRating";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDateArabic, formatDateDisplay } from "../utils/dateUtils";
import Topbar from "../components/Topbar";

const leaveTypeLabels = {
  official: "رسمية",
  sick: "مرضية",
  maternity: "أمومة",
  hajj: "حج",
  unpaid: "بدون مرتب",
};

const WARNING_REASONS = [
  { value: "neglect", label: "إهمال العهد" },
  { value: "carelessness", label: "التقصير في العمل" },
  { value: "leaving_work", label: "ترك موقع العمل" },
  { value: "late_attendance", label: "التأخر المتكرر في الحضور" },
  { value: "early_departure", label: "المغادرة قبل الأوان" },
  { value: "absent", label: "الغياب دون إذن" },
  { value: "misconduct", label: "سوء السلوك" },
  { value: "violation", label: "مخالفة تعليمات العمل" },
  { value: "other", label: "أخرى" },
];

export default function Employee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [, setOrganization] = useState({});
  const [, setLeaveSettings] = useState(null);
  const [, setAdvanceSettings] = useState(null);

  console.log('Employee page - id from params:', id);

  // Check if id is valid
  if (!id || id === ':id') {
    return <div className="p-6 text-lg font-semibold">⚠️ معرف الموظف غير صالح</div>;
  }

  // Check permissions
  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch {
      return [];
    }
  }, []);

  const canManageAssets = permissions.includes('*') || permissions.includes('assets.manage') || permissions.includes('assets.return');
  const canManageWarnings = permissions.includes('*') || permissions.includes('warnings.create') || permissions.includes('warnings.manage');
  const canTerminate = permissions.includes('*') || permissions.includes('employees.terminate');
  const canRequestLeave = permissions.includes('*') || permissions.includes('leaves.request');
  const canCreateContract = permissions.includes('*') || permissions.includes('letters.create');
  const canRequestAdvance = permissions.includes('*') || permissions.includes('advances.request');
  const canRestore = permissions.includes('*') || permissions.includes('employees.restore');
  const canDeleteEmployee = permissions.includes('*') || permissions.includes('employees.delete');
  const canEvaluateEmployee = permissions.includes('*') || permissions.includes('employees.evaluate');

  // Modals
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetTab, setAssetTab] = useState("return");
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [selectedWarningReason, setSelectedWarningReason] = useState("");
  const [customWarningReason, setCustomWarningReason] = useState("");
  const [returnAssetNote, setReturnAssetNote] = useState("");
  const [assetForm, setAssetForm] = useState({ name: "", description: "", type: "fixed", value: "", issue_date: "", notes: "", status: "active" });
  const [editAssetId, setEditAssetId] = useState(null);
  const [cvBlobUrl, setCvBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Evaluation data
  const [evaluationData, setEvaluationData] = useState({
    performance: 0,
    appearance: 0,
    behavior: 0,
    period: new Date().toISOString().slice(0, 7),
    notes: ""
  });
  const [vacationData, setVacationData] = useState({
    type: "official",
    from_date: "",
    to_date: "",
    paid: true,
    attachment: null,
  });
  const [vacationAttachmentPreview, setVacationAttachmentPreview] = useState(null);
  const [terminationData, setTerminationData] = useState({
    termination_type: "arbitrary",
    termination_reason: "",
  });
  const [contractData, setContractData] = useState({
    duration_months: 24,
  });
  const [advanceData, setAdvanceData] = useState({
    type: "short",
    amount: "",
    installments: 1,
    note: "",
    attachment: null,
  });
  const [advanceAttachmentPreview, setAdvanceAttachmentPreview] = useState(null);
  const token = localStorage.getItem("token");

  const [incentiveData, setIncentiveData] = useState({
    type: "bonus",
    value: "",
    note: "",
  });
  const [deductionData, setDeductionData] = useState({
    type: "other",
    amount: "",
    reason: "",
    date: "",
  });

  useEffect(() => {
    console.log('Employee page - fetching employee:', id);
    api
      .get(`/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        console.log('Employee data:', res.data);
        setEmployee(res.data.data);
      })
      .catch((err) => console.error('Error fetching employee:', err));
    
    api
      .get(`/organization`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setOrganization(res.data.data || {}))
      .catch((err) => console.error(err));
    
    api
      .get(`/settings/leaves`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setLeaveSettings(res.data.data || {}))
      .catch(() => {});
    
    api
      .get(`/settings/advances`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAdvanceSettings(res.data.data || {}))
      .catch(() => {});
  }, [id, token]);

  const getCardColor = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-blue-100";
    if (normalized.includes("terminated")) return "bg-purple-100";
    if (normalized.includes("warning")) return "bg-yellow-100";
    if (normalized.includes("vacation")) return "bg-green-100";
    return "bg-gray-100";
  };

  // Fetch CV file when modal opens
  useEffect(() => {
    if (showCvModal && employee?.cv) {
      api.get(`/files/cv/${employee.id}`, {
        responseType: 'blob',
      })
        .then((res) => {
          const url = URL.createObjectURL(res.data);
          setCvBlobUrl(url);
        })
        .catch((err) => {
          console.error("Error loading CV:", err);
          toast.error("فشل تحميل السيرة الذاتية");
          setShowCvModal(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCvModal, employee?.id]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (cvBlobUrl) URL.revokeObjectURL(cvBlobUrl);
    };
  }, [cvBlobUrl]);

  const refreshEmployee = () => {
    api
      .get(`/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployee(res.data.data))
      .catch((err) => console.error(err));
  };

  const giveWarning = () => {
    if (!selectedWarningReason && !customWarningReason) {
      toast.error("يرجى اختيار سبب الإنذار");
      return;
    }
    
    const reason = selectedWarningReason === "other" 
      ? customWarningReason 
      : WARNING_REASONS.find(r => r.value === selectedWarningReason)?.label || selectedWarningReason;
    
    setLoading(true);
    api
      .post(
        "/discipline/warnings",
        { employee_id: employee.id, reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("⚠️ تم إعطاء إنذار للموظف");
        refreshEmployee();
        setShowWarningModal(false);
        setSelectedWarningReason("");
        setCustomWarningReason("");
      })
      .catch(() => toast.error("❌ فشل إعطاء الإنذار"))
      .finally(() => setLoading(false));
  };

  const returnAsset = (assetId) => {
    api
      .post(`/employee-assets/${assetId}/return`, {
        note: returnAssetNote || "تم الإرجاع للمؤسسة",
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم تسجيل إرجاع العهدة بنجاح");
        setReturnAssetNote("");
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل في تسجيل الإرجاع"));
  };

  const addAsset = () => {
    api
      .post("/employee-assets", { ...assetForm, employee_id: employee.id, value: parseFloat(assetForm.value) || 0 }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم إضافة العهدة بنجاح");
        setAssetForm({ name: "", description: "", type: "fixed", value: "", issue_date: "", notes: "" });
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل في إضافة العهدة"));
  };

  const updateAsset = () => {
    if (!editAssetId) return;
    api
      .put(`/employee-assets/${editAssetId}`, {
        ...assetForm,
        value: parseFloat(assetForm.value) || 0,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم تحديث العهدة بنجاح");
        setEditAssetId(null);
        setAssetForm({ name: "", description: "", type: "fixed", value: "", issue_date: "", notes: "", status: "active" });
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل في تحديث العهدة"));
  };

  const submitEvaluation = () => {
    api
      .post(`/employees/${employee.id}/evaluate`, evaluationData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم حفظ التقييم بنجاح");
        setShowEvaluationModal(false);
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل في حفظ التقييم"));
  };

  const cancelWarning = (warningId) => {
    api
      .delete(`/discipline/warnings/${warningId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم إلغاء الإنذار");
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل إلغاء الإنذار"));
  };

  const submitVacation = () => {
    if (!vacationData.from_date || !vacationData.to_date) {
      toast.error("يرجى إدخال تاريخ البداية والنهاية");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("employee_id", employee.id);
    formData.append("type", vacationData.type);
    formData.append("from_date", vacationData.from_date);
    formData.append("to_date", vacationData.to_date);
    formData.append("paid", vacationData.paid ? "1" : "0");
    if (vacationData.attachment) {
      formData.append("attachment", vacationData.attachment);
    }

    api
      .post("/leaves/requests", formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم تقديم طلب الإجازة بنجاح - في انتظار الموافقة");
        refreshEmployee();
        setShowVacationModal(false);
        setVacationData({ type: "official", from_date: "", to_date: "", paid: true, attachment: null });
        setVacationAttachmentPreview(null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "❌ فشل تقديم طلب الإجازة");
      })
      .finally(() => setLoading(false));
  };

  const submitTermination = () => {
    if (!terminationData.termination_reason) {
      toast.error("يرجى إدخال سبب الفصل");
      return;
    }

    api
      .post(
        `/employees/${employee.id}/terminate`,
        terminationData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("❌ تم فصل الموظف بنجاح");
        refreshEmployee();
        setShowTerminationModal(false);
        setTerminationData({ termination_type: "arbitrary", termination_reason: "" });
      })
      .catch(() => toast.error("❌ فشل فصل الموظف"));
  };

  const submitAdvance = () => {
    if (!advanceData.amount || advanceData.amount <= 0) {
      toast.error("يرجى إدخال مبلغ السلفة");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("employee_id", employee.id);
    formData.append("type", advanceData.type);
    formData.append("amount", advanceData.amount);
    formData.append("installments", advanceData.installments);
    formData.append("note", advanceData.note || "");
    if (advanceData.attachment) {
      formData.append("attachment", advanceData.attachment);
    }

    api
      .post("/advances/requests", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      })
      .then(() => {
        toast.success("✅ تم تقديم طلب السلفة بنجاح - في انتظار الموافقة");
        refreshEmployee();
        setShowAdvanceModal(false);
        setAdvanceData({ type: "short", amount: "", installments: 1, note: "", attachment: null });
        setAdvanceAttachmentPreview(null);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "❌ فشل تقديم طلب السلفة");
      })
      .finally(() => setLoading(false));
  };

  const restoreEmployee = () => {
    api
      .post(
        `/employees/${employee.id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("✅ تم إعادة تفعيل الموظف");
        refreshEmployee();
      })
      .catch(() => toast.error("❌ فشل إعادة التفعيل"));
  };

  const handleAddIncentive = () => {
    if (!incentiveData.value || parseFloat(incentiveData.value) <= 0) {
      toast.error("يرجى إدخال قيمة الحافز");
      return;
    }
    setLoading(true);
    api
      .post(
        "/incentives",
        {
          type: incentiveData.type,
          value: incentiveData.value,
          employee_id: employee.id,
          note: incentiveData.note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("✅ تم إضافة الحافز بنجاح");
        refreshEmployee();
        setShowIncentiveModal(false);
        setIncentiveData({ type: "bonus", value: "", note: "" });
      })
      .catch((err) => toast.error(err?.response?.data?.message || "❌ فشل إضافة الحافز"))
      .finally(() => setLoading(false));
  };

  const handleAddDeduction = () => {
    if (!deductionData.amount || parseFloat(deductionData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ الخصم");
      return;
    }
    setLoading(true);
    api
      .post(
        "/deductions",
        {
          type: deductionData.type,
          amount: deductionData.amount,
          employee_id: employee.id,
          reason: deductionData.reason,
          date: deductionData.date || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("✅ تم إضافة الخصم بنجاح");
        refreshEmployee();
        setShowDeductionModal(false);
        setDeductionData({ type: "other", amount: "", reason: "", date: "" });
      })
      .catch((err) => toast.error(err?.response?.data?.message || "❌ فشل إضافة الخصم"))
      .finally(() => setLoading(false));
  };

  const handleDeleteEmployee = () => {
    api
      .delete(`/employees/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        toast.success("✅ تم حذف الموظف بنجاح");
        navigate("/employees");
      })
      .catch(() => toast.error("❌ فشل حذف الموظف"));
  };

  const generateContract = async () => {
    try {
      const response = await api.get(`/employees/${employee.id}/contract`, {
        params: { duration_months: contractData.duration_months },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contract_${employee.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("✅ تم إنشاء العقد بنجاح");
      setShowContractModal(false);
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error("❌ فشل إنشاء العقد");
    }
  };

  if (!employee) {
    console.log('Employee page - loading state, employee is null');
    return <div className="p-6 text-lg font-semibold">⏳ جاري تحميل بيانات الموظف...</div>;
  }

  console.log('Employee page - rendering:', { name: employee.name, status: employee.status, active_leave: employee.active_leave, leave_count: employee.leave_count });

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
    <Topbar title="تفاصيل الموظف" />

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">الموظف: {employee.name}</span>
          <div className="flex flex-col text-right">
                <span className="text-lg font-semibold">
                  الحالة:{" "}
                  {employee.active_leave && employee.active_leave.status === "approved" ? (
                    <span className="text-blue-600">في إجازة {leaveTypeLabels[employee.active_leave.type] || employee.active_leave.type}</span>
                  ) : employee.status === "terminated" ? (
                    <span className="text-red-600">مفصول</span>
                  ) : employee.status === "warning" ? (
                    <span className="text-yellow-500">إنذار</span>
                  ) : (
                    <span className="text-green-600">نشط</span>
                  )}
                </span>

                {employee.active_leave && employee.active_leave.status === "approved" ? (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-blue-600 font-semibold text-sm">
                      من {formatDateDisplay(employee.active_leave.from_date)} إلى {formatDateDisplay(employee.active_leave.to_date)}
                    </span>
                    <span className="text-blue-500 font-semibold text-sm">
                      متبقي: {employee.active_leave.remaining_days || 0} يوم
                    </span>
                  </div>
                ) : (
                  <>
                    {employee.warnings_count > 0 && (
                      <span className="text-orange-600 font-semibold text-sm">
                        عدد الإنذارات: {employee.warnings_count}
                      </span>
                    )}
                    {employee.leave_count > 0 && (
                      <span className="text-blue-600 font-semibold text-sm">
                        مجموع أيام الإجازات: {employee.leave_count} يوم
                      </span>
                    )}
                  </>
                )}
            
            {employee.termination_type && employee.status === "terminated" && (
              <span className="text-red-500 text-sm">
                نوع الفصل: {employee.termination_type} - {employee.termination_reason}
              </span>
            )}
          </div>
        </div>

        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* بطاقة معلومات الموظف الأساسية */}
            <div className={`${getCardColor(employee.status)} shadow-lg rounded-xl p-6`}>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={getStorageUrl(employee.profile_photo) || "/default-avatar.svg"}
                  alt={employee.name}
                  className="w-24 h-24 rounded-full border-4 border-indigo-300 cursor-pointer object-cover"
                  onClick={() => {
                    const url = getStorageUrl(employee.profile_photo);
                    if (url) window.open(url, "_blank");
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
                  <p className="text-lg text-gray-700">{employee.position}</p>
                  <p className="text-gray-600">القسم: {employee.department?.name || "غير محدد"}</p>
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                {employee.file_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم الملف:</span>
                    <span className="font-semibold">{employee.file_number}</span>
                  </div>
                )}
                {employee.device_user_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">رقم البصمة:</span>
                    <span className="font-semibold">{employee.device_user_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">النوع:</span>
                  <span className="font-semibold">
                    {employee.gender === 'male' ? 'ذكر' : employee.gender === 'female' ? 'أنثى' : 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ الميلاد:</span>
                  <span className="font-semibold">{employee.birth_date ? formatDateDisplay(employee.birth_date) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم الهوية:</span>
                  <span className="font-semibold">{employee.id_number || employee.national_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحالة الاجتماعية:</span>
                  <span className="font-semibold">
                    {employee.marital_status === 'single' ? 'أعزب/عزباء' :
                     employee.marital_status === 'married' ? 'متزوج/متزوجة' :
                     employee.marital_status === 'divorced' ? 'مطلق/مطلقة' :
                     employee.marital_status === 'widowed' ? 'أرمل/أرملة' : (employee.marital_status || '-')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاريخ التعيين:</span>
                  <span className="font-semibold">{formatDateDisplay(employee.hire_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-semibold">{employee.phone || "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد:</span>
                  <span className="font-semibold text-sm">{employee.email || "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العنوان:</span>
                  <span className="font-semibold">{employee.address || "غير محدد"}</span>
                </div>
                {employee.position_grade && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">الدرجة:</span>
                    <span className="font-semibold">{employee.position_grade}</span>
                  </div>
                )}
              </div>

              {employee.active_leave && (
                <div className="bg-blue-50 p-3 rounded-lg mt-4">
                  <p className="font-semibold text-blue-700">🌴 إجازة {leaveTypeLabels[employee.active_leave.type] || employee.active_leave.type}</p>
                  <p className="text-sm">من {formatDateDisplay(employee.active_leave.from_date)} إلى {formatDateDisplay(employee.active_leave.to_date)}</p>
                  <p className="text-blue-500 font-semibold text-sm mt-1">متبقي: {employee.active_leave.remaining_days || 0} يوم</p>
                </div>
              )}

              {(employee.cv || employee.cv_url) && (
                <button 
                  onClick={() => setShowCvModal(true)} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mt-4 w-full justify-center"
                >
                  عرض السيرة الذاتية
                </button>
              )}
            </div>

            {/* بطاقة تفاصيل الراتب */}
            <div className="bg-green-50 shadow-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-800 mb-4">💰 تفاصيل الراتب</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-700">الراتب الأساسي:</span>
                  <span className="font-semibold">{parseFloat(employee.base_salary || 0).toLocaleString()} ج.س</span>
                </div>
                {employee.position_allowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">بدل الدرجة:</span>
                    <span className="text-green-600">{parseFloat(employee.position_allowance).toLocaleString()} ج.س</span>
                  </div>
                )}
                
                {employee.allowances && employee.allowances.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <span className="font-semibold text-gray-700 block mb-1">البدلات:</span>
                    {employee.allowances.map((a, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600 mr-4">
                          {a.type?.includes('transport') ? 'بدل نقل' : 
                           a.type?.includes('food') ? 'بدل طعام' : 
                           a.type?.includes('housing') ? 'بدل سكن' : 
                           a.type?.includes('phone') ? 'بدل هاتف' : 'بدل أخرى'}:
                        </span>
                        <span className="text-green-600">{parseFloat(a.value || 0).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                    {employee.allowances_total > 0 && (
                      <div className="flex justify-between font-semibold mt-1">
                        <span>إجمالي البدلات:</span>
                        <span className="text-green-600">{parseFloat(employee.allowances_total).toLocaleString()} ج.س</span>
                      </div>
                    )}
                  </div>
                )}
                
                {employee.incentives && employee.incentives.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <span className="font-semibold text-gray-700 block mb-1">حوافز لمرة واحدة:</span>
                    {employee.incentives.map((i, idx) => {
                      const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
                      const d = i.date ? new Date(i.date + 'T00:00:00') : null;
                      const monthLabel = d ? `${monthNames[d.getMonth()]} ${d.getFullYear()}` : '';
                      const typeLabel = i.type === 'bonus' ? 'مكافأة' : 
                                       i.type === 'allowance' ? 'بدل' : 
                                       i.type === 'commission' ? 'عمولة' : 
                                       i.type === 'performance' ? 'حافز أداء' : 'أخرى';
                      return (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600 mr-4">
                            {typeLabel}{monthLabel ? ` (${monthLabel})` : ''}:
                          </span>
                          <span className="text-blue-600">{parseFloat(i.value || 0).toLocaleString()} ج.س</span>
                        </div>
                      );
                    })}
                    {employee.incentives_total > 0 && (
                      <div className="flex justify-between font-semibold mt-1">
                        <span>إجمالي الحوافز:</span>
                        <span className="text-blue-600">{parseFloat(employee.incentives_total).toLocaleString()} ج.س</span>
                      </div>
                    )}
                  </div>
                )}
                
                {employee.insurance_amount > 0 && employee.insurance_type !== 'none' && (
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">خصم التأمين:</span>
                      <span className="text-red-600">-{parseFloat(employee.insurance_amount).toLocaleString()} ج.س</span>
                    </div>
                  </div>
                )}
                
                <div className="border-t-2 border-green-600 pt-3 mt-3">
                  <div className="flex justify-between text-xl font-bold">
                    <span>صافي الراتب:</span>
                    <span className="text-green-700">{parseFloat(employee.total_salary || 0).toLocaleString()} ج.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* بطاقة المعلومات البنكية */}
            {(employee.bank_name || employee.bank_account) && (
              <div className="bg-blue-50 shadow-lg rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4">🏦 المعلومات البنكية</h3>
                <div className="space-y-2">
                  {employee.bank_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">اسم البنك:</span>
                      <span className="font-semibold">
                        {employee.bank_name === 'فهد' ? 'بنك الفهد الإسلامي' : 
                         employee.bank_name === 'التعاون' ? 'بنك التعاون' : 
                         employee.bank_name === 'الزراعي' ? 'البنك الزراعي' : 
                         employee.bank_name === 'الشعب' ? 'بنك الشعب' : 
                         employee.bank_name === 'الثقة' ? 'بنك الثقة' : 
                         employee.bank_name}
                      </span>
                    </div>
                  )}
                  {employee.bank_account && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">رقم الحساب:</span>
                      <span className="font-semibold font-mono">{employee.bank_account}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* بطاقة البصمة والوجه */}
            <div className="bg-indigo-50 shadow-lg rounded-xl p-6">
              <h3 className="text-xl font-bold text-indigo-800 mb-4">🔐 البصمة والوجه</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">جهاز البصمة:</span>
                  <span className="font-semibold">
                    {employee.attendance_device?.name || employee.attendance_device?.ip || "غير محدد"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم المستخدم على الجهاز:</span>
                  <span className="font-semibold font-mono">{employee.device_user_id || "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">حالة التسجيل:</span>
                  <span className="font-semibold text-green-600">
                    {employee.device_user_id ? "✅ مسجل" : "⏳ غير مسجل"}
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة التأمين */}
            {employee.insurance_type && employee.insurance_type !== 'none' && (
              <div className="bg-yellow-50 shadow-lg rounded-xl p-6">
                <h3 className="text-xl font-bold text-yellow-800 mb-4">🛡️ التأمين</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">نوع التأمين:</span>
                    <span className="font-semibold">
                      {employee.insurance_type === 'health' ? 'تأمين صحي' : 
                       employee.insurance_type === 'social' ? 'تأمين اجتماعي' : 
                       'تأمين صحي واجتماعي'}
                    </span>
                  </div>
                  {employee.insurance_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">القيمة الشهرية:</span>
                      <span className="font-semibold text-yellow-700">{parseFloat(employee.insurance_amount).toLocaleString()} ج.س</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* بطاقة العهد - إظهار فقط العهد النشطة */}
            {employee.assets && employee.assets.filter(a => a.status !== 'returned').length > 0 && (
              <div className="bg-purple-50 shadow-lg rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-800 mb-4">📦 العهد</h3>
                <div className="space-y-2">
                  {employee.assets.filter(a => a.status !== 'returned').map((asset) => (
                    <div key={asset.id} className={`p-3 rounded-lg flex justify-between items-center ${
                      asset.returned_date ? 'bg-gray-100 opacity-70' : 'bg-white'
                    }`}>
                      <div>
                        <span className="font-semibold">{asset.name}</span>
                        <span className="text-sm text-gray-500 mr-2">
                          ({asset.type === "fixed" ? "ثابتة" : "منقولة"})
                        </span>
                        {asset.description && <p className="text-sm text-gray-400">{asset.description}</p>}
                        {asset.returned_date && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ تم الإرجاع: {formatDateDisplay(asset.returned_date)}
                          </p>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-purple-600 font-bold">{parseFloat(asset.value || 0).toLocaleString()} ج.س</span>
                        {!asset.returned_date && (
                          <span className="block text-xs text-gray-500">بانتظار الإرجاع</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* بطاقة الملاحظات */}
            {employee.notes && (
              <div className="bg-gray-50 shadow-lg rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📝 ملاحظات</h3>
                <p className="text-gray-700">{employee.notes}</p>
              </div>
            )}

          </div>

          {/* أزرار الإجراءات */}
          <div className={`${getCardColor(employee.status)} shadow-lg rounded-xl p-6 mt-6`}>
            <div className="flex gap-4 mt-4 flex-wrap justify-center">
              {canEvaluateEmployee && (
                <button
                  onClick={() => setShowEvaluationModal(true)}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 text-lg"
                >
                  ⭐ تقيم
                </button>
              )}

              {canManageAssets && (
                <button
                  onClick={() => { setShowAssetModal(true); setAssetTab("return"); }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-lg"
                >
                  📦 إدارة العهد
                </button>
              )}

              {canManageWarnings && (
                <button
                  onClick={() => setShowWarningModal(true)}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 text-lg"
                >
                  ⚠ إنذار
                </button>
              )}

              {canTerminate && (
                <button
                  onClick={() => setShowTerminationModal(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-lg"
                >
                  ⛔ فصل
                </button>
              )}

              {canRequestLeave && (
                <button
                  onClick={() => setShowVacationModal(true)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-lg"
                  disabled={employee.status === "vacation"}
                >
                  🌴 طلب الإجازة
                </button>
              )}

              {canCreateContract && (
                <button
                  onClick={() => setShowContractModal(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-lg"
                >
                  📄 تجديد عقد
                </button>
              )}

              {canRequestAdvance && (
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 text-lg"
                  disabled={employee.status === "vacation"}
                >
                  💰 طلب السلفية
                </button>
              )}

              <button
                onClick={() => setShowIncentiveModal(true)}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 text-lg"
              >
                🎁 حافز
              </button>

              <button
                onClick={() => setShowDeductionModal(true)}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 text-lg"
              >
                ❌ خصم
              </button>

              {canRestore && employee.status === "terminated" && (
                <button
                  onClick={restoreEmployee}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-lg"
                >
                  ✅ إعادة تفعيل
                </button>
              )}

              {canDeleteEmployee && employee.status !== "terminated" && (
                <button
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من حذف الموظف "${employee.name}"؟`)) {
                      handleDeleteEmployee();
                    }
                  }}
                  className="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800 text-lg"
                >
                  🗑️ حذف
                </button>
              )}
            </div>

            {/* Warnings List */}
            {employee.warnings && employee.warnings.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">الإنذارات:</h3>
                {employee.warnings.map((warning) => (
                  <div key={warning.id} className="bg-red-50 p-3 rounded-lg mb-2 flex justify-between items-center">
                    <span>{warning.reason || "إنذار"} - {formatDateArabic(warning.created_at)}</span>
                    <button onClick={() => cancelWarning(warning.id)} className="text-red-500 text-sm underline">
                      إلغاء
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* مودل الإنذار */}
          {showWarningModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]" dir="rtl">
                <h2 className="text-xl font-bold mb-4">⚠️ إصدار إنذار</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-right">سبب الإنذار:</label>
                  <select
                    value={selectedWarningReason}
                    onChange={(e) => setSelectedWarningReason(e.target.value)}
                    className="w-full border rounded p-2 mb-3 text-right"
                  >
                    <option value="">اختر سبب الإنذار</option>
                    {WARNING_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  
                  {selectedWarningReason === "other" && (
                    <textarea
                      value={customWarningReason}
                      onChange={(e) => setCustomWarningReason(e.target.value)}
                      placeholder="أدخل سبب الإنذار..."
                      className="w-full border rounded p-2 h-24 text-right"
                    />
                  )}
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>تنبيه:</strong> سيتم تسجيل الإنذار في ملف الموظف ({employee.name})
                  </p>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowWarningModal(false);
                      setSelectedWarningReason("");
                      setCustomWarningReason("");
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={giveWarning}
                    disabled={loading}
                    className={`bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 flex items-center gap-2 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        جاري الإرسال...
                      </>
                    ) : (
                      "إصدار الإنذار"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل الإجازة */}
          {showVacationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]" dir="rtl">
                <h2 className="text-xl font-bold mb-4">🌴 طلب إجازة</h2>

                <label className="block mb-2">نوع الإجازة:</label>
                <select
                  value={vacationData.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setVacationData({ ...vacationData, type: newType, paid: newType === "unpaid" ? false : vacationData.paid });
                  }}
                  className="w-full border rounded p-2 mb-4"
                >
                  <option value="official">رسمية</option>
                  <option value="sick">مرضية</option>
                  <option value="maternity">أمومة</option>
                  <option value="hajj">حج</option>
                  <option value="unpaid">بدون مرتب</option>
                </select>

                <label className="block mb-2">من تاريخ:</label>
                <input
                  type="date"
                  value={vacationData.from_date}
                  onChange={(e) => setVacationData({ ...vacationData, from_date: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                />

                <label className="block mb-2">إلى تاريخ:</label>
                <input
                  type="date"
                  value={vacationData.to_date}
                  onChange={(e) => setVacationData({ ...vacationData, to_date: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                />

                {vacationData.type !== "unpaid" && (
                  <>
                    <label className="block mb-2">هل الإجازة بمرتب؟</label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paid"
                          checked={vacationData.paid === true}
                          onChange={() => setVacationData({ ...vacationData, paid: true })}
                        />
                        بمرتب
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paid"
                          checked={vacationData.paid === false}
                          onChange={() => setVacationData({ ...vacationData, paid: false })}
                        />
                        بدون مرتب
                      </label>
                    </div>
                  </>
                )}

                <label className="block mb-2">مرفق (صورة / PDF):</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setVacationData({ ...vacationData, attachment: file });
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setVacationAttachmentPreview(ev.target.result);
                      reader.readAsDataURL(file);
                    } else {
                      setVacationAttachmentPreview(null);
                    }
                  }}
                  className="w-full border rounded p-2 mb-2"
                />
                {vacationAttachmentPreview && (
                  <div className="mb-4">
                    {vacationData.attachment?.type?.startsWith("image/") ? (
                      <img src={vacationAttachmentPreview} alt="مرفق" className="max-h-32 rounded border" />
                    ) : (
                      <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">📄 {vacationData.attachment?.name}</div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowVacationModal(false);
                      setVacationData({ type: "official", from_date: "", to_date: "", paid: true, attachment: null });
                      setVacationAttachmentPreview(null);
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={submitVacation}
                    disabled={loading}
                    className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        جاري الإرسال...
                      </>
                    ) : (
                      "تقديم الطلب"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل إدارة العهد */}
          {showAssetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[650px]" dir="rtl">
                <h2 className="text-xl font-bold mb-4 text-blue-800">📦 إدارة العهد</h2>

                {/* Tabs */}
                <div className="flex border-b mb-4">
                  <button
                    onClick={() => setAssetTab("add")}
                    className={`px-4 py-2 font-medium ${assetTab === "add" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                  >
                    ➕ إضافة عهدة
                  </button>
                  <button
                    onClick={() => setAssetTab("return")}
                    className={`px-4 py-2 font-medium ${assetTab === "return" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                  >
                    ↩️ إرجاع عهدة
                  </button>
                  <button
                    onClick={() => setAssetTab("edit")}
                    className={`px-4 py-2 font-medium ${assetTab === "edit" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
                  >
                    ✏️ تعديل عهدة
                  </button>
                </div>

                {/* Tab: إضافة عهدة */}
                {assetTab === "add" && (
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">اسم العهدة</label>
                        <input
                          type="text"
                          value={assetForm.name}
                          onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                          className="w-full border rounded p-2"
                          placeholder="مثال: لاب توب"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">النوع</label>
                        <select
                          value={assetForm.type}
                          onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                          className="w-full border rounded p-2"
                        >
                          <option value="fixed">ثابتة</option>
                          <option value="movable">منقولة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">القيمة (ج.س)</label>
                        <input
                          type="number"
                          value={assetForm.value}
                          onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                          className="w-full border rounded p-2"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">تاريخ الإصدار</label>
                        <input
                          type="date"
                          value={assetForm.issue_date}
                          onChange={(e) => setAssetForm({ ...assetForm, issue_date: e.target.value })}
                          className="w-full border rounded p-2"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-1">الوصف</label>
                      <textarea
                        value={assetForm.description}
                        onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                        className="w-full border rounded p-2"
                        rows="2"
                        placeholder="وصف العهدة..."
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-1">ملاحظات</label>
                      <textarea
                        value={assetForm.notes}
                        onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                        className="w-full border rounded p-2"
                        rows="2"
                        placeholder="ملاحظات..."
                      />
                    </div>
                    <button
                      onClick={addAsset}
                      disabled={!assetForm.name}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      💾 حفظ العهدة
                    </button>
                  </div>
                )}

                {/* Tab: إرجاع عهدة */}
                {assetTab === "return" && (
                  <div>
                    {employee.assets && employee.assets.filter(a => !a.returned_date).length > 0 ? (
                      <>
                        <p className="text-gray-600 mb-4">اختر العهدة المراد إرجاعها:</p>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {employee.assets.map((asset) => (
                            <div
                              key={asset.id}
                              className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                                asset.returned_date
                                  ? 'border-gray-200 bg-gray-50 opacity-60'
                                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                              }`}
                              onClick={() => {
                                if (!asset.returned_date) {
                                  returnAsset(asset.id);
                                }
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-lg">{asset.name}</span>
                                  <span className="text-sm text-gray-500 mr-2">
                                    ({asset.type === "fixed" ? "ثابتة" : "منقولة"})
                                  </span>
                                  {asset.description && <p className="text-sm text-gray-400">{asset.description}</p>}
                                </div>
                                <div className="text-left">
                                  <span className="font-bold text-blue-600 text-lg">
                                    {parseFloat(asset.value || 0).toLocaleString()} ج.س
                                  </span>
                                  {asset.returned_date ? (
                                    <p className="text-xs text-green-600">✓ تم الإرجاع: {formatDateDisplay(asset.returned_date)}</p>
                                  ) : (
                                    <p className="text-xs text-gray-500">اضغط للإرجاع</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <label className="block text-sm font-medium mb-2">ملاحظة (اختياري):</label>
                          <textarea
                            value={returnAssetNote}
                            onChange={(e) => setReturnAssetNote(e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                            rows="2"
                            placeholder="أضف ملاحظة عن حالة العهدة عند الإرجاع..."
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-4xl mb-2">📦</p>
                        <p>لا توجد عهد نشطة للإرجاع</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: تعديل عهدة */}
                {assetTab === "edit" && (
                  <div>
                    {!editAssetId ? (
                      <div>
                        <p className="text-gray-600 mb-4">اختر العهدة لتعديلها:</p>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {employee.assets && employee.assets.length > 0 ? employee.assets.map((asset) => (
                            <div
                              key={asset.id}
                              onClick={() => {
                                setEditAssetId(asset.id);
                                setAssetForm({
                                  name: asset.name || "",
                                  description: asset.description || "",
                                  type: asset.type || "fixed",
                                  value: asset.value?.toString() || "",
                                  issue_date: asset.issue_date ? asset.issue_date.split('T')[0] : "",
                                  notes: asset.notes || "",
                                });
                              }}
                              className="p-4 rounded-lg border-2 border-gray-200 hover:border-yellow-400 cursor-pointer bg-white"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-lg">{asset.name}</span>
                                  <span className="text-sm text-gray-500 mr-2">
                                    ({asset.type === "fixed" ? "ثابتة" : "منقولة"})
                                  </span>
                                  {asset.description && <p className="text-sm text-gray-400">{asset.description}</p>}
                                </div>
                                <span className={`text-sm ${asset.returned_date ? 'text-green-600' : 'text-blue-600'}`}>
                                  {asset.returned_date ? "تم الإرجاع" : "نشطة"}
                                </span>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>لا توجد عهد مسجلة</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600 mb-4">تعديل العهدة: <span className="font-bold">{assetForm.name}</span></p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">اسم العهدة</label>
                            <input
                              type="text"
                              value={assetForm.name}
                              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                              className="w-full border rounded p-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">النوع</label>
                            <select
                              value={assetForm.type}
                              onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                              className="w-full border rounded p-2"
                            >
                              <option value="fixed">ثابتة</option>
                              <option value="movable">منقولة</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">القيمة (ج.س)</label>
                            <input
                              type="number"
                              value={assetForm.value}
                              onChange={(e) => setAssetForm({ ...assetForm, value: e.target.value })}
                              className="w-full border rounded p-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">الحالة</label>
                            <select
                              value={assetForm.status || "active"}
                              onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                              className="w-full border rounded p-2"
                            >
                              <option value="active">نشطة</option>
                              <option value="returned">مرتجعة</option>
                              <option value="damaged">تالفة</option>
                              <option value="lost">مفقودة</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-1">الوصف</label>
                          <textarea
                            value={assetForm.description}
                            onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                            className="w-full border rounded p-2"
                            rows="2"
                          />
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-1">ملاحظات</label>
                          <textarea
                            value={assetForm.notes}
                            onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                            className="w-full border rounded p-2"
                            rows="2"
                          />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={updateAsset}
                            disabled={!assetForm.name}
                            className="bg-yellow-500 text-white px-6 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
                          >
                            💾 حفظ التعديلات
                          </button>
                          <button
                            onClick={() => { setEditAssetId(null); setAssetForm({ name: "", description: "", type: "fixed", value: "", issue_date: "", notes: "", status: "active" }); }}
                            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowAssetModal(false);
                      setReturnAssetNote("");
                      setEditAssetId(null);
                      setAssetForm({ name: "", description: "", type: "fixed", value: "", issue_date: "", notes: "", status: "active" });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل الفصل */}
          {showTerminationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]">
                <h2 className="text-xl font-bold mb-4">⛔ فصل الموظف</h2>

                <label className="block mb-2">نوع الفصل:</label>
                <select
                  value={terminationData.termination_type}
                  onChange={(e) => setTerminationData({ ...terminationData, termination_type: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                >
                  <option value="arbitrary">فصل تعسفي</option>
                  <option value="unjustified">فصل غير مبرر</option>
                  <option value="mutual">استقالة بالتراضي</option>
                  <option value="performance">فشل في الأداء</option>
                  <option value="conduct">سوء السلوك</option>
                  <option value="other">أخرى</option>
                </select>

                <label className="block mb-2">سبب الفصل:</label>
                <textarea
                  value={terminationData.termination_reason}
                  onChange={(e) => setTerminationData({ ...terminationData, termination_reason: e.target.value })}
                  placeholder="مثال: فصل بسبب سوء السير والسلوك"
                  className="w-full border rounded p-2 mb-4 h-24"
                />

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowTerminationModal(false);
                      setTerminationData({ termination_type: "arbitrary", termination_reason: "" });
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={submitTermination}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    تأكيد الفصل
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل إنشاء العقد */}
          {showContractModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]">
                <h2 className="text-xl font-bold mb-4">📄 {employee.contract ? 'تجديد عقد عمل' : 'إنشاء عقد عمل'}</h2>

                <label className="block mb-2">مدة العقد (بالأشهر):</label>
                <input
                  type="number"
                  min="1"
                  value={contractData.duration_months}
                  onChange={(e) => setContractData({ ...contractData, duration_months: parseInt(e.target.value) || 12 })}
                  className="w-full border rounded p-2 mb-4"
                />

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">معلومات العقد:</p>
                  <p>اسم الموظف: {employee.name}</p>
                  <p>الوظيفة: {employee.position}</p>
                  <p>القسم: {employee.department?.name || "غير محدد"}</p>
                  <p>الراتب الأساسي: {employee.base_salary}</p>
                  <p>تاريخ التعيين: {formatDateDisplay(employee.hire_date)}</p>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setShowContractModal(false)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={generateContract}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    {employee.contract ? 'تجديد العقد' : 'إنشاء العقد'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل طلب سلفية */}
          {showAdvanceModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]" dir="rtl">
                <h2 className="text-xl font-bold mb-4">💰 طلب سلفية</h2>

                <label className="block mb-2">نوع السلفة:</label>
                <select
                  value={advanceData.type}
                  onChange={(e) => setAdvanceData({ ...advanceData, type: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                >
                  <option value="short">قصيرة (من الراتب)</option>
                  <option value="long">طويلة (بقسط)</option>
                </select>

                <label className="block mb-2">مبلغ السلفة:</label>
                <input
                  type="number"
                  value={advanceData.amount}
                  onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                  placeholder="أدخل المبلغ"
                />

                {advanceData.type === "long" && (
                  <>
                    <label className="block mb-2">مدة التقسيط (أشهر):</label>
                    <input
                      type="number"
                      min="1"
                      value={advanceData.installments}
                      onChange={(e) => setAdvanceData({ ...advanceData, installments: parseInt(e.target.value) || 1 })}
                      className="w-full border rounded p-2 mb-4"
                    />
                  </>
                )}

                <label className="block mb-2">ملاحظات:</label>
                <textarea
                  value={advanceData.note}
                  onChange={(e) => setAdvanceData({ ...advanceData, note: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                  rows="2"
                />

                <label className="block mb-2">مرفق (صورة / PDF):</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setAdvanceData({ ...advanceData, attachment: file });
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setAdvanceAttachmentPreview(ev.target.result);
                      reader.readAsDataURL(file);
                    } else {
                      setAdvanceAttachmentPreview(null);
                    }
                  }}
                  className="w-full border rounded p-2 mb-2"
                />
                {advanceAttachmentPreview && (
                  <div className="mb-4">
                    {advanceData.attachment?.type?.startsWith("image/") ? (
                      <img src={advanceAttachmentPreview} alt="مرفق" className="max-h-32 rounded border" />
                    ) : (
                      <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">📄 {advanceData.attachment?.name}</div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowAdvanceModal(false);
                      setAdvanceData({ type: "short", amount: "", installments: 1, note: "", attachment: null });
                      setAdvanceAttachmentPreview(null);
                    }}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={submitAdvance}
                    disabled={loading}
                    className={`bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 flex items-center gap-2 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        جاري الإرسال...
                      </>
                    ) : (
                      "تقديم الطلب"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل عرض السيرة الذاتية */}
          {showCvModal && (employee.cv || employee.cv_url) && employee.id && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" dir="rtl">
              <div className="bg-white rounded-lg shadow-lg w-[90%] h-[90%] max-w-5xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">السيرة الذاتية - {employee.name}</h2>
                  <button
                    onClick={() => {
                      setShowCvModal(false);
                      if (cvBlobUrl) {
                        URL.revokeObjectURL(cvBlobUrl);
                        setCvBlobUrl(null);
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 bg-gray-100 rounded overflow-hidden">
                  {cvBlobUrl ? (
                    <iframe
                      src={cvBlobUrl}
                      className="w-full h-full"
                      title="السيرة الذاتية"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">جاري التحميل...</div>
                  )}
                </div>
                <div className="mt-4 flex justify-between">
                  <a
                    href={cvBlobUrl}
                    download={`cv_${employee.name}.pdf`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    تحميل
                  </a>
                  <button
                    onClick={() => {
                      setShowCvModal(false);
                      if (cvBlobUrl) {
                        URL.revokeObjectURL(cvBlobUrl);
                        setCvBlobUrl(null);
                      }
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Evaluation Modal */}
        {showEvaluationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg" dir="rtl">
              <h2 className="text-2xl font-bold mb-6 text-center">⭐ تقييم أداء الموظف</h2>

              <div className="mb-4">
                <label className="block font-semibold mb-2 text-gray-700">الفترة (الشهر / السنة)</label>
                <input
                  type="month"
                  value={evaluationData.period}
                  onChange={(e) => setEvaluationData({...evaluationData, period: e.target.value})}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block font-semibold mb-2 text-gray-700">المظهر العام</label>
                  <StarRating value={evaluationData.appearance} onChange={(v) => setEvaluationData({...evaluationData, appearance: v})} />
                  <p className="text-sm text-gray-500 mt-1">{evaluationData.appearance} / 10</p>
                </div>
                <div>
                  <label className="block font-semibold mb-2 text-gray-700">السلوك الشخصي</label>
                  <StarRating value={evaluationData.behavior} onChange={(v) => setEvaluationData({...evaluationData, behavior: v})} />
                  <p className="text-sm text-gray-500 mt-1">{evaluationData.behavior} / 10</p>
                </div>
                <div>
                  <label className="block font-semibold mb-2 text-gray-700">أداء الموظف في العمل</label>
                  <StarRating value={evaluationData.performance} onChange={(v) => setEvaluationData({...evaluationData, performance: v})} />
                  <p className="text-sm text-gray-500 mt-1">{evaluationData.performance} / 10</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">المجموع الكلي</span>
                    <span className="text-2xl font-bold text-purple-600">
                      {evaluationData.appearance + evaluationData.behavior + evaluationData.performance} / 30
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-2 text-gray-700">ملاحظات</label>
                  <textarea
                    value={evaluationData.notes}
                    onChange={(e) => setEvaluationData({...evaluationData, notes: e.target.value})}
                    className="w-full border rounded p-2"
                    rows="3"
                    placeholder="أضف ملاحظاتك..."
                  />
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => setShowEvaluationModal(false)}
                  className="px-6 py-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={submitEvaluation}
                  disabled={evaluationData.appearance === 0 || evaluationData.behavior === 0 || evaluationData.performance === 0}
                  className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300"
                >
                  💾 حفظ التقييم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* مودل إضافة حافز */}
        {showIncentiveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]" dir="rtl">
              <h2 className="text-xl font-bold mb-4">🎁 إضافة حافز</h2>

              <label className="block mb-2">نوع الحافز:</label>
              <select
                value={incentiveData.type}
                onChange={(e) => setIncentiveData({ ...incentiveData, type: e.target.value })}
                className="w-full border rounded p-2 mb-4"
              >
                <option value="bonus">مكافأة</option>
                <option value="allowance">بدل</option>
                <option value="commission">عمولة</option>
                <option value="performance">حافز أداء</option>
                <option value="other">أخرى</option>
              </select>

              <label className="block mb-2">القيمة:</label>
              <input
                type="number"
                value={incentiveData.value}
                onChange={(e) => setIncentiveData({ ...incentiveData, value: e.target.value })}
                className="w-full border rounded p-2 mb-4"
                placeholder="أدخل القيمة"
              />

              <label className="block mb-2">ملاحظات:</label>
              <textarea
                value={incentiveData.note}
                onChange={(e) => setIncentiveData({ ...incentiveData, note: e.target.value })}
                className="w-full border rounded p-2 mb-4"
                rows="2"
                placeholder="اختياري"
              />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setShowIncentiveModal(false);
                    setIncentiveData({ type: "bonus", value: "", note: "" });
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddIncentive}
                  disabled={loading}
                  className={`bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2 ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "جاري..." : "إضافة الحافز"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* مودل إضافة خصم */}
        {showDeductionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-[500px]" dir="rtl">
              <h2 className="text-xl font-bold mb-4">❌ إضافة خصم</h2>

              <label className="block mb-2">نوع الخصم:</label>
              <select
                value={deductionData.type}
                onChange={(e) => setDeductionData({ ...deductionData, type: e.target.value })}
                className="w-full border rounded p-2 mb-4"
              >
                <option value="other">أخرى</option>
                <option value="penalty">غرامة</option>
                <option value="loan">قرض</option>
                <option value="absence">غياب</option>
                <option value="damage">تلفيات</option>
              </select>

              <label className="block mb-2">المبلغ:</label>
              <input
                type="number"
                value={deductionData.amount}
                onChange={(e) => setDeductionData({ ...deductionData, amount: e.target.value })}
                className="w-full border rounded p-2 mb-4"
                placeholder="أدخل المبلغ"
              />

              <label className="block mb-2">السبب:</label>
              <textarea
                value={deductionData.reason}
                onChange={(e) => setDeductionData({ ...deductionData, reason: e.target.value })}
                className="w-full border rounded p-2 mb-4"
                rows="2"
                placeholder="اختياري"
              />

              <label className="block mb-2">التاريخ:</label>
              <input
                type="date"
                value={deductionData.date}
                onChange={(e) => setDeductionData({ ...deductionData, date: e.target.value })}
                className="w-full border rounded p-2 mb-4"
              />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setShowDeductionModal(false);
                    setDeductionData({ type: "other", amount: "", reason: "", date: "" });
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddDeduction}
                  disabled={loading}
                  className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center gap-2 ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "جاري..." : "إضافة الخصم"}
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}