import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!username) newErrors.username = "اسم المستخدم مطلوب";
    if (!password) newErrors.password = "كلمة المرور مطلوبة";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await api.post("/login", { username, password });

        if (response.data.token) {
          localStorage.setItem("token", response.data.token);

          if (response.data.user) {
            localStorage.setItem("username", response.data.user.username);
            localStorage.setItem("avatar", response.data.user.avatar || "/default-avatar.png");
          }

          navigate("/dashboard");
        } else {
          setErrors({ general: "بيانات الدخول غير صحيحة" });
        }
      } catch (error) {
        setErrors({ general: "فشل تسجيل الدخول - تأكد من اسم المستخدم وكلمة المرور" });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-l from-blue-400 to-indigo-600" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-4xl">🏢</span>
          </div>
          <h1 className="text-2xl font-extrabold text-indigo-700 mb-1">
            Jawda HR
          </h1>
          <p className="text-gray-600">
            نظام جودة لإدارة الموارد البشرية
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 text-right">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
              placeholder="أدخل اسم المستخدم"
              disabled={loading}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1 text-right">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 text-right">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
              placeholder="••••••••"
              disabled={loading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1 text-right">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري تسجيل الدخول...
              </>
            ) : (
              "دخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}