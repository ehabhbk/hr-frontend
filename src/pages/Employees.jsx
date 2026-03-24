import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { registerUserOnDevice, syncDevice } from "../services/fingerprintApi";
import Sidebar from "../components/Sidebar";
import CountUp from "react-countup";
import AOS from "aos";
import "aos/dist/aos.css";
import { ToastContainer, toast } from "react-toastify";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar");
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    position_grade: "",
    position_allowance: "",
    department_id: "",
    attendance_device_id: "",
    device_user_id: "",
    base_salary: "",
    address: "",
    notes: "",
    profile_photo: null,
    cv: null,
    contract_file: null,
    allowances: [],
    incentives: [],
  });
  const [newAllowance, setNewAllowance] = useState({ type: "transport", value: 0 });
  const [newIncentive, setNewIncentive] = useState({ type: "bonus", value: 0 });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = () => {
    api.get("/employees", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setEmployees(res.data.data))
      .catch((err) => console.error(err));
    
    api.get("/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.error(err));
    
    api.get("/attendance-device", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDevices(res.data.data || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  // Open edit modal
  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      position_grade: employee.position_grade || "",
      position_allowance: employee.position_allowance || "",
      department_id: employee.department_id || "",
      attendance_device_id: employee.attendance_device_id || "",
      device_user_id: employee.device_user_id || "",
      base_salary: employee.base_salary || "",
      address: employee.address || "",
      notes: employee.notes || "",
      profile_photo: null,
      cv: null,
      contract_file: null,
      allowances: [],
      incentives: [],
    });
    setShowEditModal(true);
  };

  // Handle edit form change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file change
  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: files && files[0] ? files[0] : null }));
  };

  // Add allowance
  const addEditAllowance = () => {
    if (newAllowance.value > 0) {
      setEditFormData(prev => ({ ...prev, allowances: [...prev.allowances, { ...newAllowance }] }));
      setNewAllowance({ type: "transport", value: 0 });
    }
  };

  // Remove allowance
  const removeEditAllowance = (index) => {
    setEditFormData(prev => ({ ...prev, allowances: prev.allowances.filter((_, i) => i !== index) }));
  };

  // Add incentive
  const addEditIncentive = () => {
    if (newIncentive.value > 0) {
      setEditFormData(prev => ({ ...prev, incentives: [...prev.incentives, { ...newIncentive }] }));
      setNewIncentive({ type: "bonus", value: 0 });
    }
  };

  // Remove incentive
  const removeEditIncentive = (index) => {
    setEditFormData(prev => ({ ...prev, incentives: prev.incentives.filter((_, i) => i !== index) }));
  };

  // Submit edit form
  const submitEdit = async () => {
    setEditLoading(true);
    try {
      const data = new FormData();
      Object.keys(editFormData).forEach(key => {
        if (editFormData[key] !== null && editFormData[key] !== "") {
          if (key === "allowances" || key === "incentives") {
            data.append(key, JSON.stringify(editFormData[key]));
          } else if (editFormData[key] instanceof File) {
            data.append(key, editFormData[key]);
          } else {
            data.append(key, editFormData[key]);
          }
        }
      });

      await api.post(`/employees/${editingEmployee.id}?_method=PUT`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("✅ تم تحديث بيانات الموظف بنجاح");
      setShowEditModal(false);
      loadData();
    } catch (err) {
      toast.error("❌ فشل تحديث البيانات");
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  // Register fingerprint on device
  const registerFingerprint = async () => {
    if (!editFormData.device_user_id) {
      toast.error("يرجى إدخال رقم البصمة");
      return;
    }
    if (!editFormData.attendance_device_id) {
      toast.error("يرجى اختيار جهاز البصمة");
      return;
    }

    try {
      await registerUserOnDevice(editFormData.attendance_device_id, {
        user_id: editFormData.device_user_id,
        name: editFormData.name,
        fingerprints: [{ finger_id: 1, template: "placeholder" }]
      });
      // Sync attendance logs after registration
      try {
        await syncDevice(editFormData.attendance_device_id);
      } catch (syncErr) {
        console.warn("Auto-sync failed:", syncErr);
      }
      toast.success("✅ تم تسجيل البصمة على الجهاز");
    } catch (error) {
      toast.error("⚠️ فشل التواصل مع الجهاز");
    }
  };

  // تحديد لون البطاقة حسب الحالة
  const getCardColor = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-blue-100";       // نشط
    if (normalized.includes("terminated")) return "bg-purple-100"; // مفصول
    if (normalized.includes("warning")) return "bg-yellow-100";    // إنذار
    if (normalized.includes("vacation")) return "bg-teal-100";     // في إجازة (لون مختلف عن نشط)
    return "bg-gray-100";                                          // افتراضي
  };

  // فلترة الموظفين حسب البحث والحالة
  const filteredEmployees = employees.filter((emp) => {
    const name = (emp.name || "").toLowerCase();
    const position = (emp.position || "").toLowerCase();
    const department = (emp.department?.name || "").toLowerCase();
    const normalized = (emp.status || "").toLowerCase();

    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      position.includes(searchTerm.toLowerCase()) ||
      department.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : normalized.includes(statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar ثابت */}
      <Sidebar sticky />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar الأول ثابت */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-xl font-semibold text-indigo-800">قائمة الموظفين</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-3 focus:outline-none"
            >
              <img
                src={avatar}
                alt="User Avatar"
                className="w-10 h-10 rounded-full border"
              />
              <span className="text-gray-700 font-medium">{username}</span>
            </button>

            {openMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg border">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/profilesettings");
                  }}
                  className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الملف الشخصي
                </button>
                <button
                  type="button"
                  className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  التقارير
                </button>
                <button
                  type="button"
                  className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الإعدادات
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Toolbar الثاني ثابت تحت الـ Navbar */}
        <div className="bg-gray-50 shadow-md p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 z-40">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="🔍 بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-lg px-3 py-1 w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-1"
            >
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="terminated">مفصول</option>
              <option value="warning">إنذار</option>
              <option value="vacation">في إجازة</option> {/* الحالة الجديدة */}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-indigo-800 font-bold text-lg flex items-center gap-2">
              👨‍💼 عدد الموظفين:{" "}
              <CountUp start={0} end={filteredEmployees.length} duration={1.5} />
            </span>
            <button
              onClick={() => navigate("/add-employee")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
            >
              ➕ إضافة موظف
            </button>
          </div>
        </div>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-6">
          {/* شبكة بطاقات الموظفين */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                data-aos="fade-up"
                className={`${getCardColor(emp.status)} shadow-md rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transform transition hover:scale-105`}
              >
                <img
                  src={emp.profile_photo_url || emp.profile_photo || "/default-avatar.png"}
                  alt={emp.name}
                  className="w-24 h-24 rounded-full border mb-4 object-cover"
                />
                <h2 className="text-lg font-bold text-gray-800">{emp.name}</h2>
                <p className="text-gray-600">{emp.position}</p>
                <p className="text-gray-600">القسم: {emp.department?.name || "غير محدد"}</p>
                <p className="text-green-600 font-semibold">💰 {emp.total_salary || emp.salary}</p>
                <p className="text-gray-600">
                  الحالة: {emp.status === "terminated"
                    ? "مفصول"
                    : emp.status === "warning"
                    ? "إنذار"
                    : emp.status === "vacation"
                    ? "🌴 في إجازة"
                    : "نشط"}
                </p>
                {emp.warnings_count > 0 && (
                  <p className="text-red-500 text-sm">⚠️ {emp.warnings_count} إنذار</p>
                )}
                {emp.leave_count > 0 && (
                  <p className="text-blue-500 text-sm">📅 {emp.leave_count} إجازة</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/employee/${emp.id}`)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                  >
                    التفاصيل
                  </button>
                  <button
                    onClick={() => openEditModal(emp)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                  >
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* مودل تعديل الموظف */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-auto">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 m-4" dir="rtl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-indigo-800">تعديل بيانات الموظف</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-2">
                {/* الاسم */}
                <div>
                  <label className="block text-sm font-semibold mb-1">الاسم</label>
                  <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* البريد الإلكتروني */}
                <div>
                  <label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label>
                  <input type="email" name="email" value={editFormData.email} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* الهاتف */}
                <div>
                  <label className="block text-sm font-semibold mb-1">الهاتف</label>
                  <input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* الوظيفة */}
                <div>
                  <label className="block text-sm font-semibold mb-1">الوظيفة</label>
                  <input type="text" name="position" value={editFormData.position} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* الدرجة الوظيفية */}
                <div>
                  <label className="block text-sm font-semibold mb-1">الدرجة الوظيفية</label>
                  <input type="text" name="position_grade" value={editFormData.position_grade} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* بدل الدرجة */}
                <div>
                  <label className="block text-sm font-semibold mb-1">بدل الدرجة</label>
                  <input type="number" name="position_allowance" value={editFormData.position_allowance} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* القسم */}
                <div>
                  <label className="block text-sm font-semibold mb-1">القسم</label>
                  <select name="department_id" value={editFormData.department_id} onChange={handleEditChange} className="w-full border rounded p-2">
                    <option value="">اختر القسم</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* الراتب الأساسي */}
                <div>
                  <label className="block text-sm font-semibold mb-1">الراتب الأساسي</label>
                  <input type="number" name="base_salary" value={editFormData.base_salary} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* جهاز البصمة */}
                <div>
                  <label className="block text-sm font-semibold mb-1">جهاز البصمة</label>
                  <select name="attendance_device_id" value={editFormData.attendance_device_id} onChange={handleEditChange} className="w-full border rounded p-2">
                    <option value="">اختر الجهاز</option>
                    {devices.map(dev => (
                      <option key={dev.id} value={dev.id}>{dev.name || `جهاز #${dev.id}`}</option>
                    ))}
                  </select>
                </div>

                {/* رقم المستخدم على الجهاز */}
                <div>
                  <label className="block text-sm font-semibold mb-1">رقم البصمة على الجهاز</label>
                  <div className="flex gap-2">
                    <input type="text" name="device_user_id" value={editFormData.device_user_id} onChange={handleEditChange} className="w-full border rounded p-2" />
                    <button onClick={registerFingerprint} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm">تسجيل</button>
                  </div>
                </div>

                {/* العنوان */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">العنوان</label>
                  <input type="text" name="address" value={editFormData.address} onChange={handleEditChange} className="w-full border rounded p-2" />
                </div>

                {/* البدلات */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <label className="block text-sm font-semibold mb-2">البدلات</label>
                  <div className="flex gap-2 mb-2">
                    <select value={newAllowance.type} onChange={(e) => setNewAllowance({ ...newAllowance, type: e.target.value })} className="border p-2 rounded flex-1">
                      <option value="transport">بدل نقل</option>
                      <option value="food">بدل طعام</option>
                      <option value="housing">بدل سكن</option>
                      <option value="phone">بدل هاتف</option>
                      <option value="other">أخرى</option>
                    </select>
                    <input type="number" value={newAllowance.value} onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })} placeholder="القيمة" className="border p-2 rounded w-24" />
                    <button onClick={addEditAllowance} className="bg-blue-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1">
                    {editFormData.allowances.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span>{a.type === 'transport' ? 'بدل نقل' : a.type === 'food' ? 'بدل طعام' : a.type === 'housing' ? 'بدل سكن' : a.type === 'phone' ? 'بدل هاتف' : 'أخرى'}: {a.value}</span>
                        <button onClick={() => removeEditAllowance(idx)} className="text-red-500">حذف</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* الحوافز */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <label className="block text-sm font-semibold mb-2">الحوافز</label>
                  <div className="flex gap-2 mb-2">
                    <select value={newIncentive.type} onChange={(e) => setNewIncentive({ ...newIncentive, type: e.target.value })} className="border p-2 rounded flex-1">
                      <option value="bonus">مكافأة</option>
                      <option value="allowance">بدل</option>
                      <option value="commission">عمولة</option>
                      <option value="performance">حافز أداء</option>
                      <option value="other">أخرى</option>
                    </select>
                    <input type="number" value={newIncentive.value} onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })} placeholder="القيمة" className="border p-2 rounded w-24" />
                    <button onClick={addEditIncentive} className="bg-blue-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1">
                    {editFormData.incentives.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                        <span>{i.type === 'bonus' ? 'مكافأة' : i.type === 'allowance' ? 'بدل' : i.type === 'commission' ? 'عمولة' : i.type === 'performance' ? 'حافز أداء' : 'أخرى'}: {i.value}</span>
                        <button onClick={() => removeEditIncentive(idx)} className="text-red-500">حذف</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* رفع صورة */}
                <div>
                  <label className="block text-sm font-semibold mb-1">تغيير الصورة</label>
                  <input type="file" name="profile_photo" accept="image/*" onChange={handleEditFileChange} className="w-full border rounded p-2" />
                </div>

                {/* رفع السيرة الذاتية */}
                <div>
                  <label className="block text-sm font-semibold mb-1">تغيير السيرة الذاتية</label>
                  <input type="file" name="cv" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border rounded p-2" />
                </div>

                {/* رفع العقد */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">تغيير العقد</label>
                  <input type="file" name="contract_file" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border rounded p-2" />
                </div>

                {/* ملاحظات */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">ملاحظات</label>
                  <textarea name="notes" value={editFormData.notes} onChange={handleEditChange} className="w-full border rounded p-2" rows="2" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button onClick={() => setShowEditModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                <button onClick={submitEdit} disabled={editLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  {editLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}