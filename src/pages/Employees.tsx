import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { getStorageUrl } from "../services/api";
import {
  registerUserOnDevice,
  syncDevice,
  saveFingerprintToDatabase,
  deleteFingerprintFromDatabase,
  getEmployeeFingerprints,
  enrollFingerprintAuto,
  enrollFaceAuto,
  checkEnrollmentStatus,
  registerUserManual,
} from "../services/fingerprintApi";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CountUp from "react-countup";
import AOS from "aos";
import "aos/dist/aos.css";
import { ToastContainer, toast } from "react-toastify";
import { getBankOptions } from "../config/banks";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [devices, setDevices] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Check permissions
  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch {
      return [];
    }
  }, []);

  const canEditEmployee = permissions.includes('*') || permissions.includes('employees.edit');
  const canDeleteEmployee = permissions.includes('*') || permissions.includes('employees.delete');
  const canCreateEmployee = permissions.includes('*') || permissions.includes('employees.create');

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    file_number: "",
    name: "",
    email: "",
    phone: "",
    phone_country_code: "+249",
    gender: "",
    birth_date: "",
    id_number: "",
    marital_status: "",
    position: "",
    position_grade: "",
    position_allowance: "",
    department_id: "",
    attendance_device_id: "",
    work_shift_id: "",
    hire_date: "",
    base_salary: "",
    address: "",
    notes: "",
    status: "active",
    profile_photo: null,
    cv: null,
    contract_file: null,
    insurance_type: "none",
    insurance_amount: 0,
    bank_name: "",
    bank_account: "",
    allowances: [],
    incentives: [],
    assets: [],
  });
  const [newAllowance, setNewAllowance] = useState({ type: "transport", custom_name: "", value: 0 });
  const [newIncentive, setNewIncentive] = useState({ type: "bonus", custom_name: "", value: 0 });
  const [showCustomAllowanceModal, setShowCustomAllowanceModal] = useState(false);
  const [showCustomIncentiveModal, setShowCustomIncentiveModal] = useState(false);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [showEnrollProgress, setShowEnrollProgress] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState({ status: 'idle', message: '' });
  const [enrollMode, setEnrollMode] = useState('auto');
  const [enrollType, setEnrollType] = useState('fingerprint');
  const enrollTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (enrollTimeoutRef.current) clearTimeout(enrollTimeoutRef.current);
    };
  }, []);
  const [customAllowanceName, setCustomAllowanceName] = useState("");
  const [customIncentiveName, setCustomIncentiveName] = useState("");
  const [newAsset, setNewAsset] = useState({ name: "", description: "", type: "fixed", value: 0 });
  const [customBanks, setCustomBanks] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [newFingerprint, setNewFingerprint] = useState({ finger_id: "", finger_position: "right", finger: "thumb" });

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

  const fingerPositionToId = (position, finger) => {
    const rightFingers = { thumb: 0, index: 1, middle: 2, ring: 3, pinky: 4 };
    const leftFingers = { thumb: 5, index: 6, middle: 7, ring: 8, pinky: 9 };
    if (position === "right") {
      return rightFingers[finger] ?? 0;
    } else {
      return leftFingers[finger] ?? 5;
    }
  };

  const addEditFingerprint = async () => {
    if (!newFingerprint.finger_id) {
      toast.error("يرجى إدخال رقم البصمة");
      return;
    }
    if (!editFormData.attendance_device_id) {
      toast.error("يرجى اختيار جهاز البصمة أولاً");
      return;
    }

    // التحقق من تكرار رقم البصمة
    const duplicateExists = (editFormData.fingerprints || []).some(
      fp => fp.finger_id === newFingerprint.finger_id
    );
    if (duplicateExists) {
      toast.error(`⚠️ رقم البصمة ${newFingerprint.finger_id} مضاف مسبقاً لهذا الموظف`);
      return;
    }

    const fingerId = fingerPositionToId(newFingerprint.finger_position, newFingerprint.finger);
    const userName = editFormData.name || newFingerprint.finger_id;

    setEditLoading(true);
    setShowFingerprintModal(false);

    const saveAfterEnroll = async () => {
      await api.post(`/employees/${editingEmployee.id}/fingerprint`, {
        finger_id: newFingerprint.finger_id,
        finger_position: newFingerprint.finger_position,
        finger: newFingerprint.finger,
        attendance_device_id: editFormData.attendance_device_id,
        type: enrollType,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await api.put(`/employees/${editingEmployee.id}`, {
        device_user_id: newFingerprint.finger_id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const newFp = {
        ...newFingerprint,
        device_finger_id: fingerId,
        attendance_device_id: editFormData.attendance_device_id,
        type: enrollType,
      };
      setEditFormData(prev => ({ ...prev, fingerprints: [...(prev.fingerprints || []), newFp], device_user_id: newFingerprint.finger_id }));
      setNewFingerprint({ finger_id: "", finger_position: "right", finger: "thumb" });
    };

    try {
      if (enrollMode === 'auto') {
        // === AUTO ENROLLMENT ===
        setShowEnrollProgress(true);
        setEnrollProgress({ status: 'connecting', message: 'جاري الاتصال بالجهاز...' });

        let enrollResult;
        if (enrollType === 'face') {
          enrollResult = await enrollFaceAuto(editFormData.attendance_device_id, {
            user_id: newFingerprint.finger_id,
            name: userName,
          });
        } else {
          enrollResult = await enrollFingerprintAuto(editFormData.attendance_device_id, {
            user_id: newFingerprint.finger_id,
            name: userName,
            finger_id: fingerId,
          });
        }

        if (enrollResult.success) {
          if (enrollResult.enrolled_on_device) {
            setEnrollProgress({ status: 'success', message: '✅ ' + (enrollResult.message || 'تم التسجيل بنجاح!') });
            await saveAfterEnroll();
            setTimeout(() => setShowEnrollProgress(false), 1500);
          } else if (enrollResult.manual_required) {
            setEnrollProgress({
              status: 'waiting',
              message: enrollResult.message,
              finger_id: newFingerprint.finger_id,
              enrollType,
              fingerId,
              saveAfterEnroll: () => saveAfterEnroll(),
            });
            enrollTimeoutRef.current = setTimeout(async () => {
              try {
                const checkResult = await checkEnrollmentStatus(editFormData.attendance_device_id, {
                  user_id: newFingerprint.finger_id,
                  finger_id: enrollType === 'face' ? null : fingerId,
                });
                if (checkResult.enrolled) {
                  setEnrollProgress({ status: 'success', message: '✅ تم تسجيل البصمة بنجاح!' });
                  await saveAfterEnroll();
                  setTimeout(() => setShowEnrollProgress(false), 1500);
                } else {
                  setEnrollProgress({ status: 'timeout', message: 'لم يتم رصد البصمة على الجهاز.' });
                }
              } catch (e) {
                setEnrollProgress({ status: 'timeout', message: 'تعذر التحقق من الجهاز.' });
              }
            }, 30000);
          } else {
            setEnrollProgress({
              status: 'waiting',
              message: enrollResult.message || 'يرجى وضع الإصبع على الجهاز...',
              finger_id: newFingerprint.finger_id,
              enrollType,
              fingerId,
              saveAfterEnroll: () => saveAfterEnroll(),
            });
            enrollTimeoutRef.current = setTimeout(async () => {
              try {
                const checkResult = await checkEnrollmentStatus(editFormData.attendance_device_id, {
                  user_id: newFingerprint.finger_id,
                  finger_id: enrollType === 'face' ? null : fingerId,
                });
                if (checkResult.enrolled) {
                  setEnrollProgress({ status: 'success', message: '✅ تم تسجيل البصمة بنجاح!' });
                  await saveAfterEnroll();
                  setTimeout(() => setShowEnrollProgress(false), 1500);
                } else {
                  setEnrollProgress({ status: 'timeout', message: 'لم يتم رصد البصمة على الجهاز.' });
                }
              } catch (e) {
                setEnrollProgress({ status: 'timeout', message: 'تعذر التحقق من الجهاز.' });
              }
            }, 15000);
          }
        } else {
          setEnrollProgress({ status: 'error', message: enrollResult.message || 'فشل بدء التسجيل على الجهاز' });
        }
      } else {
        // === MANUAL ENROLLMENT ===
        const result = await registerUserManual(editFormData.attendance_device_id, {
          user_id: newFingerprint.finger_id,
          name: userName,
        });

        if (result.success) {
          // Save to database
          await api.post(`/employees/${editingEmployee.id}/fingerprint`, {
            finger_id: newFingerprint.finger_id,
            finger_position: newFingerprint.finger_position,
            finger: newFingerprint.finger,
            attendance_device_id: editFormData.attendance_device_id,
            type: enrollType,
          }, { headers: { Authorization: `Bearer ${token}` } });

          await api.put(`/employees/${editingEmployee.id}`, {
            device_user_id: newFingerprint.finger_id,
          }, { headers: { Authorization: `Bearer ${token}` } });

          const newFp = { 
            ...newFingerprint, 
            device_finger_id: fingerId,
            attendance_device_id: editFormData.attendance_device_id,
            type: enrollType,
          };
          setEditFormData(prev => ({ ...prev, fingerprints: [...(prev.fingerprints || []), newFp], device_user_id: newFingerprint.finger_id }));
          setNewFingerprint({ finger_id: "", finger_position: "right", finger: "thumb" });
          toast.success("✅ " + (result.message || "تم تسجيل البصمة على الجهاز وقاعدة البيانات"));
        } else {
          toast.warning("⚠️ " + (result.message || "لم يتم تسجيل البصمة"));
        }
      }
    } catch (error) {
      console.error("Fingerprint registration error:", error);
      const errMsg = error?.message || error?.raw?.response?.data?.message || "فشل التواصل مع الجهاز أو قاعدة البيانات";
      const errCode = error?.raw?.response?.data?.error || error?.details?.error;
      const errorMsg = errCode === 'duplicate_device_user_id'
        ? `⚠️ رقم البصمة ${newFingerprint.finger_id} مستخدم لموظف آخر`
        : `❌ ${errMsg}`;

      if (enrollMode === 'auto' && showEnrollProgress) {
        setEnrollProgress({ status: 'error', message: errorMsg });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      if (enrollMode !== 'auto') {
        setEditLoading(false);
      }
    }
  };

  const removeEditFingerprint = async (index) => {
    const fp = editFormData.fingerprints[index];
    
    if (fp && fp.id) {
      try {
        await api.delete(`/employees/${editingEmployee.id}/fingerprint/${fp.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to delete fingerprint from database:", err);
      }
    }
    
    setEditFormData(prev => ({ ...prev, fingerprints: prev.fingerprints.filter((_, i) => i !== index) }));
    toast.success("✅ تم حذف البصمة");
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = () => {
    console.log('Loading employees...');
    api.get("/employees", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        console.log('Employees API response:', res.data);
        setEmployees(res.data.data || res.data);
      })
      .catch((err) => console.error('Employees error:', err));
    
    api.get("/departments", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDepartments(res.data.data || []))
      .catch((err) => console.error(err));
    
    api.get("/attendance-device", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setDevices(res.data.data || []))
      .catch((err) => console.error(err));

    api.get("/banks/custom", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCustomBanks(res.data?.data || []))
      .catch(() => {});

    api.get("/work-shifts", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setShifts(res.data?.data || []))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // Open edit modal
  const openEditModal = async (employee) => {
    setEditingEmployee(employee);
    setEditFormData({
      file_number: employee.file_number || "",
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      phone_country_code: employee.phone_country_code || "+249",
      gender: employee.gender || "",
      birth_date: employee.birth_date || "",
      id_number: employee.id_number || "",
      marital_status: employee.marital_status || "",
      position: employee.position || "",
      position_grade: employee.position_grade || "",
      position_allowance: employee.position_allowance || "",
      department_id: employee.department_id || "",
      attendance_device_id: employee.attendance_device_id || "",
      work_shift_id: employee.work_shift_id || "",
      device_user_id: employee.device_user_id || "",
      hire_date: employee.hire_date || "",
      base_salary: employee.base_salary || "",
      address: employee.address || "",
      notes: employee.notes || "",
      status: employee.status || "active",
      profile_photo: null,
      cv: null,
      contract_file: null,
      insurance_type: employee.insurance_type || "none",
      insurance_amount: employee.insurance_amount || 0,
      bank_name: employee.bank_name || "",
      bank_account: employee.bank_account || "",
      allowances: employee.allowances || [],
      incentives: employee.incentives || [],
      assets: employee.assets || [],
      fingerprints: [],
    });

    // Load fingerprints from database
    try {
      const fpRes = await api.get(`/employees/${employee.id}/fingerprints`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fingerprints = fpRes.data?.data || fpRes.data || [];
      setEditFormData(prev => ({ ...prev, fingerprints }));
    } catch (err) {
      console.error("Failed to load fingerprints:", err);
      setEditFormData(prev => ({ ...prev, fingerprints: employee.fingerprints || [] }));
    }

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
      setNewAllowance({ type: "transport", custom_name: "", value: 0 });
    }
  };

  // Add custom allowance
  const addEditCustomAllowance = () => {
    if (customAllowanceName.trim() && newAllowance.value > 0) {
      setEditFormData(prev => ({ 
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

  // Add custom incentive
  const addEditCustomIncentive = () => {
    if (customIncentiveName.trim() && newIncentive.value > 0) {
      setEditFormData(prev => ({ 
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

  // Remove allowance
  const removeEditAllowance = (index) => {
    setEditFormData(prev => ({ ...prev, allowances: prev.allowances.filter((_, i) => i !== index) }));
  };

  // Add incentive
  const addEditIncentive = () => {
    if (newIncentive.value > 0) {
      setEditFormData(prev => ({ ...prev, incentives: [...prev.incentives, { ...newIncentive }] }));
      setNewIncentive({ type: "bonus", custom_name: "", value: 0 });
    }
  };

  // Remove incentive
  const removeEditIncentive = (index) => {
    setEditFormData(prev => ({ ...prev, incentives: prev.incentives.filter((_, i) => i !== index) }));
  };

  // Add asset
  const addEditAsset = () => {
    if (newAsset.name && newAsset.value > 0) {
      setEditFormData(prev => ({ ...prev, assets: [...prev.assets, { ...newAsset }] }));
      setNewAsset({ name: "", description: "", type: "fixed", value: 0 });
      toast.success("✅ تم إضافة العهدة");
    } else {
      toast.warning("⚠️ يرجى إدخال اسم العهدة وقيمتها");
    }
  };

  // Remove asset
  const removeEditAsset = (index) => {
    setEditFormData(prev => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) }));
  };

  // Submit edit form
  const submitEdit = async () => {
    setEditLoading(true);
    try {
      const data = new FormData();
      const scalarFields = [
        "file_number", "name", "email", "phone", "phone_country_code",
        "gender", "birth_date", "id_number", "marital_status",
        "position", "position_grade", "position_allowance", "department_id",
        "attendance_device_id", "work_shift_id", "hire_date", "base_salary", "address", "notes", "status",
        "insurance_type", "insurance_amount", "bank_name", "bank_account",
      ];

      scalarFields.forEach(key => {
        const val = editFormData[key];
        // Always send work_shift_id, even if empty (to allow clearing)
        if (key === 'work_shift_id') {
          data.append(key, val || "");
        } else if (val !== "" && val !== null && typeof val !== "undefined") {
          data.append(key, val);
        }
      });

      if (editFormData.allowances.length > 0) {
        data.append("allowances", JSON.stringify(editFormData.allowances));
      }
      if (editFormData.incentives.length > 0) {
        data.append("incentives", JSON.stringify(editFormData.incentives));
      }
      if (editFormData.assets.length > 0) {
        data.append("assets", JSON.stringify(editFormData.assets));
      }

      if (editFormData.profile_photo) {
        data.append("profile_photo", editFormData.profile_photo);
      }
      if (editFormData.cv) {
        data.append("cv", editFormData.cv);
      }
      if (editFormData.contract_file) {
        data.append("contract_file", editFormData.contract_file);
      }

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

  // Register fingerprint on device (kept for future use)
  const registerFingerprint = async () => {
    toast.info("⚠️ يتم تسجيل البصمة من صفحة الجهاز مباشرة");
  };

  // تحديد لون البطاقة حسب الحالة
  const getCardColor = (emp) => {
    if (emp.warnings_count > 0) return "bg-yellow-100 border-2 border-yellow-400";
    const normalized = (emp.status || "").toLowerCase();
    if (normalized.includes("active")) return "bg-green-100 border-2 border-green-400";
    if (normalized.includes("warning")) return "bg-yellow-100 border-2 border-yellow-400";
    if (normalized.includes("terminated")) return "bg-red-100 border-2 border-red-400";
    if (normalized.includes("vacation")) return "bg-teal-100 border-2 border-teal-400";
    return "bg-gray-100";
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
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="قائمة الموظفين" />

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
                className={`${getCardColor(emp)} shadow-md rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transform transition hover:scale-105`}
              >
                <img
                  src={getStorageUrl(emp.profile_photo) || "/default-avatar.svg"}
                  alt={emp.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow mb-4 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }}
                />
                <h2 className="text-lg font-bold text-gray-800">{emp.name}</h2>
                <p className="text-gray-600">{emp.position}</p>
                <p className="text-gray-600">القسم: {emp.department?.name || "غير محدد"}</p>
                <p className="text-green-600 font-semibold">💰 {emp.total_salary || emp.salary}</p>
                <p className={`font-semibold mt-1 ${
                  emp.warnings_count > 0 ? "text-yellow-600" :
                  emp.status === "terminated" ? "text-red-600" :
                  emp.status === "vacation" ? "text-teal-600" :
                  "text-green-600"
                }`}>
                  {emp.status === "terminated"
                    ? "مفصول"
                    : emp.status === "vacation"
                    ? "🌴 في إجازة"
                    : emp.warnings_count > 0
                    ? `⚠️ ${emp.warnings_count} إنذار`
                    : "نشط"}
                </p>
                {emp.leave_count > 0 && (
                  <p className="text-blue-500 text-sm">📅 {emp.leave_count} إجازة</p>
                )}
                {emp.total_advance_remaining > 0 && (
                  <p className="text-orange-500 text-sm font-semibold">💳 سلفة متبقي: {emp.total_advance_remaining}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/employee/${emp.id}`)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                  >
                    التفاصيل
                  </button>
                  {canEditEmployee && (
                    <button
                      onClick={() => openEditModal(emp)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                    >
                      تعديل
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* مودل تعديل الموظف */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-auto">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 m-4 max-h-[90vh] overflow-y-auto" dir="rtl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-indigo-800">✏️ تعديل بيانات الموظف: {editingEmployee?.name}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
              </div>

              {/* القسم الأول: البيانات الأساسية */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200 mb-4">
                <h4 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
                  <span>📋</span> البيانات الأساسية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">رقم الملف</label>
                    <input type="text" name="file_number" value={editFormData.file_number} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">الاسم <span className="text-red-500">*</span></label>
                    <input type="text" name="name" value={editFormData.name} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label>
                    <input type="email" name="email" value={editFormData.email} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">رقم الهاتف</label>
                    <div className="flex gap-2">
                      <select
                        value={editFormData.phone_country_code}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, phone_country_code: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-2 py-2 bg-gray-50"
                      >
                        <option value="+249">🇸🇩 +249</option>
                        <option value="+20">🇪🇬 +20</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input type="tel" name="phone" value={editFormData.phone} onChange={handleEditChange} placeholder="رقم الهاتف" className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1">العنوان</label>
                    <input type="text" name="address" value={editFormData.address} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  
                  {/* البيانات الشخصية */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">النوع</label>
                    <select name="gender" value={editFormData.gender} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">اختر النوع</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">تاريخ الميلاد</label>
                    <input type="date" name="birth_date" value={editFormData.birth_date} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">رقم الهوية</label>
                    <input type="text" name="id_number" value={editFormData.id_number} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="رقم الهوية الوطنية" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">الحالة الاجتماعية</label>
                    <select name="marital_status" value={editFormData.marital_status} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">اختر الحالة</option>
                      <option value="single">أعزب/عزباء</option>
                      <option value="married">متزوج/متزوجة</option>
                      <option value="divorced">مطلق/مطلقة</option>
                      <option value="widowed">أرمل/أرملة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* القسم الثاني: بيانات الوظيفة */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-xl border border-green-200 mb-4">
                <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
                  <span>💼</span> بيانات الوظيفة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">المسمى الوظيفي</label>
                    <input type="text" name="position" value={editFormData.position} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">الدرجة الوظيفية</label>
                    <input type="text" name="position_grade" value={editFormData.position_grade} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">القسم</label>
                    <select name="department_id" value={editFormData.department_id} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">اختر القسم</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">تاريخ التعيين</label>
                    <input type="date" name="hire_date" value={editFormData.hire_date} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">الحالة</label>
                    <select name="status" value={editFormData.status} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="active">نشط</option>
                      <option value="vacation">في إجازة</option>
                      <option value="warning">إنذار</option>
                      <option value="terminated">منتهي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">جهاز البصمة</label>
                    <div className="flex gap-2">
                      <select name="attendance_device_id" value={editFormData.attendance_device_id} onChange={handleEditChange} className="flex-1 border border-gray-300 rounded-lg px-3 py-2">
                        <option value="">اختر جهازاً</option>
                        {devices.map(dev => (
                          <option key={dev.id} value={dev.id}>{dev.name || `جهاز #${dev.id}`}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!editFormData.file_number?.trim()) {
                            toast.warning("⚠️ أدخل رقم الملف أولاً");
                            return;
                          }
                          if (!editFormData.attendance_device_id) {
                            toast.warning("⚠️ اختر جهاز البصمة أولاً");
                            return;
                          }
                          setNewFingerprint(prev => ({ ...prev, finger_id: editFormData.file_number.trim() }));
                          setShowFingerprintModal(true);
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                      >
                        + بصمة
                      </button>
                    </div>
                    {editFormData.fingerprints && editFormData.fingerprints.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {editFormData.fingerprints.map((fp, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                            <span>🔐 {fp.finger_id || fp.finger} - {fp.finger_position === 'right' ? 'اليد اليمنى' : 'اليد اليسرى'} - {fp.finger}</span>
                            <button type="button" onClick={() => removeEditFingerprint(idx)} className="text-red-500 hover:text-red-700">حذف</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-semibold mb-1">الوردية</label>
                    <select name="work_shift_id" value={String(editFormData.work_shift_id || "")} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="">اختر الوردية</option>
                      {shifts.map(shift => (
                        <option key={shift.id} value={String(shift.id)}>{shift.name || `وردية #${shift.id}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* القسم الثالث: المرتب والبدلات */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200 mb-4">
                <h4 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <span>💰</span> المرتب والبدلات والحوافز
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">الراتب الأساسي</label>
                    <input type="number" step="0.01" name="base_salary" value={editFormData.base_salary} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">بدل الدرجة</label>
                    <input type="number" step="0.01" name="position_allowance" value={editFormData.position_allowance} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                </div>

                {/* البدلات */}
                <div className="border-t border-emerald-200 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-emerald-700">البدلات</h5>
                    <button onClick={() => setShowCustomAllowanceModal(true)} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">+ بدل مخصص</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select value={newAllowance.type} onChange={(e) => setNewAllowance({ ...newAllowance, type: e.target.value })} className="border p-2 rounded flex-1">
                      <option value="transport">🚗 بدل نقل</option>
                      <option value="food">🍽️ بدل طعام</option>
                      <option value="housing">🏠 بدل سكن</option>
                      <option value="phone">📱 بدل هاتف</option>
                      <option value="education">📚 بدل تعليم</option>
                      <option value="medical">🏥 بدل علاج</option>
                      <option value="other">📋 بدل أخرى</option>
                    </select>
                    <input type="number" value={newAllowance.value} onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })} placeholder="القيمة" className="border p-2 rounded w-32" />
                    <button onClick={addEditAllowance} className="bg-emerald-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {editFormData.allowances.map((a, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-sm border">
                        <span className="text-emerald-700">
                          {a.type === 'custom' ? `📌 ${a.custom_name}` : 
                           a.type === 'transport' ? '🚗 بدل نقل' : 
                           a.type === 'food' ? '🍽️ بدل طعام' : 
                           a.type === 'housing' ? '🏠 بدل سكن' : 
                           a.type === 'phone' ? '📱 بدل هاتف' : '📋 بدل أخرى'}: 
                          <span className="font-bold">{parseFloat(a.value).toLocaleString()} ج.س</span>
                        </span>
                        <button onClick={() => removeEditAllowance(idx)} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* الحوافز */}
                <div className="border-t border-emerald-200 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-blue-700">الحوافز</h5>
                    <button onClick={() => setShowCustomIncentiveModal(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">+ حافز مخصص</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select value={newIncentive.type} onChange={(e) => setNewIncentive({ ...newIncentive, type: e.target.value })} className="border p-2 rounded flex-1">
                      <option value="bonus">🏆 مكافأة</option>
                      <option value="allowance">💵 بدل</option>
                      <option value="commission">💼 عمولة</option>
                      <option value="performance">📈 حافز أداء</option>
                      <option value="other">⭐ أخرى</option>
                    </select>
                    <input type="number" value={newIncentive.value} onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })} placeholder="القيمة" className="border p-2 rounded w-32" />
                    <button onClick={addEditIncentive} className="bg-blue-600 text-white px-3 py-2 rounded">إضافة</button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {editFormData.incentives.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-sm border">
                        <span className="text-blue-700">
                          {i.type === 'custom' ? `🎯 ${i.custom_name}` :
                           i.type === 'bonus' ? '🏆 مكافأة' : 
                           i.type === 'allowance' ? '💵 بدل' : 
                           i.type === 'commission' ? '💼 عمولة' : 
                           i.type === 'performance' ? '📈 حافز أداء' : '⭐ أخرى'}: 
                          <span className="font-bold">{parseFloat(i.value).toLocaleString()} ج.س</span>
                        </span>
                        <button onClick={() => removeEditIncentive(idx)} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* القسم الرابع: البنك والتأمين والعهد */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* البنك */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span>🏦</span> البنك
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">اسم البنك</label>
                      <select name="bank_name" value={editFormData.bank_name} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                        <option value="">اختر البنك</option>
                        {getBankOptions(customBanks).map((bank) => (
                          <option key={bank.value} value={bank.value}>{bank.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">رقم الحساب</label>
                      <input type="text" name="bank_account" value={editFormData.bank_account} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>

                {/* التأمين */}
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                  <h4 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                    <span>🏥</span> التأمين
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">نوع التأمين</label>
                      <select name="insurance_type" value={editFormData.insurance_type} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                        <option value="none">بدون تأمين</option>
                        <option value="health">تأمين صحي</option>
                        <option value="social">تأمين اجتماعي</option>
                        <option value="both">كلاهما</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">قيمة التأمين</label>
                      <input type="number" step="0.01" name="insurance_amount" value={editFormData.insurance_amount} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>

                {/* العهد */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                  <h4 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                    <span>📦</span> العهد
                  </h4>
                  <div className="space-y-2">
                    <input type="text" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="اسم العهدة" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    <input type="number" value={newAsset.value} onChange={(e) => setNewAsset({ ...newAsset, value: parseFloat(e.target.value) || 0 })} placeholder="القيمة" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    <button onClick={addEditAsset} className="bg-purple-600 text-white px-2 py-1 rounded text-sm w-full">+ إضافة</button>
                    <div className="space-y-1 max-h-20 overflow-auto">
                      {editFormData.assets.map((asset, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-1 rounded text-xs">
                          <span className="text-purple-700 truncate flex-1">{asset.name}</span>
                          <button onClick={() => removeEditAsset(idx)} className="text-red-500 mr-1">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* القسم الخامس: الملاحظات */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1">ملاحظات</label>
                <textarea name="notes" value={editFormData.notes} onChange={handleEditChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" rows="2" />
              </div>

              {/* القسم السادس: المرفقات */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-300 mb-4">
                <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📎</span> المرفقات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">الصورة الشخصية</label>
                    <input type="file" name="profile_photo" accept="image/*" onChange={handleEditFileChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">السيرة الذاتية (CV)</label>
                    <input type="file" name="cv" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">العقد الموقّع</label>
                    <input type="file" name="contract_file" accept=".pdf,.doc,.docx" onChange={handleEditFileChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button onClick={() => setShowEditModal(false)} className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">إلغاء</button>
                <button onClick={submitEdit} disabled={editLoading} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                  {editLoading ? "جاري الحفظ..." : "✅ حفظ التغييرات"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Custom Allowance */}
        {showCustomAllowanceModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
              <h3 className="text-lg font-bold mb-4 text-indigo-800">إضافة بدل مخصص</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">اسم البدل</label>
                  <input type="text" value={customAllowanceName} onChange={(e) => setCustomAllowanceName(e.target.value)} placeholder="مثال: بدل مواصلات..." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">القيمة (جنيه)</label>
                  <input type="number" value={newAllowance.value} onChange={(e) => setNewAllowance({ ...newAllowance, value: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowCustomAllowanceModal(false); setCustomAllowanceName(""); }} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                <button onClick={addEditCustomAllowance} className="bg-indigo-600 text-white px-4 py-2 rounded">إضافة</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Custom Incentive */}
        {showCustomIncentiveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
              <h3 className="text-lg font-bold mb-4 text-blue-800">إضافة حافز مخصص</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">اسم الحافز</label>
                  <input type="text" value={customIncentiveName} onChange={(e) => setCustomIncentiveName(e.target.value)} placeholder="مثال: حافز نهاية العام..." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">القيمة (جنيه)</label>
                  <input type="number" value={newIncentive.value} onChange={(e) => setNewIncentive({ ...newIncentive, value: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setShowCustomIncentiveModal(false); setCustomIncentiveName(""); }} className="bg-gray-500 text-white px-4 py-2 rounded">إلغاء</button>
                <button onClick={addEditCustomIncentive} className="bg-blue-600 text-white px-4 py-2 rounded">إضافة</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Fingerprint / Face */}
        {showFingerprintModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" dir="rtl">
              <h3 className="text-xl font-bold mb-4 text-green-800">إضافة بصمة / وجه</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  💡 رقم البصمة = رقم الملف ({editFormData.file_number || "أدخل رقم الملف"})
                </div>

                {/* نوع التسجيل: بصمة / وجه */}
                <div>
                  <label className="block font-semibold mb-1">نوع التسجيل</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollType('fingerprint')}
                      className={`flex-1 p-2 rounded border text-sm ${enrollType === 'fingerprint' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'}`}
                    >
                      👆 بصمة
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollType('face')}
                      className={`flex-1 p-2 rounded border text-sm ${enrollType === 'face' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'}`}
                    >
                      😀 وجه
                    </button>
                  </div>
                </div>

                {/* طريقة التسجيل: تلقائي / يدوي */}
                <div>
                  <label className="block font-semibold mb-1">طريقة التسجيل</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEnrollMode('auto')}
                      className={`flex-1 p-2 rounded border text-sm ${enrollMode === 'auto' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300'}`}
                    >
                      ⚡ تلقائي
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnrollMode('manual')}
                      className={`flex-1 p-2 rounded border text-sm ${enrollMode === 'manual' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-gray-300'}`}
                    >
                      ✋ يدوي
                    </button>
                  </div>
                </div>

                {/* الوصف حسب الوضع */}
                {enrollMode === 'auto' ? (
                  <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
                    {enrollType === 'face'
                      ? '⚡ سيتم إرسال أمر تسجيل الوجه للجهاز. يرجى التوجه إلى الجهاز.'
                      : '⚡ سيتم إرسال أمر تسجيل البصمة للجهاز. ضع إصبعك على الجهاز عند الطلب.'}
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-700">
                    ✋ سيتم إنشاء المستخدم على الجهاز فقط. أكمل التسجيل يدوياً من قائمة الجهاز.
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">رقم المستخدم على الجهاز</label>
                  <input
                    type="text"
                    value={newFingerprint.finger_id}
                    onChange={(e) => setNewFingerprint({ ...newFingerprint, finger_id: e.target.value })}
                    placeholder="رقم المستخدم (رقم الملف)"
                    className="w-full border p-2 rounded"
                  />
                </div>

                {/* حقول البصمة فقط (تختفي للوجه) */}
                {enrollType === 'fingerprint' && (
                  <>
                    <div>
                      <label className="block font-semibold mb-1">اليد</label>
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
                      <label className="block font-semibold mb-1">الإصبع</label>
                      <div className="grid grid-cols-2 gap-2">
                        {fingerOptions.map(finger => (
                          <label key={finger.value} className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${newFingerprint.finger === finger.value ? 'bg-green-100 border-green-500' : ''}`}>
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
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowFingerprintModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">إلغاء</button>
                <button onClick={addEditFingerprint} disabled={editLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  {editLoading ? "جاري..." : "إضافة"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment Progress Modal */}
        {showEnrollProgress && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 text-center" dir="rtl">
              {enrollProgress.status === 'connecting' && (
                <>
                  <div className="text-4xl mb-4 animate-spin">⏳</div>
                  <h3 className="text-xl font-bold mb-2">جاري الاتصال بالجهاز...</h3>
                  <p className="text-gray-600">يرجى الانتظار</p>
                </>
              )}
              {enrollProgress.status === 'waiting' && (
                <>
                  <div className="text-6xl mb-4 animate-pulse">📟</div>
                  <h3 className="text-xl font-bold mb-2 text-green-700">سجل بصمتك على الجهاز</h3>
                  <p className="text-gray-600 whitespace-pre-line">{enrollProgress.message}</p>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                  <div className="flex gap-2 justify-center mt-4">
                    <button
                      onClick={async () => {
                        try {
                          const checkResult = await checkEnrollmentStatus(editFormData.attendance_device_id, {
                            user_id: enrollProgress.finger_id,
                            finger_id: enrollProgress.enrollType === 'face' ? null : enrollProgress.fingerId,
                          });
                          if (checkResult.enrolled) {
                            setEnrollProgress({ status: 'success', message: '✅ تم تسجيل البصمة بنجاح!' });
                            if (enrollProgress.saveAfterEnroll) await enrollProgress.saveAfterEnroll();
                            setTimeout(() => setShowEnrollProgress(false), 1500);
                          } else {
                            toast.info("لم يتم العثور على البصمة بعد. تأكد من تسجيلها على الجهاز.");
                          }
                        } catch (e) {
                          toast.error("تعذر التحقق من الجهاز.");
                        }
                      }}
                      className="bg-green-700 text-white px-4 py-2 rounded text-sm"
                    >
                      🔄 تحقق الآن
                    </button>
                    <button
                      onClick={() => {
                        if (enrollTimeoutRef.current) clearTimeout(enrollTimeoutRef.current);
                        setShowEnrollProgress(false);
                        setEnrollMode('manual');
                        setShowFingerprintModal(true);
                      }}
                      className="bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                    >
                      ✋ تحويل للوضع اليدوي
                    </button>
                    <button
                      onClick={() => {
                        if (enrollTimeoutRef.current) clearTimeout(enrollTimeoutRef.current);
                        setShowEnrollProgress(false);
                      }}
                      className="bg-gray-500 text-white px-3 py-2 rounded text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}

              {enrollProgress.status === 'success' && (
                <>
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-bold mb-2 text-green-700">تم التسجيل بنجاح!</h3>
                  <p className="text-gray-600">تم تسجيل البصمة على الجهاز</p>
                </>
              )}
              {enrollProgress.status === 'error' && (
                <>
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-xl font-bold mb-2 text-red-700">فشل التسجيل</h3>
                  <p className="text-gray-600 mb-4">{enrollProgress.message}</p>
                  <button
                    onClick={() => setShowEnrollProgress(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    إغلاق
                  </button>
                </>
              )}
              {enrollProgress.status === 'timeout' && (
                <>
                  <div className="text-6xl mb-4">⏰</div>
                  <h3 className="text-xl font-bold mb-2 text-yellow-700">لم يتم رصد البصمة</h3>
                  <p className="text-gray-600 mb-4">{enrollProgress.message}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => { setShowEnrollProgress(false); setEnrollMode('manual'); setShowFingerprintModal(true); }}
                      className="bg-yellow-600 text-white px-3 py-2 rounded text-sm"
                    >
                      جرب الوضع اليدوي
                    </button>
                    <button
                      onClick={() => setShowEnrollProgress(false)}
                      className="bg-gray-500 text-white px-3 py-2 rounded text-sm"
                    >
                      إغلاق
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}