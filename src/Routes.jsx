import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Employee from "./pages/Employee";
import AddEmployee from "./pages/AddEmployee";
import Departments from "./pages/Departments";
import Login from "./pages/Login";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employee/:id" element={<Employee />} />
        <Route path="/add-employee" element={<AddEmployee />} />
        <Route path="/departments" element={<Departments />} />
      </Routes>
    </Router>
  );
}