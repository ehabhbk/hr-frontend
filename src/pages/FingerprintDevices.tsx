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
} from "../services/fingerprintApi";
import api from "../services/api";

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

  const [deviceInfo, setDeviceInfo] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [deviceUsers, setDeviceUsers] = useState([]);

  const doShowInfo = async (d) => {
    if (!d?.id) return;
    setBusyId(d.id);
    try {
      const res = await api.get(`/attendance-device/${d.id}/info`);
      setDeviceInfo(res?.data?.data || res?.data || {});
      setShowInfoModal(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل جلب معلومات الجهاز");
    } finally {
      setBusyId(null);
    }
  };

  const doShowUsers = async (d) => {
    if (!d?.id) return;
    setBusyId(d.id);
    try {
      const res = await api.get(`/attendance-device/${d.id}/users`);
      const users = res?.data?.data || [];
      setDeviceUsers(Array.isArray(users) ? users : Object.values(users));
      setShowUsersModal(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل جلب المستخدمين");
    } finally {
      setBusyId(null);
    }
  };

  const doEnable = async (d, enable) => {
    if (!d?.id) return;
    setBusyId(d.id);
    try {
      await api.post(`/attendance-device/${d.id}/${enable ? 'enable' : 'disable'}`);
      await load();
      toast.success(enable ? "✅ تم تفعيل الجهاز" : "✅ تم تعطيل الجهاز");
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل");
    } finally {
      setBusyId(null);
    }
  };

  const doDownloadFingerprints = async (d) => {
    if (!d?.id) return;
    if (!window.confirm("هل تريد جلب البصمات من الجهاز وحفظها في قاعدة البيانات؟")) return;
    setBusyId(d.id);
    try {
      const res = await downloadFingerprints(d.id);
      const count = typeof res === 'object' ? Object.keys(res).length : 0;
      toast.success(`✅ تم جلب بصمات ${count} مستخدم من الجهاز`);
    } catch (e) {
      toast.error(e.message || "فشل في جلب البصمات");
    } finally {
      setBusyId(null);
    }
  };

  const [showSyncAllModal, setShowSyncAllModal] = useState(false);
  const [syncAllResults, setSyncAllResults] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);

  const doSyncAll = async () => {
    setShowSyncAllModal(true);
    setSyncingAll(true);
    setSyncAllResults([]);
    try {
      const res = await api.post('/attendance-device/sync-all');
      const results = res?.data?.results || res?.data?.data || [];
      setSyncAllResults(Array.isArray(results) ? results : [results]);
      toast.success("✅ تمت المزامنة لجميع الأجهزة");
    } catch (e) {
      toast.error(e.response?.data?.message || "فشل المزامنة الكلية");
    } finally {
      setSyncingAll(false);
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
              onClick={doSyncAll}
              className="px-4 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-50"
              type="button"
            >
              مزامنة الكل
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
                      <h2 className="text-lg font-bold text-gray-800">{d.name || `جهاز #${d.id}`}</h2>
                      <div className="text-sm text-gray-600 mt-1">
                        {d.host || d.ip}:{d.port ?? 4370}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {d.enabled ? 'مفعل' : 'معطل'}
                        </span>
                        {d.serial_number && (
                          <span className="text-xs text-gray-400">{d.serial_number}</span>
                        )}
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => doTest(d)}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      📡 اختبار
                    </button>
                    <button
                      onClick={() => doShowInfo(d)}
                      className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      ℹ️ معلومات
                    </button>
                    <button
                      onClick={() => doShowUsers(d)}
                      className="px-3 py-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      👥 مستخدمين
                    </button>
                    <button
                      onClick={() => doSync(d)}
                      className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      🔄 مزامنة
                    </button>
                    <button
                      onClick={() => doSetTime(d)}
                      className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      🕐 ضبط وقت
                    </button>
                    <button
                      onClick={() => doDownloadFingerprints(d)}
                      className="px-3 py-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 text-sm"
                      type="button"
                      disabled={busyId === d.id}
                    >
                      👇 جلب بصمات
                    </button>
                    {d.enabled ? (
                      <button
                        onClick={() => doEnable(d, false)}
                        className="px-3 py-1.5 rounded bg-yellow-600 text-white hover:bg-yellow-700 text-sm"
                        type="button"
                        disabled={busyId === d.id}
                      >
                        ⏸ تعطيل
                      </button>
                    ) : (
                      <button
                        onClick={() => doEnable(d, true)}
                        className="px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 text-sm"
                        type="button"
                        disabled={busyId === d.id}
                      >
                        ▶️ تفعيل
                      </button>
                    )}
                    <button
                      onClick={() => navigate("/attendance-logs")}
                      className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                      type="button"
                    >
                      📋 سجلات
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

        {/* نافذة معلومات الجهاز */}
        {showInfoModal && deviceInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">ℹ️ معلومات الجهاز</h2>
              <div className="space-y-2">
                {Object.entries(deviceInfo).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b pb-1">
                    <span className="text-gray-600 font-medium">{key}</span>
                    <span className="font-semibold">{String(val ?? '-')}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowInfoModal(false)} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* نافذة مستخدمي الجهاز */}
        {showUsersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-4">👥 مستخدمي الجهاز ({deviceUsers.length})</h2>
              {deviceUsers.length === 0 ? (
                <p className="text-gray-500">لا يوجد مستخدمين على الجهاز</p>
              ) : (
                <div className="space-y-1">
                  {deviceUsers.map((u, i) => (
                    <div key={i} className="flex justify-between border-b pb-1 text-sm">
                      <span className="font-semibold">{u.name || u.userid || `UID: ${u.uid}`}</span>
                      <span className="text-gray-500">#{u.userid || u.uid}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowUsersModal(false)} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* نافذة نتائج المزامنة الكلية */}
        {showSyncAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {syncingAll ? '🔄 جاري مزامنة جميع الأجهزة...' : '✅ نتائج المزامنة الكلية'}
              </h2>
              {syncingAll ? (
                <div className="text-center py-8">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">يرجى الانتظار...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncAllResults.map((r, i) => (
                    <div key={i} className="flex justify-between border-b pb-1">
                      <span className="font-semibold">{r.device || r.device_name || `جهاز #${i+1}`}</span>
                      <span className={`${r.status === 'ok' ? 'text-green-600' : r.status === 'connection_failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {r.status === 'ok' ? `✅ ${r.inserted || 0} سجل` :
                         r.status === 'connection_failed' ? '❌ فشل اتصال' :
                         r.message || r.status}
                      </span>
                    </div>
                  ))}
                  <button onClick={() => setShowSyncAllModal(false)} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">
                    إغلاق
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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

