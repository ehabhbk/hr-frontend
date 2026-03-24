import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import AddEmployee from "./pages/AddEmployee";
import Employee from "./pages/Employee";
import ProfileSettings from "./pages/profilesettings";
import FingerprintDevices from "./pages/FingerprintDevices";
import AttendanceLogs from "./pages/AttendanceLogs";
import ProtectedRoute from "./components/ProtectedRoute";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <Router>
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
        {/* صفحة الاعدادات */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
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

        {/* صفحة إعدادات الملف الشخصي */}
        <Route
          path="/profilesettings"
          element={
            <ProtectedRoute>
              <ProfileSettings />
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

        {/* سجل الحضور والانصراف */}
        <Route
          path="/attendance-logs"
          element={
            <ProtectedRoute>
              <AttendanceLogs />
            </ProtectedRoute>
          }
        />

        {/* إعادة التوجيه الافتراضية */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;