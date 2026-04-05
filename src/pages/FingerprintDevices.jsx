import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  createDevice,
  deleteDevice,
  listDevices,
  syncDevice,
  testDevice,
  updateDevice,
  setDeviceTime,
  downloadFingerprints,
  uploadFingerprints,
} from "../services/fingerprintApi";

export default function FingerprintDevices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    ip: "",
    port: 4370,
    device_id: "",
    password: "",
  });

  const deviceCount = Array.isArray(devices) ? devices.length : 0;

  const load = async () => {
    setLoading(true);
    try {
      const data = await listDevices();
      setDevices(Array.isArray(data) ? data : data?.data || []);
    } catch (e) {
      toast.error(e.message || "فشل في جلب الأجهزة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", ip: "", port: 4370, device_id: "", password: "" });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d?.name || "",
      ip: d?.ip || d?.host || "",
      port: d?.port ?? 4370,
      device_id: d?.device_id || d?.deviceId || "",
      password: d?.password || "",
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (!form.name?.trim() || !form.ip?.trim()) {
        toast.error("الاسم و IP مطلوبين");
        return;
      }

      const payload = {
        name: form.name.trim(),
        ip: form.ip.trim(),
        port: Number(form.port || 4370),
        device_id: form.device_id || undefined,
        password: form.password || undefined,
      };

      if (editing?.id) {
        await updateDevice(editing.id, payload);
        toast.success("تم تحديث الجهاز ✅");
      } else {
        await createDevice(payload);
        toast.success("تم إضافة الجهاز ✅");
      }
      setShowModal(false);
      await load();
    } catch (e2) {
      toast.error(e2.message || "فشل حفظ الجهاز");
    }
  };

  const doDelete = async (d) => {
    if (!d?.id) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;
    setBusyId(d.id);
    try {
      await deleteDevice(d.id);
      toast.success("تم حذف الجهاز ✅");
      await load();
    } catch (e) {
      toast.error(e.message || "فشل حذف الجهاز");
    } finally {
      setBusyId(null);
    }
  };

  const doTest = async (d) => {
    if (!d?.id) return;
    setBusyId(d.id);
    try {
      const res = await testDevice(d.id);
      toast.success(res?.message || "الاتصال ناجح ✅");
    } catch (e) {
      toast.error(e.message || "فشل اختبار الاتصال");
    } finally {
      setBusyId(null);
    }
  };

  const doSync = async (d) => {
    if (!d?.id) return;
    setBusyId(d.id);
    try {
      const res = await syncDevice(d.id);
      const stored = res?.stored ?? 0;
      const skipped = res?.skipped ?? 0;
      
      if (stored === 0 && skipped === 0) {
        toast.info("ℹ️ لا توجد سجلات جديدة للمزامنة");
      } else if (stored > 0) {
        toast.success(`✅ تمت المزامنة بنجاح - ${stored} سجل جديد`);
      } else {
        toast.info(`ℹ️ لا توجد سجلات جديدة (${skipped} سجل مكرر)`);
      }
    } catch (e) {
      toast.error(e.message || "فشل المزامنة");
    } finally {
      setBusyId(null);
    }
  };

  const doSetTime = async (d) => {
    if (!d?.id) return;
    if (!window.confirm("هل تريد ضبط وقت الجهاز على الوقت الحالي؟")) return;
    setBusyId(d.id);
    try {
      const res = await setDeviceTime(d.id);
      toast.success(res?.message || "تم ضبط الوقت بنجاح ✅");
    } catch (e) {
      toast.error(e.message || "فشل في ضبط الوقت");
    } finally {
      setBusyId(null);
    }
  };

  const doDownloadFingerprints = async (d) => {
    if (!d?.id) return;
    if (!window.confirm("هل تريد جلب البصمات من الجهاز؟")) return;
    setBusyId(d.id);
    try {
      const res = await downloadFingerprints(d.id);
      toast.success(res?.message || "تم جلب البصمات بنجاح ✅");
    } catch (e) {
      toast.error(e.message || "فشل في جلب البصمات");
    } finally {
      setBusyId(null);
    }
  };

  const doUploadFingerprints = async (d) => {
    if (!d?.id) return;
    if (!window.confirm("هل تريد رفع البصمات إلى الجهاز؟")) return;
    setBusyId(d.id);
    try {
      const res = await uploadFingerprints(d.id);
      toast.success(res?.message || "تم رفع البصمات بنجاح ✅");
    } catch (e) {
      toast.error(e.message || "فشل في رفع البصمات");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />

      <div className="flex-1 flex flex-col main-content">
        <Topbar title="أجهزة البصمة" />

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <div className="text-indigo-800 font-bold text-lg">
            عدد الأجهزة: <span className="font-extrabold">{deviceCount}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              type="button"
              disabled={loading}
            >
              تحديث
            </button>
            <button
              onClick={openAdd}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
              type="button"
            >
              ➕ إضافة جهاز
            </button>
          </div>
        </div>

        <main className="flex-1 p-6">
          {loading ? (
            <div className="text-gray-700 font-semibold">جارٍ تحميل الأجهزة...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices?.map((d) => (
                <div key={d.id} className="bg-white shadow rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{d.name || `Device #${d.id}`}</h2>
                      <div className="text-sm text-gray-600 mt-1">
                        IP: {d.ip || d.host || "-"} | Port: {d.port ?? "-"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(d)}
                        className="px-3 py-1 rounded border hover:bg-gray-50"
                        type="button"
                        disabled={busyId === d.id}
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => doDelete(d)}
                        className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                        type="button"
                        disabled={busyId === d.id}
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => doTest(d)}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      اختبار اتصال
                    </button>
                    <button
                      onClick={() => doSync(d)}
                      className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      مزامنة السجلات
                    </button>
                    <button
                      onClick={() => doSetTime(d)}
                      className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      ضبط الوقت
                    </button>
                    <button
                      onClick={() => doDownloadFingerprints(d)}
                      className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      جلب البصمات
                    </button>
                    <button
                      onClick={() => doUploadFingerprints(d)}
                      className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-700"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      رفع البصمات
                    </button>
                    <button
                      onClick={() => navigate("/attendance-logs")}
                      className="px-4 py-2 rounded border hover:bg-gray-50"
                      type="button"
                    >
                      عرض السجلات
                    </button>
                  </div>
                </div>
              ))}

              {!devices?.length && (
                <div className="bg-white shadow rounded-xl p-6 text-gray-700">
                  لا يوجد أجهزة بعد. اضغط \"إضافة جهاز\" لبدء الإعداد.
                </div>
              )}
            </div>
          )}
        </main>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editing ? "تعديل جهاز" : "إضافة جهاز"}
              </h2>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">اسم الجهاز</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">IP</label>
                    <input
                      value={form.ip}
                      onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="192.168.1.10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Port</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 mb-2">Device ID (اختياري)</label>
                    <input
                      value={form.device_id}
                      onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Password (اختياري)</label>
                    <input
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-start gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                  >
                    {editing ? "تحديث" : "حفظ"}
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

