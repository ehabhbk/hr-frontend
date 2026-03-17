import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // استدعاء axios instance

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    // التحقق من الحقول
    if (!username) newErrors.username = "اسم المستخدم مطلوب";
    if (!password) newErrors.password = "كلمة المرور مطلوبة";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        const response = await api.post("/login", { username, password });

        // التحقق من وجود التوكن
        if (response.data.token) {
          // تخزين التوكن
          localStorage.setItem("token", response.data.token);

          // تخزين بيانات المستخدم إذا كانت متوفرة
          if (response.data.user) {
            localStorage.setItem("username", response.data.user.username);
            localStorage.setItem("avatar", response.data.user.avatar || "/default-avatar.png");
          }

          // الانتقال للـ Dashboard
          navigate("/dashboard");
        } else {
          alert("بيانات الدخول غير صحيحة ❌");
        }
      } catch (error) {
        alert("فشل تسجيل الدخول ❌");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-400 to-indigo-600">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-extrabold text-center text-indigo-700 mb-1">
          Jawda HR Management System
        </h1>
        <p className="text-center text-gray-600 mb-6">
          نظام جودة لإدارة الموارد البشرية
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* حقل اسم المستخدم */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="أدخل اسم المستخدم"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          {/* حقل كلمة المرور */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* زر الدخول */}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}