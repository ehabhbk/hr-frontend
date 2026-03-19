// src/pages/ProfileSettingsSimple.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

async function firstWorkingRequest(builders) {
  let lastErr = null;
  for (const build of builders) {
    try {
      const res = await build();
      return res;
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 404) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error("No working endpoint found");
}

export default function ProfileSettingsSimple() {
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);

  const usernameLS = localStorage.getItem("username");
  const avatarLS = localStorage.getItem("avatar");

  // تحكم في تحرير الاسم وكلمة المرور
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // نماذج بسيطة
  const [username, setUsername] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromLocalStorage = () => {
      const usernameLS = localStorage.getItem("username");
      const avatarLS = localStorage.getItem("avatar");
      setUsername(usernameLS || "");
      setAvatarPreview(avatarLS || null);
      setUser({ username: usernameLS || "", avatar: avatarLS || null });
    };

    const fetchMe = async () => {
      try {
        const res = await firstWorkingRequest([
          () => api.get("/me"),
          () => api.get("/auth/me"),
          () => api.get("/user"),
          () => api.get("/profile"),
          () => api.get("/users/me"),
        ]);
        const payload = res?.data?.data ?? res?.data ?? null;
        if (!payload || cancelled) return;

        const nextUsername = payload.username ?? payload.name ?? "";
        const nextAvatar =
          payload.avatar ??
          payload.avatarUrl ??
          payload.profile_photo ??
          payload.profile_photo_url ??
          null;

        setUser(payload);
        setUsername(nextUsername);
        setAvatarPreview(nextAvatar);

        if (nextUsername) localStorage.setItem("username", nextUsername);
        if (nextAvatar) localStorage.setItem("avatar", nextAvatar);
      } catch (e) {
        if (!cancelled) hydrateFromLocalStorage();
      }
    };

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الملف يجب أن يكون صورة.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setError(null);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validatePasswordChange = () => {
    if (!editingPassword) return true;
    if (!passwords.currentPassword || !passwords.newPassword) {
      setError("املأ حقول كلمة المرور.");
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return false;
    }
    if (passwords.newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);

    if (editingUsername && !username.trim()) {
      setError("اسم المستخدم لا يمكن أن يكون فارغاً.");
      return;
    }

    if (!validatePasswordChange()) return;

    setSaving(true);
    try {
      const calls = [];

      if (editingUsername) {
        calls.push(
          firstWorkingRequest([
            () => api.put("/me", { username: username.trim() }),
            () => api.put("/user", { username: username.trim() }),
            () => api.put("/profile", { username: username.trim() }),
            () => api.put("/users/me", { username: username.trim() }),
          ])
        );
      }

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const cfg = { headers: { "Content-Type": "multipart/form-data" } };
        calls.push(
          firstWorkingRequest([
            () => api.post("/me/avatar", fd, cfg),
            () => api.post("/me/photo", fd, cfg),
            () => api.post("/me/profile-photo", fd, cfg),
            () => api.post("/profile/avatar", fd, cfg),
            () => api.post("/profile/photo", fd, cfg),
            () => api.post("/user/avatar", fd, cfg),
            () => api.post("/user/photo", fd, cfg),
            () => api.post("/user/profile-photo", fd, cfg),
            () => api.post("/users/me/avatar", fd, cfg),
            () => api.post("/users/me/photo", fd, cfg),
            () => api.post("/upload/avatar", fd, cfg),
            () => api.post("/uploads/avatar", fd, cfg),
          ])
        );
      }

      if (editingPassword) {
        const body = {
          current_password: passwords.currentPassword,
          password: passwords.newPassword,
          password_confirmation: passwords.confirmPassword,
        };
        calls.push(
          firstWorkingRequest([
            () => api.put("/me/password", body),
            () => api.put("/profile/password", body),
            () => api.put("/user/password", body),
            () => api.put("/users/me/password", body),
            () => api.put("/change-password", body),
          ])
        );
      }

      if (calls.length === 0) {
        setSuccessMsg("لا يوجد تغييرات للحفظ.");
        return;
      }

      await Promise.all(calls);

      // إعادة جلب البيانات بعد الحفظ
      try {
        const res = await firstWorkingRequest([
          () => api.get("/me"),
          () => api.get("/auth/me"),
          () => api.get("/user"),
          () => api.get("/profile"),
          () => api.get("/users/me"),
        ]);
        const payload = res?.data?.data ?? res?.data ?? null;
        if (payload) {
          const nextUsername = payload.username ?? payload.name ?? username.trim();
          const nextAvatar =
            payload.avatar ??
            payload.avatarUrl ??
            payload.profile_photo ??
            payload.profile_photo_url ??
            avatarPreview;

          setUser(payload);
          setUsername(nextUsername);
          setAvatarPreview(nextAvatar);
          if (nextUsername) localStorage.setItem("username", nextUsername);
          if (nextAvatar) localStorage.setItem("avatar", nextAvatar);
        }
      } catch {
        // لو الـ /me غير متاح بعد التحديث، على الأقل حدّث القيم محلياً
        const nextUsername = username.trim();
        setUser((u) => ({ ...(u || {}), username: nextUsername }));
        localStorage.setItem("username", nextUsername);
      }

      // مسح حقول كلمة المرور بعد الحفظ
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setEditingPassword(false);
      setEditingUsername(false);
      setAvatarFile(null);
      setSuccessMsg("تم حفظ التغييرات بنجاح.");
      navigate(-1);
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (status === 404
          ? "لم يتم العثور على endpoint للبروفايل في الباك اند. جرّبت: /me, /auth/me, /user, /profile, /users/me."
          : "فشل حفظ التغييرات.");
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-100" dir="rtl">
        <Sidebar />
        <div className="flex-1 p-6">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
          <h1 className="text-xl font-semibold text-indigo-800">إعدادات المستخدم</h1>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-3 focus:outline-none"
              type="button"
            >
              <img
                src={avatarLS || "/default-avatar.png"}
                alt="User Avatar"
                className="w-10 h-10 rounded-full border"
              />
              <span className="text-gray-700 font-medium">{usernameLS}</span>
            </button>

            {openMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg rounded-lg border">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/profilesettings");
                  }}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  الملف الشخصي
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100"
                  type="button"
                >
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {error && <div className="mb-4 text-red-600">{error}</div>}
            {successMsg && <div className="mb-4 text-green-600">{successMsg}</div>}

            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-gray-600">
                      {username ? username[0].toUpperCase() : "U"}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-gray-500">اسم المستخدم</p>
                      {!editingUsername ? (
                        <p className="text-lg font-medium">{username}</p>
                      ) : (
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="border rounded px-3 py-2"
                        />
                      )}
                    </div>

                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => setEditingUsername((s) => !s)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded"
                        type="button"
                      >
                        {editingUsername ? "إلغاء" : "تغيير اسم المستخدم"}
                      </button>

                      <button
                        onClick={() => setEditingPassword((s) => !s)}
                        className="px-3 py-1 bg-yellow-600 text-white rounded"
                        type="button"
                      >
                        {editingPassword ? "إلغاء" : "تغيير كلمة المرور"}
                      </button>
                    </div>
                  </div>

                  {editingPassword && (
                    <div className="mt-4 grid grid-cols-1 gap-2 max-w-md">
                      <input
                        type="password"
                        placeholder="كلمة المرور الحالية"
                        value={passwords.currentPassword}
                        onChange={(e) =>
                          setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
                        }
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="password"
                        placeholder="كلمة المرور الجديدة"
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="password"
                        placeholder="تأكيد كلمة المرور"
                        value={passwords.confirmPassword}
                        onChange={(e) =>
                          setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                        }
                        className="border rounded px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatarInput"
                />
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  type="button"
                >
                  رفع صورة البروفايل
                </button>
                <button onClick={removeAvatar} className="px-4 py-2 border rounded" type="button">
                  إزالة الصورة
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  يمكنك تغيير اسم المستخدم أو كلمة المرور ثم الضغط حفظ
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 border rounded"
                    type="button"
                    disabled={saving}
                  >
                    إلغاء
                  </button>

                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                    disabled={saving}
                    type="button"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}