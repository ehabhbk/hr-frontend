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
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role_id: "",
  });
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      toast.error("فشل في جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (e) {
      console.error("Failed to load roles");
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: "", email: "", password: "", role_id: "" });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role_id: user.role_id || user.role?.id || "",
    });
    setShowModal(true);
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
        email: form.email.trim(),
        role_id: form.role_id || undefined,
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
    const role = user.role;
    return role.display_name || role.name || "—";
  };

  const getRoleColor = (user) => {
    if (!user.role) return "bg-gray-100 text-gray-600";
    const color = user.role.color || "#6366f1";
    return `text-white`;
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
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">المستخدم</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">البريد الإلكتروني</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">الصلاحية</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">الحالة</th>
                    <th className="text-right px-6 py-3 text-gray-600 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {user.username?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-800">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user)}`}
                          style={{
                            backgroundColor: user.role?.color || "#6366f1",
                          }}
                        >
                          {getRoleDisplay(user)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.is_active === false
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.is_active === false ? "غير نشط" : "نشط"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="px-3 py-1 text-red-600 hover:bg-red-50 rounded border border-red-200"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-500">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editing ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-gray-700 font-medium mb-2">الصلاحية</label>
                  <select
                    value={form.role_id}
                    onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر الصلاحية</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name || role.name}
                      </option>
                    ))}
                  </select>
                </div>
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
