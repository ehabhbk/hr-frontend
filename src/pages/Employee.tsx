import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDateArabic, formatDateDisplay } from "../utils/dateUtils";

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
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showReturnAssetModal, setShowReturnAssetModal] = useState(false);
  const [selectedWarningReason, setSelectedWarningReason] = useState("");
  const [customWarningReason, setCustomWarningReason] = useState("");
  const [returnAssetNote, setReturnAssetNote] = useState("");
  const [cvBlobUrl, setCvBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vacationData, setVacationData] = useState({
    type: "official",
    from_date: "",
    to_date: "",
    paid: true,
    medical_certificate: null,
  });
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
  });
  const token = localStorage.getItem("token");

  useEffect(() => {
    api
      .get(`/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployee(res.data.data))
      .catch((err) => console.error(err));
    
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
    if (vacationData.medical_certificate) {
      formData.append("medical_certificate", vacationData.medical_certificate);
    }

    api
      .post("/leaves/requests", formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        toast.success("✅ تم تقديم طلب الإجازة بنجاح - في انتظار الموافقة");
        refreshEmployee();
        setShowVacationModal(false);
        setVacationData({ type: "official", from_date: "", to_date: "", paid: true, medical_certificate: null });
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
    api
      .post(
        "/advances/requests",
        {
          employee_id: employee.id,
          type: advanceData.type,
          amount: advanceData.amount,
          installments: advanceData.installments,
          note: advanceData.note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        toast.success("✅ تم تقديم طلب السلفة بنجاح - في انتظار الموافقة");
        refreshEmployee();
        setShowAdvanceModal(false);
        setAdvanceData({ type: "short", amount: "", installments: 1, note: "" });
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
    return <div className="p-6 text-lg font-semibold">⏳ جاري تحميل بيانات الموظف...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">تفاصيل الموظف</h1>
          <button
            onClick={() => navigate("/employees")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-lg"
          >
            ⬅ رجوع للقائمة
          </button>
        </header>

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">الموظف: {employee.name}</span>
          <div className="flex flex-col text-right">
            <span className="text-lg font-semibold">
              الحالة:{" "}
              {employee.status === "terminated" ? (
                <span className="text-red-600">مفصول</span>
              ) : employee.status === "warning" ? (
                <span className="text-yellow-500">إنذار</span>
              ) : employee.status === "vacation" || (employee.active_leave && employee.active_leave.status === "approved") ? (
                <span className="text-blue-600">في إجازة</span>
              ) : (
                <span className="text-green-600">نشط</span>
              )}
            </span>
            
            {employee.status === "vacation" || (employee.active_leave && employee.active_leave.status === "approved") ? (
              <div className="flex flex-col gap-1 mt-1">
                {employee.leave_count > 0 && (
                  <span className="text-blue-600 font-semibold text-sm">
                    مجموع أيام الإجازة: {employee.leave_count} يوم
                  </span>
                )}
                {employee.active_leave && (
                  <span className="text-blue-500 font-semibold text-sm">
                    متبقي من الإجازة الحالية: {employee.active_leave.remaining_days || 0} يوم
                  </span>
                )}
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
                  src={employee.profile_photo_url || "/default-avatar.png"}
                  alt={employee.name}
                  className="w-24 h-24 rounded-full border-4 border-indigo-300 cursor-pointer object-cover"
                  onClick={() => {
                    if (employee.profile_photo_url) window.open(employee.profile_photo_url, "_blank");
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
                  <p className="font-semibold text-blue-700">🌴 إجازة نشطة</p>
                  <p className="text-sm">من {formatDateDisplay(employee.active_leave.from_date)} إلى {formatDateDisplay(employee.active_leave.to_date)}</p>
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
                    <span className="font-semibold text-gray-700 block mb-1">الحوافز:</span>
                    {employee.incentives.map((i, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600 mr-4">
                          {i.type === 'bonus' ? 'مكافأة' : 
                           i.type === 'allowance' ? 'بدل' : 
                           i.type === 'commission' ? 'عمولة' : 
                           i.type === 'performance' ? 'حافز أداء' : 'أخرى'}:
                        </span>
                        <span className="text-blue-600">{parseFloat(i.value || 0).toLocaleString()} ج.س</span>
                      </div>
                    ))}
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

            {/* بطاقة العهد */}
            {employee.assets && employee.assets.length > 0 && (
              <div className="bg-purple-50 shadow-lg rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-800 mb-4">📦 العهد</h3>
                <div className="space-y-2">
                  {employee.assets.map((asset) => (
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
              <button
                onClick={() => setShowReturnAssetModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-lg"
              >
                ↩️ إرجاع عهد
              </button>

              <button
                onClick={() => setShowWarningModal(true)}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 text-lg"
              >
                ⚠ إنذار
              </button>

              <button
                onClick={() => setShowTerminationModal(true)}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-lg"
              >
                ⛔ فصل
              </button>

              <button
                onClick={() => setShowVacationModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-lg"
                disabled={employee.status === "vacation"}
              >
                🌴 طلب الإجازة
              </button>

              <button
                onClick={() => setShowContractModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-lg"
              >
                📄 إنشاء عقد
              </button>

              <button
                onClick={() => setShowAdvanceModal(true)}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 text-lg"
                disabled={employee.status === "vacation"}
              >
                💰 طلب السلفية
              </button>

              {employee.status === "terminated" && (
                <button
                  onClick={restoreEmployee}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-lg"
                >
                  ✅ إعادة تفعيل
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
                  onChange={(e) => setVacationData({ ...vacationData, type: e.target.value })}
                  className="w-full border rounded p-2 mb-4"
                >
                  <option value="official">رسمية</option>
                  <option value="sick">مرضية</option>
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

                {vacationData.type === "sick" && (
                  <>
                    <label className="block mb-2">أرفق ملف طبي (أورنيك مرضي):</label>
                    <input
                      type="file"
                      accept="pdf,jpg,jpeg,png"
                      onChange={(e) => setVacationData({ ...vacationData, medical_certificate: e.target.files[0] })}
                      className="w-full border rounded p-2 mb-4"
                    />
                  </>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowVacationModal(false);
                      setVacationData({ type: "official", from_date: "", to_date: "", paid: true, medical_certificate: null });
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

          {/* مودل إرجاع العهد */}
          {showReturnAssetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-[600px]" dir="rtl">
                <h2 className="text-xl font-bold mb-4 text-purple-800">↩️ إرجاع العهد للموظف</h2>
                
                {employee.assets && employee.assets.length > 0 ? (
                  <>
                    <p className="text-gray-600 mb-4">اختر العهدة التي تم إرجاعها للمؤسسة:</p>
                    
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {employee.assets.map((asset) => (
                        <div 
                          key={asset.id} 
                          className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                            asset.returned_date 
                              ? 'border-gray-200 bg-gray-50 opacity-60' 
                              : 'border-purple-300 bg-purple-50 hover:bg-purple-100'
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
                              {asset.asset_number && <p className="text-xs text-gray-500">رقم العهدة: {asset.asset_number}</p>}
                            </div>
                            <div className="text-left">
                              <span className="font-bold text-purple-600 text-lg">
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
                    <p>لا توجد عهد مسجلة لهذا الموظف</p>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowReturnAssetModal(false);
                      setReturnAssetNote("");
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
                <h2 className="text-xl font-bold mb-4">📄 إنشاء عقد عمل</h2>

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
                    إنشاء العقد
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

                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => {
                      setShowAdvanceModal(false);
                      setAdvanceData({ type: "short", amount: "", installments: 1, note: "" });
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
        </main>
      </div>
    </div>
  );
}