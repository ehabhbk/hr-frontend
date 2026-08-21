import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface Geofence {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
}

const GeofencesPage: React.FC = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "100",
    is_active: true,
  });

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      const res = await api.get("/geofences");
      setGeofences(res.data.data || res.data);
    } catch {
      toast.error("خطأ في تحميل المناطق الجغرافية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      latitude: "",
      longitude: "",
      radius: "100",
      is_active: true,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius: Number(form.radius),
        is_active: form.is_active,
      };
      if (editingId) {
        await api.put(`/geofences/${editingId}`, payload);
        toast.success("تم تحديث المنطقة بنجاح");
      } else {
        await api.post("/geofences", payload);
        toast.success("تم إنشاء المنطقة بنجاح");
      }
      setShowModal(false);
      resetForm();
      fetchGeofences();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المنطقة؟")) return;
    try {
      await api.delete(`/geofences/${id}`);
      toast.success("تم الحذف بنجاح");
      fetchGeofences();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openEdit = (geo: Geofence) => {
    setEditingId(geo.id);
    setForm({
      name: geo.name,
      latitude: String(geo.latitude),
      longitude: String(geo.longitude),
      radius: String(geo.radius),
      is_active: geo.is_active,
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <Topbar title="المناطق الجغرافية" />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="md:mr-64 mr-0 mt-16 md:mt-4 px-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">المناطق الجغرافية (Geofence)</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + منطقة جديدة
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">خط العرض</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">خط الطول</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">نصف القطر (م)</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">نشط</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {geofences.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      لا توجد مناطق جغرافية
                    </td>
                  </tr>
                ) : (
                  geofences.map((geo) => (
                    <tr key={geo.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium">{geo.name}</td>
                      <td className="px-4 py-3">{geo.latitude}</td>
                      <td className="px-4 py-3">{geo.longitude}</td>
                      <td className="px-4 py-3">{geo.radius}</td>
                      <td className="px-4 py-3">
                        {geo.is_active ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            نشط
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => openEdit(geo)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDelete(geo.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? "تعديل المنطقة الجغرافية" : "منطقة جغرافية جديدة"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">خط العرض (Latitude) *</label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">خط الطول (Longitude) *</label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نصف القطر (متر) *</label>
                  <input
                    type="number"
                    value={form.radius}
                    onChange={(e) => setForm({ ...form, radius: e.target.value })}
                    required
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    منطقة نشطة
                  </label>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    {editingId ? "تحديث" : "إنشاء"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GeofencesPage;
