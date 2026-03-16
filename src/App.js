import React from "react";
import EmployeesList from "./EmployeesList";

function App() {
  return (
    <div style={{ margin: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#2c3e50" }}>
        نظام إدارة الموظفين
      </h1>
      <p style={{ textAlign: "center", color: "#7f8c8d" }}>
        يمكنك إضافة موظف جديد، عرض القائمة، تعديل البيانات أو حذف موظف بسهولة
      </p>
      <EmployeesList/>
    </div>
  );
}

export default App;