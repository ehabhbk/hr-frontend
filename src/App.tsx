import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import AddEmployee from "./pages/AddEmployee";
import Employee from "./pages/Employee";
import ProfileSettings from "./pages/profilesettings";
import FingerprintDevices from "./pages/FingerprintDevices";
import AttendanceLogs from "./pages/AttendanceLogs";
import Users from "./pages/Users";
import ProtectedRoute from "./components/ProtectedRoute";
import SettingsPage from "./pages/SettingsPage";
import ReportsPage from "./pages/ReportsPage";
import BankExportPage from "./pages/BankExportPage";
import NotificationsPage from "./pages/NotificationsPage";
import api from "./services/api";

function App() {
  const loadPermissions = () => {
    const token = localStorage.getItem("token");
    console.log('App - checking token:', token ? 'EXISTS' : 'NOT FOUND');
    
    if (token) {
      api.get("/me")
        .then(res => {
          const data = res.data;
          console.log('/me response:', data);
          
          if (data?.error) {
            console.error('/me returned error:', data.message || data.error);
            return;
          }
          
          if (data?.permissions) {
            localStorage.setItem("permissions", JSON.stringify(data.permissions));
            console.log('Saved permissions to localStorage:', data.permissions);
          }
          if (data?.roles) {
            localStorage.setItem("user_roles", JSON.stringify(data.roles));
          }
        })
        .catch(err => {
          console.error("Failed to load user permissions:", err.response?.data || err.message);
        });
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue) {
        console.log('Token changed, reloading permissions');
        loadPermissions();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ fontSize: '14px' }}
      />
      <Routes>
        {/* صفحة تسجيل الدخول */}
        <Route path="/login" element={<Login />} />

        {/* صفحة Dashboard محمية */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* صفحة الموظفين */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />

        {/* صفحة موظف واحد */}
        <Route
          path="/employee/:id"
          element={
            <ProtectedRoute>
              <Employee />
            </ProtectedRoute>
          }
        />

        {/* إضافة موظف جديد */}
        <Route
          path="/add-employee"
          element={
            <ProtectedRoute>
              <AddEmployee />
            </ProtectedRoute>
          }
        />

        {/* صفحة الأقسام */}
        <Route
          path="/departments"
          element={
            <ProtectedRoute>
              <Departments />
            </ProtectedRoute>
          }
        />

        {/* الإعدادات */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* التقارير */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* التصدير البنكي */}
        <Route
          path="/bank-exports"
          element={
            <ProtectedRoute>
              <BankExportPage />
            </ProtectedRoute>
          }
        />

        {/* الإشعارات */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* إدارة المستخدمين */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />

        {/* أجهزة البصمة */}
        <Route
          path="/fingerprint-devices"
          element={
            <ProtectedRoute>
              <FingerprintDevices />
            </ProtectedRoute>
          }
        />

        {/* سجل الحضور */}
        <Route
          path="/attendance-logs"
          element={
            <ProtectedRoute>
              <AttendanceLogs />
            </ProtectedRoute>
          }
        />

        {/* الملف الشخصي */}
        <Route
          path="/profilesettings"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        {/* إعادة التوجيه الافتراضية */}
        <Route path="*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
