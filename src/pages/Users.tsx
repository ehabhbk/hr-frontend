import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role_id: "",
    department_id: "",
  });
  const [saving, setSaving] = useState(false);

  // Check if current user is admin
  const permissions = React.useMemo(() => {
    try {
      const perms = localStorage.getItem("permissions");
      return perms ? JSON.parse(perms) : [];
    } catch {
      return [];
    }
  }, []);

  const isAdmin = permissions.includes('*');

  const loadUsers = async (deptId = null) => {
    setLoading(true);
    try {
      const params = deptId ? `?department_id=${deptId}` : '';
      const res = await api.get(`/users${params}`);
      setUsers(res.data?.data || res.data || []);
    } catch (e) {
      toast.error("فشل في جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(res.data?.data || res.data || []);
    } catch (e) {
      console.error("Failed to load roles:", e);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data?.data || res.data || []);
    } catch (e) {
      console.error("Failed to load departments:", e);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadDepartments();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: "", full_name: "", email: "", password: "", role_id: "", department_id: "" });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      username: user.username || "",
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role_id: user.role_id || user.role?.id || "",
      department_id: user.department_id || user.department?.id || "",
    });
    setShowModal(true);
  };

  const handleRoleChange = (roleId) => {
    const role = roles.find(r => r.id == roleId);
    const roleName = (role?.name_ar || role?.name || '').toLowerCase();
    const isDepartmentRelated = 
      roleName.includes('مشرف') && roleName.includes('قسم') ||
      roleName.includes('supervisor') && roleName.includes('department') ||
      roleName.includes('department_supervisor') ||
      roleName.includes('department_manager');
    
    setForm(f => ({ 
      ...f, 
      role_id: roleId,
      // Keep department if role is department-related, otherwise clear it
      department_id: isDepartmentRelated ? f.department_id : "" 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username?.trim() || !form.email?.trim()) {
      toast.error("اسم المستخدم والبريد الإلكتروني مطلوبان");
      return;
    }
    if (!editing && !form.password?.trim()) {
      toast.error("كلمة المرور مطلوبة للمستخدم الجديد");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        full_name: form.full_name?.trim() || undefined,
        email: form.email.trim(),
        role_id: form.role_id || undefined,
        department_id: form.department_id || undefined,
        ...(form.password?.trim() ? { password: form.password } : {}),
      };

      if (editing?.id) {
        await api.put(`/users/${editing.id}`, payload);
        toast.success("تم تحديث المستخدم بنجاح");
      } else {
        await api.post("/users", payload);
        toast.success("تم إضافة المستخدم بنجاح");
      }
      setShowModal(false);
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل في حفظ المستخدم");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.username}"؟`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success("تم حذف المستخدم بنجاح");
      await loadUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل في حذف المستخدم");
    }
  };

  const getRoleDisplay = (user) => {
    if (!user.role) return "—";
    return user.role.display_name || user.role.name || "—";
  };

  const getDepartmentDisplay = (user) => {
    if (!user.department) return "—";
    return user.department.name || user.department.name_ar || "—";
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="إدارة المستخدمين" />

        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="text-gray-600 font-medium">
            عدد المستخدمين: <span className="font-bold text-indigo-700">{users.length}</span>
          </div>
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ إضافة مستخدم
          </button>
        </div>

        <main className="flex-1 p-6">
          {loading ? (
            <div className="text-gray-600 text-center py-10">جارٍ التحميل...</div>
          ) : (
            <div className="bg-white shadow rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الاسم</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">اسم المستخدم</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">البريد الإلكتروني</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الدور</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">القسم</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {user.full_name || user.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.username}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: user.role?.color || "#6366f1" }}
                        >
                          {getRoleDisplay(user)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getDepartmentDisplay(user)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}>
                          {user.is_active === false ? "غير نشط" : "نشط"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 text-sm"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200 text-sm"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-500">
                        لا يوجد مستخدمين بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editing ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اسم المستخدم"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    كلمة المرور {editing && "(اتركها فارغة للإبقاء عليها)"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    required={!editing}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">الدور</label>
                  <select
                    value={form.role_id}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر الدور</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Show department only if role is department-related */}
                {(() => {
                  const role = roles.find(r => r.id == form.role_id);
                  const roleName = (role?.name_ar || role?.name || '').toLowerCase();
                  const isDepartmentRelated = 
                    roleName.includes('مشرف') && roleName.includes('قسم') ||
                    roleName.includes('supervisor') && roleName.includes('department') ||
                    roleName.includes('department_supervisor') ||
                    roleName.includes('department_manager');
                  return isDepartmentRelated;
                })() && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">القسم</label>
                    <select
                      value={form.department_id}
                      onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">اختر القسم</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name || dept.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-50"
                  >
                    {saving ? "جارٍ الحفظ..." : editing ? "تحديث" : "إضافة"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}
