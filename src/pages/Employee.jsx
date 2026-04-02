import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [selectedWarningReason, setSelectedWarningReason] = useState("");
  const [customWarningReason, setCustomWarningReason] = useState("");
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
      const token = localStorage.getItem("token");
      if (!token) return;
      
      fetch(`http://localhost:8000/api/files/cv/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load");
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
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
      <Sidebar sticky />

      <div className="flex-1 flex flex-col">
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
              ) : employee.status === "vacation" ? (
                <span className="text-blue-600">إجازة</span>
              ) : (
                <span className="text-green-600">نشط</span>
              )}
            </span>
            {employee.termination_type && employee.status === "terminated" && (
              <span className="text-red-500 text-sm">
                نوع الفصل: {employee.termination_type} - {employee.termination_reason}
              </span>
            )}
            {employee.warnings_count > 0 && (
              <span className="text-orange-600 font-semibold text-sm">
                عدد الإنذارات: {employee.warnings_count}
              </span>
            )}
            {employee.leave_count > 0 && (
              <span className="text-blue-600 font-semibold text-sm">
                عدد أيام الإجازات: {employee.leave_count}
              </span>
            )}
          </div>
        </div>

        <main className="flex-1 p-6">
          <div className={`${getCardColor(employee.status)} shadow-lg rounded-xl p-8 flex flex-col items-center text-center`}>
            <img
              src={employee.profile_photo_url || "/default-avatar.png"}
              alt={employee.name}
              className="w-40 h-40 rounded-full border-4 border-indigo-300 mb-6 cursor-pointer object-cover"
              onClick={() => {
                if (employee.profile_photo_url) window.open(employee.profile_photo_url, "_blank");
              }}
            />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{employee.name}</h2>
            <p className="text-xl text-gray-700 mb-1">{employee.position}</p>
            <p className="text-lg text-gray-600 mb-1">القسم: {employee.department?.name || "غير محدد"}</p>
            <p className="text-lg text-green-700 font-semibold mb-1">💰 الراتب الأساسي: {employee.salary}</p>
            {employee.total_salary && (
              <p className="text-lg text-green-700 font-semibold mb-1">💰 الإجمالي مع البدلات والحوافز: {employee.total_salary}</p>
            )}
            <p className="text-lg text-gray-600 mb-1">📅 تاريخ التعيين: {employee.hire_date}</p>
            <p className="text-lg text-gray-600 mb-1">📞 الهاتف: {employee.phone}</p>
            <p className="text-lg text-gray-600 mb-1">🏠 العنوان: {employee.address}</p>

            {employee.contract_file && (
              <button onClick={() => window.open(employee.contract_file, "_blank")} className="text-blue-600 underline text-lg mb-4">
                📄 عرض العقد
              </button>
            )}

            {employee.active_leave && (
              <div className="bg-blue-50 p-4 rounded-lg mt-2">
                <p className="text-lg font-semibold text-blue-700">🌴 الإجازة الحالية:</p>
                <p className="text-gray-700">النوع: {employee.active_leave.type === "sick" ? "مرضية" : "رسمية"}</p>
                <p className="text-gray-700">من: {employee.active_leave.from_date} إلى: {employee.active_leave.to_date}</p>
                <p className="text-gray-700">المدة: {employee.active_leave.days} أيام</p>
                <p className="text-gray-700">الحالة: {employee.active_leave.paid ? "بمرتب" : "بدون مرتب"}</p>
                {employee.active_leave.medical_certificate && (
                  <a href={`/storage/${employee.active_leave.medical_certificate}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    📎 عرض الملف الطبي
                  </a>
                )}
              </div>
            )}

            {(employee.cv || employee.cv_url) && (
              <button 
                onClick={() => setShowCvModal(true)} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mt-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                عرض السيرة الذاتية
              </button>
            )}

            <p className="text-lg text-gray-600 mb-4">📝 ملاحظات: {employee.notes || "لا توجد"}</p>

            {/* أزرار */}
            <div className="flex gap-4 mt-6 flex-wrap justify-center">
              <button
                onClick={() => navigate(`/employees/${id}/edit`)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-lg"
              >
                ✏ استيضاح
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
              <div className="mt-6 w-full">
                <h3 className="text-lg font-bold mb-2">الإنذارات:</h3>
                {employee.warnings.map((warning) => (
                  <div key={warning.id} className="bg-red-50 p-3 rounded-lg mb-2 flex justify-between items-center">
                    <span>{warning.reason || "إنذار"} - {new Date(warning.created_at).toLocaleDateString("ar-EG")}</span>
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
                  <p>تاريخ التعيين: {employee.hire_date}</p>
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