import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { registerUserOnDevice } from "../services/fingerprintApi";
import Sidebar from "../components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AddEmployee() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractDuration, setContractDuration] = useState(24);

  const [formData, setFormData] = useState({
    file_number: "",
    name: "",
    email: "",
    phone: "",
    position: "",
    position_grade: "",
    position_allowance: "",
    department_id: "",
    attendance_device_id: "",
    device_user_id: "",
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

  const [newAllowance, setNewAllowance] = useState({ type: "transport", value: 0 });
  const [newIncentive, setNewIncentive] = useState({ type: "bonus", value: 0 });

  const addAllowance = () => {
    if (newAllowance.value > 0) {
      setFormData(prev => ({ ...prev, allowances: [...prev.allowances, { ...newAllowance }] }));
      setNewAllowance({ type: "transport", value: 0 });
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
        "device_user_id",
        "hire_date",
        "base_salary",
        "address",
        "notes",
        "status",
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
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">إضافة موظف جديد</h1>
          <button
            onClick={() => navigate("/employees")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-lg"
          >
            ⬅ رجوع للقائمة
          </button>
        </header>

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">نموذج إضافة موظف</span>
        </div>

        <main className="flex-1 p-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg rounded-xl p-8 max-w-2xl mx-auto space-y-6"
          >
            {/* رقم الملف */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">رقم الملف</label>
              <input
                type="text"
                name="file_number"
                value={formData.file_number}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الاسم */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الاسم</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
                required
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">البريد الإلكتروني</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الهاتف */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الهاتف</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الوظيفة */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الوظيفة</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الدرجة وبدل الدرجة */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-semibold text-gray-700">الدرجة</label>
                <input
                  type="text"
                  name="position_grade"
                  value={formData.position_grade}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-lg"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700">بدل الدرجة</label>
                <input
                  type="number"
                  step="0.01"
                  name="position_allowance"
                  value={formData.position_allowance}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-lg"
                />
              </div>
            </div>

            {/* القسم */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">القسم</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
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

            {/* اختيار جهاز البصمة من القائمة */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">جهاز البصمة</label>
              <div className="flex gap-2">
                <select
                  name="attendance_device_id"
                  value={formData.attendance_device_id}
                  onChange={handleChange}
                  className="flex-1 border rounded-lg px-3 py-2 text-lg"
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
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  + إضافة بصمة
                </button>
              </div>
              {formData.fingerprints.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.fingerprints.map((fp, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                      <span>بصمة رقم: {fp.finger_id} - {fingerPositions.find(p => p.value === fp.finger_position)?.label} - {fingerOptions.find(f => f.value === fp.finger)?.label}</span>
                      <button type="button" onClick={() => removeFingerprint(idx)} className="text-red-500">حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* رقم المستخدم على الجهاز */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">رقم المستخدم على الجهاز</label>
              <input
                type="text"
                name="device_user_id"
                value={formData.device_user_id}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* تاريخ التعيين */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">تاريخ التعيين</label>
              <input
                type="date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* الراتب الأساسي والبدلات */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-lg font-semibold text-gray-700 mb-3">الراتب والبدلات</label>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">الراتب الأساسي</label>
                  <input
                    type="number"
                    step="0.01"
                    name="base_salary"
                    value={formData.base_salary}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">بدل الدرجة</label>
                  <input
                    type="number"
                    step="0.01"
                    name="position_allowance"
                    value={formData.position_allowance}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-lg"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSalaryModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                + إضافة بدلات وحوافز
              </button>
              
              {(formData.allowances.length > 0 || formData.incentives.length > 0) && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">البدلات المضافة:</h4>
                  <div className="space-y-1 text-sm">
                    {formData.allowances.map((a, idx) => (
                      <div key={`a-${idx}`} className="flex justify-between bg-white p-2 rounded">
                        <span>{a.type === 'transport' ? 'بدل نقل' : a.type === 'food' ? 'بدل طعام' : a.type === 'housing' ? 'بدل سكن' : a.type === 'phone' ? 'بدل هاتف' : 'بدل أخرى'}</span>
                        <span className="font-medium text-green-600">{parseFloat(a.value).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                    {formData.incentives.map((i, idx) => (
                      <div key={`i-${idx}`} className="flex justify-between bg-white p-2 rounded">
                        <span>{i.type === 'bonus' ? 'مكافأة' : i.type === 'allowance' ? 'بدل' : i.type === 'commission' ? 'عمولة' : i.type === 'performance' ? 'حافز أداء' : 'أخرى'}</span>
                        <span className="font-medium text-blue-600">{parseFloat(i.value).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
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

            {/* العنوان */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">العنوان</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* رفع صورة شخصية */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">الصورة الشخصية</label>
              <input
                type="file"
                name="profile_photo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* رفع السيرة الذاتية */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">السيرة الذاتية (CV)</label>
              <input
                type="file"
                name="cv"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
            </div>

            {/* رفع العقد الموقّع */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">العقد الموقّع</label>
              <input
                type="file"
                name="contract_file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
              />
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                📄 إنشاء نموذج عقد
              </button>
            </div>

            {/* ملاحظات والحالة */}
            <div>
              <label className="block text-lg font-semibold text-gray-700">ملاحظات</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-lg"
                rows="3"
              />
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-lg ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {loading ? "جاري الحفظ..." : "✅ حفظ"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/employees")}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 text-lg"
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
                <h3 className="text-xl font-bold mb-4 text-indigo-800">إضافة بدلات وحافز</h3>
                
                <div className="mb-4 border-b pb-4">
                  <h4 className="font-semibold mb-2">البدلات</h4>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newAllowance.type}
                      onChange={(e) => setNewAllowance({ ...newAllowance, type: e.target.value })}
                      className="border p-2 rounded flex-1"
                    >
                      <option value="transport">بدل نقل</option>
                      <option value="food">بدل طعام</option>
                      <option value="housing">بدل سكن</option>
                      <option value="phone">بدل هاتف</option>
                      <option value="other">بدل أخرى</option>
                    </select>
                    <input
                      type="number"
                      value={newAllowance.value}
                      onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })}
                      placeholder="القيمة"
                      className="border p-2 rounded w-32"
                    />
                    <button onClick={addAllowance} className="bg-blue-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {formData.allowances.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span>{a.type === 'transport' ? 'بدل نقل' : a.type === 'food' ? 'بدل طعام' : a.type === 'housing' ? 'بدل سكن' : a.type === 'phone' ? 'بدل هاتف' : 'بدل أخرى'}: {a.value}</span>
                        <button type="button" onClick={() => removeAllowance(idx)} className="text-red-500">حذف</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">الحوافز</h4>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newIncentive.type}
                      onChange={(e) => setNewIncentive({ ...newIncentive, type: e.target.value })}
                      className="border p-2 rounded flex-1"
                    >
                      <option value="bonus">مكافأة</option>
                      <option value="allowance">بدل</option>
                      <option value="commission">عمولة</option>
                      <option value="performance">حافز أداء</option>
                      <option value="other">أخرى</option>
                    </select>
                    <input
                      type="number"
                      value={newIncentive.value}
                      onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })}
                      placeholder="القيمة"
                      className="border p-2 rounded w-32"
                    />
                    <button onClick={addIncentive} className="bg-blue-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {formData.incentives.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span>{i.type === 'bonus' ? 'مكافأة' : i.type === 'allowance' ? 'بدل' : i.type === 'commission' ? 'عمولة' : i.type === 'performance' ? 'حافز أداء' : 'أخرى'}: {i.value}</span>
                        <button type="button" onClick={() => removeIncentive(idx)} className="text-red-500">حذف</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowSalaryModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إغلاق</button>
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
        </main>
      </div>
    </div>
  );
}