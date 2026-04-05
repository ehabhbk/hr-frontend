import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { registerUserOnDevice } from "../services/fingerprintApi";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getBankOptions } from "../config/banks";
import { formatDateArabic, formatDateDisplay } from "../utils/dateUtils";

export default function AddEmployee() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customBanks, setCustomBanks] = useState([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [contractDuration, setContractDuration] = useState(24);

  const [formData, setFormData] = useState({
    file_number: "",
    name: "",
    email: "",
    phone: "",
    phone_country_code: "+249",
    position: "",
    position_grade: "",
    position_allowance: "",
    department_id: "",
    attendance_device_id: "",
    hire_date: "",
    base_salary: "",
    allowances: [],
    incentives: [],
    fingerprints: [],
    address: "",
    notes: "",
    status: "active",
    profile_photo: null,
    cv: null,
    contract_file: null,
    // Personal Info
    gender: "",
    birth_date: "",
    id_number: "",
    marital_status: "",
    // Insurance
    insurance_type: "none",
    insurance_amount: 0,
    // Bank
    bank_name: "",
    bank_account: "",
    // Assets
    assets: [],
  });

  useEffect(() => {
    let mounted = true;

    // Fetch departments
    api
      .get("/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (mounted) setDepartments(res.data.data || []);
      })
      .catch(() => toast.error("❌ فشل في جلب الأقسام"));

    // Fetch attendance devices
    api
      .get("/attendance-device", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (mounted) setDevices(res.data.data || []);
      })
      .catch(() => {
        // Non-fatal: still allow manual input of device id if needed
        toast.error("❌ فشل في جلب أجهزة البصمة");
      });

    // Fetch custom banks
    api
      .get("/banks/custom", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (mounted) setCustomBanks(res.data?.data || []);
      })
      .catch(() => {
        // Non-fatal: ignore
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files && files[0] ? files[0] : null }));
  };

  const [newAllowance, setNewAllowance] = useState({ type: "transport", custom_name: "", value: 0 });
  const [newIncentive, setNewIncentive] = useState({ type: "bonus", custom_name: "", value: 0 });
  const [showCustomAllowanceModal, setShowCustomAllowanceModal] = useState(false);
  const [showCustomIncentiveModal, setShowCustomIncentiveModal] = useState(false);
  const [customAllowanceName, setCustomAllowanceName] = useState("");
  const [customIncentiveName, setCustomIncentiveName] = useState("");

  const addAllowance = () => {
    if (newAllowance.value > 0) {
      setFormData(prev => ({ ...prev, allowances: [...prev.allowances, { ...newAllowance }] }));
      setNewAllowance({ type: "transport", custom_name: "", value: 0 });
    }
  };

  const addCustomAllowance = () => {
    if (customAllowanceName.trim() && newAllowance.value > 0) {
      setFormData(prev => ({ 
        ...prev, 
        allowances: [...prev.allowances, { type: "custom", custom_name: customAllowanceName.trim(), value: newAllowance.value }] 
      }));
      setNewAllowance({ type: "transport", custom_name: "", value: 0 });
      setCustomAllowanceName("");
      setShowCustomAllowanceModal(false);
      toast.success("✅ تم إضافة البدل بنجاح");
    } else {
      toast.warning("⚠️ يرجى إدخال اسم البدل وقيمته");
    }
  };

  const addCustomIncentive = () => {
    if (customIncentiveName.trim() && newIncentive.value > 0) {
      setFormData(prev => ({ 
        ...prev, 
        incentives: [...prev.incentives, { type: "custom", custom_name: customIncentiveName.trim(), value: newIncentive.value }] 
      }));
      setNewIncentive({ type: "bonus", custom_name: "", value: 0 });
      setCustomIncentiveName("");
      setShowCustomIncentiveModal(false);
      toast.success("✅ تم إضافة الحافز بنجاح");
    } else {
      toast.warning("⚠️ يرجى إدخال اسم الحافز وقيمته");
    }
  };

  const removeAllowance = (index) => {
    setFormData(prev => ({ ...prev, allowances: prev.allowances.filter((_, i) => i !== index) }));
  };

  const addIncentive = () => {
    if (newIncentive.value > 0) {
      setFormData(prev => ({ ...prev, incentives: [...prev.incentives, { ...newIncentive }] }));
      setNewIncentive({ type: "bonus", value: 0 });
    }
  };

  const removeIncentive = (index) => {
    setFormData(prev => ({ ...prev, incentives: prev.incentives.filter((_, i) => i !== index) }));
  };

  const [newFingerprint, setNewFingerprint] = useState({ finger_id: "", finger_position: "right", finger: "thumb" });

  // Map finger selection to finger ID (0-9)
  const fingerPositionToId = (position, finger) => {
    const rightFingers = { thumb: 0, index: 1, middle: 2, ring: 3, pinky: 4 };
    const leftFingers = { thumb: 5, index: 6, middle: 7, ring: 8, pinky: 9 };
    
    if (position === "right") {
      return rightFingers[finger] ?? 0;
    } else {
      return leftFingers[finger] ?? 5;
    }
  };

  const addFingerprint = async () => {
    if (!newFingerprint.finger_id) {
      toast.error("يرجى إدخال رقم البصمة");
      return;
    }

    const deviceId = formData.attendance_device_id;
    if (!deviceId) {
      toast.error("يرجى اختيار جهاز البصمة أولاً");
      return;
    }

    // Get finger ID (0-9) for the device
    const fingerId = fingerPositionToId(newFingerprint.finger_position, newFingerprint.finger);

    try {
      setLoading(true);
      
      // Send request to device with enrollment mode
      const result = await registerUserOnDevice(deviceId, {
        user_id: newFingerprint.finger_id,
        name: formData.name || newFingerprint.finger_id,
        enroll_fingerprint: true,
        finger_id: fingerId,
      });

      if (result.success) {
        setFormData(prev => ({ ...prev, fingerprints: [...prev.fingerprints, { ...newFingerprint, device_finger_id: fingerId }] }));
        setNewFingerprint({ finger_id: "", finger_position: "right", finger: "thumb" });
        toast.success("✅ " + (result.message || "تم تسجيل البصمة بنجاح"));
      } else {
        toast.warning("⚠️ " + (result.message || "لم يتم تسجيل البصمة"));
      }
    } catch (error) {
      console.error("Fingerprint registration error:", error);
      toast.error("❌ فشل التواصل مع الجهاز");
    } finally {
      setLoading(false);
    }
  };

  const removeFingerprint = (index) => {
    setFormData(prev => ({ ...prev, fingerprints: prev.fingerprints.filter((_, i) => i !== index) }));
  };

  // Asset handlers
  const [newAsset, setNewAsset] = useState({ name: "", description: "", type: "fixed", value: 0 });

  const addAsset = () => {
    if (newAsset.name && newAsset.value > 0) {
      setFormData(prev => ({ ...prev, assets: [...prev.assets, { ...newAsset }] }));
      setNewAsset({ name: "", description: "", type: "fixed", value: 0 });
      toast.success("✅ تم إضافة العهدة");
    } else {
      toast.warning("⚠️ يرجى إدخال اسم العهدة وقيمتها");
    }
  };

  const removeAsset = (index) => {
    setFormData(prev => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) }));
  };

  // Insurance handlers
  const [newInsurance, setNewInsurance] = useState({ type: "health", amount: 0 });

  const addInsurance = () => {
    if (newInsurance.amount > 0) {
      setFormData(prev => ({ 
        ...prev, 
        insurance_type: prev.insurance_type === "none" ? newInsurance.type : "both",
        insurance_amount: parseFloat(prev.insurance_amount || 0) + parseFloat(newInsurance.amount)
      }));
      setNewInsurance({ type: "health", amount: 0 });
      toast.success("✅ تم إضافة التأمين");
    } else {
      toast.warning("⚠️ يرجى إدخال قيمة التأمين");
    }
  };

  const insuranceTypes = [
    { value: "health", label: "تأمين صحي" },
    { value: "social", label: "تأمين اجتماعي" },
  ];

  const bankOptions = getBankOptions(customBanks);

  const fingerOptions = [
    { value: "thumb", label: "الإبهام" },
    { value: "index", label: "السبابة" },
    { value: "middle", label: "الوسطى" },
    { value: "ring", label: "البنصر" },
    { value: "pinky", label: "الخنصر" },
  ];

  const fingerPositions = [
    { value: "right", label: "اليد اليمنى" },
    { value: "left", label: "اليد اليسرى" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();

      const scalarFields = [
        "file_number",
        "name",
        "email",
        "phone",
        "position",
        "position_grade",
        "position_allowance",
        "department_id",
        "attendance_device_id",
        "hire_date",
        "base_salary",
        "address",
        "notes",
        "status",
        "gender",
        "birth_date",
        "id_number",
        "marital_status",
        "insurance_type",
        "insurance_amount",
        "bank_name",
        "bank_account",
      ];

      scalarFields.forEach((key) => {
        const val = formData[key];
        if (val !== "" && val !== null && typeof val !== "undefined") {
          data.append(key, val);
        }
      });

      if (formData.allowances.length > 0) {
        data.append("allowances", JSON.stringify(formData.allowances));
      }
      if (formData.incentives.length > 0) {
        data.append("incentives", JSON.stringify(formData.incentives));
      }
      if (formData.fingerprints.length > 0) {
        data.append("fingerprints", JSON.stringify(formData.fingerprints));
      }
      if (formData.assets.length > 0) {
        data.append("assets", JSON.stringify(formData.assets));
      }

      if (formData.profile_photo) {
        data.append("profile_photo", formData.profile_photo);
      }
      if (formData.cv) {
        data.append("cv", formData.cv);
      }
      if (formData.contract_file) {
        data.append("contract_file", formData.contract_file);
      }

      await api.post("/employees", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("✅ تم إضافة الموظف بنجاح");
      setTimeout(() => navigate("/employees"), 1200);
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message ||
        (err?.response?.data && JSON.stringify(err.response.data)) ||
        err.message ||
        "حدث خطأ غير متوقع";
      toast.error(`❌ فشل الإضافة: ${serverMessage}`);
      console.error("Employee create error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
        <Topbar title="إضافة موظف جديد" />

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">نموذج إضافة موظف</span>
        </div>

        <main className="flex-1 p-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-xl p-8 max-w-3xl mx-auto space-y-6"
          >
            {/* ============================================ */}
            {/* القسم الأول: البيانات الأساسية */}
            {/* ============================================ */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
              <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <span>📋</span> البيانات الأساسية
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* رقم الملف */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الملف</label>
                  <input
                    type="text"
                    name="file_number"
                    value={formData.file_number}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* الاسم */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* الهاتف مع مفتاح البلد */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الهاتف</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.phone_country_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_country_code: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-2 py-2 bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="+249">🇸🇩 +249</option>
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="رقم الهاتف"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* العنوان */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* النوع */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">النوع</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر النوع</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                {/* تاريخ الميلاد */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* رقم الهوية */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الهوية</label>
                  <input
                    type="text"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    placeholder="رقم الهوية الوطنية"
                  />
                </div>

                {/* الحالة الاجتماعية */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الحالة الاجتماعية</label>
                  <select
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر الحالة</option>
                    <option value="single">أعزب/عزباء</option>
                    <option value="married">متزوج/متزوجة</option>
                    <option value="divorced">مطلق/مطلقة</option>
                    <option value="widowed">أرمل/أرملة</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* القسم الثاني: بيانات الوظيفة */}
            {/* ============================================ */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-xl border border-green-200">
              <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                <span>💼</span> بيانات الوظيفة
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* الوظيفة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* الدرجة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الدرجة الوظيفية</label>
                  <input
                    type="text"
                    name="position_grade"
                    value={formData.position_grade}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* القسم */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">القسم <span className="text-red-500">*</span></label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* تاريخ التعيين */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ التعيين</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* الحالة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الحالة</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">نشط</option>
                    <option value="vacation">في إجازة</option>
                    <option value="warning">إنذار</option>
                    <option value="terminated">منتهي</option>
                  </select>
                </div>

                {/* جهاز البصمة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">جهاز البصمة</label>
                  <div className="flex gap-2">
                    <select
                      name="attendance_device_id"
                      value={formData.attendance_device_id}
                      onChange={handleChange}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">اختر جهازاً</option>
                      {devices.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.name || `جهاز #${dev.id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowFingerprintModal(true)}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      + بصمة
                    </button>
                  </div>
                  {formData.fingerprints.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.fingerprints.map((fp, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                          <span>🔐 {fp.finger_id} - {fingerPositions.find(p => p.value === fp.finger_position)?.label} - {fingerOptions.find(f => f.value === fp.finger)?.label}</span>
                          <button type="button" onClick={() => removeFingerprint(idx)} className="text-red-500 hover:text-red-700">حذف</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* القسم الثالث: المرتب والبدلات والحوافز */}
            {/* ============================================ */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
              <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <span>💰</span> المرتب والبدلات والحوافز
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الراتب الأساسي</label>
                  <input
                    type="number"
                    step="0.01"
                    name="base_salary"
                    value={formData.base_salary}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">بدل الدرجة</label>
                  <input
                    type="number"
                    step="0.01"
                    name="position_allowance"
                    value={formData.position_allowance}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* البدلات والحوافز */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
                >
                  + إضافة بدلات وحوافز
                </button>
              </div>
              
              {(formData.allowances.length > 0 || formData.incentives.length > 0) && (
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">البدلات والحوافز المضافة:</h4>
                  <div className="space-y-1 text-sm max-h-40 overflow-auto">
                    {formData.allowances.map((a, idx) => (
                      <div key={`a-${idx}`} className="flex justify-between items-center bg-white p-2 rounded border">
                        <span className="text-emerald-700">
                          {a.type === 'custom' ? `📌 ${a.custom_name}` : 
                           a.type === 'transport' ? '🚗 بدل نقل' : 
                           a.type === 'food' ? '🍽️ بدل طعام' : 
                           a.type === 'housing' ? '🏠 بدل سكن' : 
                           a.type === 'phone' ? '📱 بدل هاتف' : 
                           a.type === 'education' ? '📚 بدل تعليم' : 
                           a.type === 'medical' ? '🏥 بدل علاج' : '📋 بدل أخرى'}
                        </span>
                        <span className="font-medium text-green-600">{parseFloat(a.value).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                    {formData.incentives.map((i, idx) => (
                      <div key={`i-${idx}`} className="flex justify-between items-center bg-white p-2 rounded border">
                        <span className="text-blue-700">
                          {i.type === 'custom' ? `🎯 ${i.custom_name}` :
                           i.type === 'bonus' ? '🏆 مكافأة' : 
                           i.type === 'allowance' ? '💵 بدل' : 
                           i.type === 'commission' ? '💼 عمولة' : 
                           i.type === 'performance' ? '📈 حافز أداء' : '⭐ أخرى'}
                        </span>
                        <span className="font-medium text-blue-600">{parseFloat(i.value).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-green-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-700">الإجمالي مع البدلات والحوافز:</span>
                      <span className="font-bold text-xl text-green-700">
                        {(
                          parseFloat(formData.base_salary || 0) +
                          parseFloat(formData.position_allowance || 0) +
                          formData.allowances.reduce((sum, a) => sum + parseFloat(a.value || 0), 0) +
                          formData.incentives.reduce((sum, i) => sum + parseFloat(i.value || 0), 0)
                        ).toLocaleString()} ج.س
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* القسم الرابع: المعلومات البنكية والتأمين والعهد */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* حساب بنكي */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span>🏦</span> المعلومات البنكية
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">اسم البنك</label>
                    <select
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر البنك</option>
                      {bankOptions.map((bank) => (
                        <option key={bank.value} value={bank.value}>{bank.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">رقم الحساب</label>
                    <input
                      type="text"
                      name="bank_account"
                      value={formData.bank_account}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="رقم الحساب"
                    />
                  </div>
                </div>
              </div>

              {/* التأمين */}
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <span>🏥</span> التأمين
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">نوع التأمين</label>
                    <select
                      name="insurance_type"
                      value={formData.insurance_type}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="none">بدون تأمين</option>
                      <option value="health">تأمين صحي</option>
                      <option value="social">تأمين اجتماعي</option>
                      <option value="both">كلاهما</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">قيمة التأمين</label>
                    <input
                      type="number"
                      step="0.01"
                      name="insurance_amount"
                      value={formData.insurance_amount}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* العهد */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
                    <span>📦</span> العهد
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAssetModal(true)}
                    className="bg-purple-600 text-white px-2 py-1 rounded-lg hover:bg-purple-700 text-xs"
                  >
                    + إضافة
                  </button>
                </div>
                {formData.assets.length > 0 ? (
                  <div className="space-y-2 max-h-24 overflow-auto">
                    {formData.assets.map((asset, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-xs">
                        <span className="text-purple-700 truncate flex-1">{asset.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAsset(idx)}
                          className="text-red-500 hover:text-red-700 mr-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs text-center py-2">لا توجد عهد</p>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* القسم الخامس: الملاحظات */}
            {/* ============================================ */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows="3"
              />
            </div>

            {/* ============================================ */}
            {/* القسم السادس: المرفقات (في الأسفل) */}
            {/* ============================================ */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
              <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span>📎</span> المرفقات
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* الصورة الشخصية */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الصورة الشخصية</label>
                  <input
                    type="file"
                    name="profile_photo"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* السيرة الذاتية */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">السيرة الذاتية (CV)</label>
                  <input
                    type="file"
                    name="cv"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {/* العقد الموقّع */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">العقد الموقّع</label>
                  <input
                    type="file"
                    name="contract_file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowContractModal(true)}
                    className="mt-2 bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 text-xs w-full"
                  >
                    📄 إنشاء نموذج عقد
                  </button>
                </div>
              </div>
            </div>

            {/* أزرار الحفظ */}
            <div className="flex gap-4 mt-6 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3 rounded-lg text-lg flex items-center gap-2 ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {loading ? "جاري الحفظ..." : "✅ حفظ الموظف"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/employees")}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 text-lg"
              >
                ❌ إلغاء
              </button>
            </div>
          </form>

          <ToastContainer position="top-right" autoClose={3000} />

          {/* Modal for Allowances and Incentives */}
          {showSalaryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6" dir="rtl">
                <h3 className="text-xl font-bold mb-4 text-indigo-800">إضافة بدلات وحوافز</h3>
                
                <div className="mb-4 border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">البدلات</h4>
                    <button 
                      onClick={() => setShowCustomAllowanceModal(true)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                    >
                      + بدل مخصص
                    </button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newAllowance.type}
                      onChange={(e) => setNewAllowance({ ...newAllowance, type: e.target.value })}
                      className="border p-2 rounded flex-1"
                    >
                      <option value="transport">🚗 بدل نقل</option>
                      <option value="food">🍽️ بدل طعام</option>
                      <option value="housing">🏠 بدل سكن</option>
                      <option value="phone">📱 بدل هاتف</option>
                      <option value="education">📚 بدل تعليم</option>
                      <option value="medical">🏥 بدل علاج</option>
                      <option value="other">📋 بدل أخرى</option>
                    </select>
                    <input
                      type="number"
                      value={newAllowance.value}
                      onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })}
                      placeholder="القيمة"
                      className="border p-2 rounded w-32"
                    />
                    <button onClick={addAllowance} className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {formData.allowances.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-emerald-50 p-2 rounded text-sm border border-emerald-100">
                        <span className="text-emerald-800">
                          {a.type === 'custom' ? `📌 ${a.custom_name}` : 
                           a.type === 'transport' ? '🚗 بدل نقل' : 
                           a.type === 'food' ? '🍽️ بدل طعام' : 
                           a.type === 'housing' ? '🏠 بدل سكن' : 
                           a.type === 'phone' ? '📱 بدل هاتف' : 
                           a.type === 'education' ? '📚 بدل تعليم' : 
                           a.type === 'medical' ? '🏥 بدل علاج' : '📋 بدل أخرى'}: 
                          <span className="font-bold">{parseFloat(a.value).toLocaleString()} ج.س</span>
                        </span>
                        <button type="button" onClick={() => removeAllowance(idx)} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">الحوافز</h4>
                    <button 
                      onClick={() => setShowCustomIncentiveModal(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      + حافز مخصص
                    </button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newIncentive.type}
                      onChange={(e) => setNewIncentive({ ...newIncentive, type: e.target.value })}
                      className="border p-2 rounded flex-1"
                    >
                      <option value="bonus">🏆 مكافأة</option>
                      <option value="allowance">💵 بدل</option>
                      <option value="commission">💼 عمولة</option>
                      <option value="performance">📈 حافز أداء</option>
                      <option value="other">⭐ أخرى</option>
                    </select>
                    <input
                      type="number"
                      value={newIncentive.value}
                      onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })}
                      placeholder="القيمة"
                      className="border p-2 rounded w-32"
                    />
                    <button onClick={addIncentive} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {formData.incentives.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded text-sm border border-blue-100">
                        <span className="text-blue-800">
                          {i.type === 'custom' ? `🎯 ${i.custom_name}` :
                           i.type === 'bonus' ? '🏆 مكافأة' : 
                           i.type === 'allowance' ? '💵 بدل' : 
                           i.type === 'commission' ? '💼 عمولة' : 
                           i.type === 'performance' ? '📈 حافز أداء' : '⭐ أخرى'}: 
                          <span className="font-bold">{parseFloat(i.value).toLocaleString()} ج.س</span>
                        </span>
                        <button type="button" onClick={() => {
                          setFormData(prev => ({ ...prev, incentives: prev.incentives.filter((_, idx2) => idx2 !== idx) }));
                        }} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowSalaryModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">إغلاق</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Custom Allowance Name */}
          {showCustomAllowanceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
                <h3 className="text-lg font-bold mb-4 text-indigo-800">إضافة بدل مخصص</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">اسم البدل</label>
                    <input
                      type="text"
                      value={customAllowanceName}
                      onChange={(e) => setCustomAllowanceName(e.target.value)}
                      placeholder="مثال: بدل مواصلات، بدل سكن إضافي..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">القيمة (جنيه سوداني)</label>
                    <input
                      type="number"
                      value={newAllowance.value}
                      onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })}
                      placeholder="أدخل القيمة"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    onClick={() => {
                      setShowCustomAllowanceModal(false);
                      setCustomAllowanceName("");
                    }} 
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={addCustomAllowance} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    إضافة البدل
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Custom Incentive Name */}
          {showCustomIncentiveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
                <h3 className="text-lg font-bold mb-4 text-blue-800">إضافة حافز مخصص</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الحافز</label>
                    <input
                      type="text"
                      value={customIncentiveName}
                      onChange={(e) => setCustomIncentiveName(e.target.value)}
                      placeholder="مثال: حافز نهاية العام، مكافأة خاصة..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">القيمة (جنيه سوداني)</label>
                    <input
                      type="number"
                      value={newIncentive.value}
                      onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })}
                      placeholder="أدخل القيمة"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    onClick={() => {
                      setShowCustomIncentiveModal(false);
                      setCustomIncentiveName("");
                    }} 
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={addCustomIncentive} 
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    إضافة الحافز
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal for Fingerprint */}
          {showFingerprintModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
                <h3 className="text-xl font-bold mb-4 text-indigo-800">إضافة بصمة</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">رقم البصمة</label>
                    <input
                      type="text"
                      value={newFingerprint.finger_id}
                      onChange={(e) => setNewFingerprint({ ...newFingerprint, finger_id: e.target.value })}
                      placeholder="أدخل رقم البصمة"
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">نوع البصمة</label>
                    <select
                      value={newFingerprint.finger_position}
                      onChange={(e) => setNewFingerprint({ ...newFingerprint, finger_position: e.target.value })}
                      className="w-full border p-2 rounded"
                    >
                      {fingerPositions.map(pos => (
                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">اختر الإصبع</label>
                    <div className="grid grid-cols-2 gap-2">
                      {fingerOptions.map(finger => (
                        <label key={finger.value} className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${newFingerprint.finger === finger.value ? 'bg-indigo-100 border-indigo-500' : ''}`}>
                          <input
                            type="radio"
                            name="finger"
                            value={finger.value}
                            checked={newFingerprint.finger === finger.value}
                            onChange={(e) => setNewFingerprint({ ...newFingerprint, finger: e.target.value })}
                          />
                          {finger.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowFingerprintModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                  <button onClick={addFingerprint} className="bg-indigo-600 text-white px-4 py-2 rounded">إضافة</button>
                </div>
              </div>
            </div>
          )}

          {/* مودل إنشاء العقد */}
          {showContractModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6" dir="rtl">
                <h3 className="text-xl font-bold mb-4 text-indigo-800">إنشاء نموذج عقد عمل</h3>
                
                <div className="mb-4">
                  <label className="block font-semibold mb-2">مدة العقد (بالأشهر)</label>
                  <input
                    type="number"
                    min="1"
                    value={contractDuration}
                    onChange={(e) => setContractDuration(parseInt(e.target.value) || 12)}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">معلومات العقد:</p>
                  <p>اسم الموظف: {formData.name || "____"}</p>
                  <p>الوظيفة: {formData.position || "____"}</p>
                  <p>القسم: {departments.find(d => d.id === parseInt(formData.department_id))?.name || "____"}</p>
                  <p>الراتب الأساسي: {formData.base_salary || "____"}</p>
                  <p>تاريخ التعيين: {formData.hire_date || "____"}</p>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowContractModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                  <button 
                    onClick={() => {
                      // Calculate totals
                      const baseSalary = parseFloat(formData.base_salary) || 0;
                      const positionAllowance = parseFloat(formData.position_allowance) || 0;
                      const allowancesTotal = formData.allowances.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
                      const incentivesTotal = formData.incentives.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0);
                      const totalSalary = baseSalary + positionAllowance + allowancesTotal + incentivesTotal;
                      
                      const contractHTML = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>عقد عمل</title>
    <style>
        body { font-family: 'Tahoma', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 10px; }
        h1 { margin: 0; color: #1a1a1a; }
        h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .section { margin: 20px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { padding: 8px; background: #f9f9f9; border-radius: 4px; }
        .label { font-weight: bold; color: #555; }
        .salary-section { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .total { font-size: 18px; font-weight: bold; color: #2e7d32; }
        .terms { background: #fff3e0; padding: 15px; border-radius: 8px; }
        .terms ul { padding-right: 20px; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 10px; }
        .seal { width: 120px; height: 120px; border: 3px solid #666; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 20px auto; color: #666; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏢</div>
        <h1>نظام جودة HR</h1>
        <p>عقد عمل توظيفي</p>
    </div>

    <div class="section">
        <h2>بيانات المؤسسة</h2>
        <div class="info-grid">
            <div class="info-item"><span class="label">اسم المؤسسة:</span> ____________________</div>
            <div class="info-item"><span class="label">السجل التجاري:</span> ____________________</div>
            <div class="info-item"><span class="label">العنوان:</span> ____________________</div>
            <div class="info-item"><span class="label">الهاتف:</span> ____________________</div>
        </div>
    </div>

    <div class="section">
        <h2>بيانات الموظف</h2>
        <div class="info-grid">
            <div class="info-item"><span class="label">الاسم:</span> ${formData.name || "_______"}</div>
            <div class="info-item"><span class="label">رقم الملف:</span> ${formData.file_number || "_______"}</div>
            <div class="info-item"><span class="label">الوظيفة:</span> ${formData.position || "_______"}</div>
            <div class="info-item"><span class="label">الدرجة الوظيفية:</span> ${formData.position_grade || "_______"}</div>
            <div class="info-item"><span class="label">القسم:</span> ${departments.find(d => d.id === parseInt(formData.department_id))?.name || "_______"}</div>
            <div class="info-item"><span class="label">تاريخ التعيين:</span> ${formData.hire_date || "_______"}</div>
            <div class="info-item"><span class="label">الهاتف:</span> ${formData.phone || "_______"}</div>
            <div class="info-item"><span class="label">البريد الإلكتروني:</span> ${formData.email || "_______"}</div>
        </div>
    </div>

    <div class="section salary-section">
        <h2>الراتب والمزايا المالية</h2>
        <div class="info-grid">
            <div class="info-item"><span class="label">الراتب الأساسي:</span> ${formData.base_salary || "0"} ريال</div>
            <div class="info-item"><span class="label">بدل الدرجة:</span> ${formData.position_allowance || "0"} ريال</div>
            <div class="info-item"><span class="label">بدلات أخرى:</span> ${allowancesTotal} ريال</div>
            <div class="info-item"><span class="label">الحوافز:</span> ${incentivesTotal} ريال</div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
            <span class="total">الإجمالي: ${totalSalary} ريال/شهر</span>
        </div>
    </div>

    <div class="section terms">
        <h2>شروط العقد</h2>
        <ul>
            <li>مدة العقد: ${contractDuration} شهر</li>
            <li>تاريخ بدء العقد: ${formData.hire_date || "_______"}</li>
            <li>فترة التجربة: 3 أشهر</li>
            <li>ميعاد صرف الراتب: آخر كل شهر ميلادي</li>
            <li>يحق لأي من الطرفين إنهاء العقد بإخطار كتابي قبل 30 يوم</li>
            <li>遵守 نظام العمل ولوائحه الداخلية</li>
        </ul>
    </div>

    <div class="section">
        <h2>التوقيعات</h2>
        <div class="signatures">
            <div class="signature-box">
                <p>توقيع الموظف</p>
                <p>الاسم: ________________</p>
                <p>التاريخ: ____________</p>
            </div>
            <div class="signature-box">
                <p>توقيع المؤسسة</p>
                <p>الختم:</p>
                <div class="seal">ختم المؤسسة</div>
                <p>التاريخ: ____________</p>
            </div>
        </div>
    </div>

    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
        <p>تم إنشاء هذا العقد بواسطة نظام جودة HR - ${new Date().toLocaleDateString('ar-SA')}</p>
    </div>
</body>
</html>`;
                      
                      // Create and download HTML file (can be printed to PDF)
                      const blob = new Blob([contractHTML], { type: "text/html;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `contract_${formData.name || 'employee'}_${new Date().toISOString().split('T')[0]}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("✅ تم إنشاء نموذج العقد بنجاح");
                      setShowContractModal(false);
                    }} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded"
                  >
                    إنشاء العقد
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودل التأمين */}
          {showInsuranceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
                <h3 className="text-xl font-bold mb-4 text-yellow-800">إضافة تأمين</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">نوع التأمين</label>
                    <select
                      value={newInsurance.type}
                      onChange={(e) => setNewInsurance({ ...newInsurance, type: e.target.value })}
                      className="w-full border p-2 rounded"
                    >
                      {insuranceTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">القيمة الشهرية</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInsurance.amount}
                      onChange={(e) => setNewInsurance({ ...newInsurance, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="أدخل القيمة"
                      className="w-full border p-2 rounded"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowInsuranceModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                  <button onClick={addInsurance} className="bg-yellow-600 text-white px-4 py-2 rounded">إضافة</button>
                </div>
              </div>
            </div>
          )}

          {/* مودل العهد */}
          {showAssetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
                <h3 className="text-xl font-bold mb-4 text-purple-800">إضافة عهدة</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold mb-1">اسم العهدة</label>
                    <input
                      type="text"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                      placeholder="مثال: لابتوب، هاتف، جهاز..."
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">الوصف</label>
                    <input
                      type="text"
                      value={newAsset.description}
                      onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                      placeholder="وصف تفصيلي"
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">نوع العهدة</label>
                    <select
                      value={newAsset.type}
                      onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                      className="w-full border p-2 rounded"
                    >
                      <option value="fixed">عهدة ثابتة</option>
                      <option value="movable">عهدة منقولة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">القيمة (جنيه سوداني)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAsset.value}
                      onChange={(e) => setNewAsset({ ...newAsset, value: parseFloat(e.target.value) || 0 })}
                      placeholder="القيمة التقديرية"
                      className="w-full border p-2 rounded"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAssetModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                  <button onClick={addAsset} className="bg-purple-600 text-white px-4 py-2 rounded">إضافة</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}