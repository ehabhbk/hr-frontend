import React, { useEffect, useState } from "react";
import api from "./axiosConfig"; // استدعاء ملف الإعدادات

function EmployeesList() {
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    salary: "",
    status: "active",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    api.get("/employees")
      .then(res => setEmployees(res.data))
      .catch(err => console.error("خطأ في جلب البيانات:", err));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post("/employees", formData);
      alert("تمت إضافة الموظف بنجاح");
      setFormData({ name: "", email: "", position: "", salary: "", status: "active" });
      setShowAddModal(false);
      fetchEmployees();
    } catch (error) {
      console.error(error.response?.data || error.message);
      alert("حدث خطأ أثناء الإضافة");
    }
  };

  const deleteEmployee = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) {
      try {
        await api.delete(`/employees/${id}`);
        alert("تم حذف الموظف بنجاح");
        fetchEmployees();
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الحذف");
      }
    }
  };

  const startEdit = (employee) => {
    setEditingEmployee(employee.id);
    setFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      salary: employee.salary,
      status: employee.status,
    });
    setShowEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${editingEmployee}`, formData);
      alert("تم تعديل الموظف بنجاح");
      setEditingEmployee(null);
      setFormData({ name: "", email: "", position: "", salary: "", status: "active" });
      setShowEditModal(false);
      fetchEmployees();
    } catch (error) {
      console.error(error.response?.data || error.message);
      alert("حدث خطأ أثناء التعديل");
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toString().includes(searchTerm)
  );

  return (
    <div>
      <h2>إدارة الموظفين</h2>

      <input
        type="text"
        placeholder="🔍 ابحث بالاسم أو رقم الموظف"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: "20px", width: "300px", padding: "5px" }}
      />

      <button onClick={() => setShowAddModal(true)} style={{ marginLeft: "20px" }}>
        ➕ إضافة موظف جديد
      </button>

      <table border="1" cellPadding="8" style={{ marginTop: "20px", width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f4f4f4" }}>
          <tr>
            <th>رقم الموظف</th>
            <th>الاسم</th>
            <th>البريد الإلكتروني</th>
            <th>الوظيفة</th>
            <th>الراتب</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map(emp => (
            <tr key={emp.id}>
              <td>{emp.id}</td>
              <td>{emp.name}</td>
              <td>{emp.email}</td>
              <td>{emp.position}</td>
              <td>{emp.salary}</td>
              <td>{emp.status}</td>
              <td>
                <button onClick={() => deleteEmployee(emp.id)}>حذف</button>
                <button onClick={() => startEdit(emp)}>تعديل</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", width: "400px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}>
            <h3>إضافة موظف جديد</h3>
            <form onSubmit={addEmployee}>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="الاسم" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="email" value={formData.email} onChange={handleChange} placeholder="البريد الإلكتروني" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="position" value={formData.position} onChange={handleChange} placeholder="الوظيفة" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="salary" value={formData.salary} onChange={handleChange} placeholder="الراتب" required style={{ width: "100%", marginBottom: "10px" }} />
              <select name="status" value={formData.status} onChange={handleChange} style={{ width: "100%", marginBottom: "10px" }}>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              <button type="submit" style={{ marginRight: "10px" }}>إضافة</button>
              <button type="button" onClick={() => setShowAddModal(false)}>إلغاء</button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", width: "400px", boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}>
            <h3>تعديل الموظف</h3>
            <form onSubmit={saveEdit}>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="الاسم" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="email" value={formData.email} onChange={handleChange} placeholder="البريد الإلكتروني" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="position" value={formData.position} onChange={handleChange} placeholder="الوظيفة" required style={{ width: "100%", marginBottom: "10px" }} />
              <input name="salary" value={formData.salary} onChange={handleChange} placeholder="الراتب" required style={{ width: "100%", marginBottom: "10px" }} />
              <select name="status" value={formData.status} onChange={handleChange} style={{ width: "100%", marginBottom: "10px" }}>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              <button type="submit" style={{ marginRight: "10px" }}>حفظ التعديلات</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeesList;