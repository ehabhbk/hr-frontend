// src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ConfirmDialog component */
function ConfirmDialog({ open, title = "تأكيد", message = "هل أنت متأكد؟", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-start gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200">إلغاء</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">نعم</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Settings Page (RTL) ---------- */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");
  const [settings, setSettings] = useState([]);
  const [org, setOrg] = useState({});
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [audits, setAudits] = useState([]);
  const [advancesRequests, setAdvancesRequests] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [leavesRequests, setLeavesRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [incentives, setIncentives] = useState([]);

  useEffect(() => { loadAll(); loadHolidays(); loadIncentives(); }, []);

  async function loadAll() {
    try {
      const [
        sRes,
        orgRes,
        shiftsRes,
        empsRes,
        auditsRes,
        advRes,
        warnRes,
        leavesRes
      ] = await Promise.all([
        api.get("/settings"),
        api.get("/organization"),
        api.get("/work-shifts"),
        api.get("/employees"),
        api.get("/setting-audits"),
        api.get("/advances/requests"),
        api.get("/discipline/warnings"),
        api.get("/leaves/requests"),
      ]);

      setSettings(sRes.data?.data || {});
      setOrg(orgRes.data?.data || {});
      setShifts(shiftsRes.data?.data || []);
      setEmployees(empsRes.data?.data || []);
      setAudits(auditsRes.data?.data || auditsRes.data || []);
      setAdvancesRequests(advRes.data?.data || []);
      setWarnings(warnRes.data?.data || []);
      setLeavesRequests(leavesRes.data?.data || []);
    } catch (err) {
      toast.error("فشل في جلب البيانات");
      console.error(err);
    }
  }

  const getGroup = (key) => settings[key] || {};

  const saveSetting = async (key, value) => {
    try {
      await api.put(`/settings/${key}`, value);
      toast.success("تم حفظ الإعدادات");
      loadAll();
    } catch (err) {
      toast.error("فشل الحفظ");
      console.error(err);
    }
  };

  /* Assignments helpers */
  async function loadAssignments(from, to, employee_id) {
    try {
      const res = await api.get('/shift-assignments', { params: { from, to, employee_id } });
      setAssignments(res.data?.data || []);
    } catch (err) { toast.error('فشل جلب التعيينات'); console.error(err); }
  }

  async function createAssignment(payload) {
    try {
      await api.post('/shift-assignments', payload);
      toast.success('تم إضافة التعيين');
    } catch (err) { toast.error('فشل الإضافة'); console.error(err); }
  }

  async function deleteAssignment(id) {
    try {
      await api.delete(`/shift-assignments/${id}`);
      toast.success('تم حذف التعيين');
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) { toast.error('فشل الحذف'); console.error(err); }
  }

  /* Holidays (public holidays) */
  async function loadHolidays() {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data?.data || []);
    } catch (err) {
      setHolidays([]);
    }
  }

  async function createHoliday(payload) {
    try {
      const res = await api.post('/holidays', payload);
      setHolidays(prev => [res.data?.data || payload, ...prev]);
      toast.success('تم إضافة العطلة الرسمية');
    } catch (err) {
      setHolidays(prev => [{ id: Date.now(), ...payload }, ...prev]);
      toast.success('تم إضافة العطلة محلياً');
    }
  }

  async function deleteHoliday(id) {
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays(prev => prev.filter(h => h.id !== id));
      toast.success('تم حذف العطلة');
    } catch (err) {
      setHolidays(prev => prev.filter(h => h.id !== id));
      toast.success('تم حذف العطلة محلياً');
    }
  }

  /* Incentives */
  async function loadIncentives() {
    try {
      const res = await api.get('/incentives');
      setIncentives(res.data?.data || []);
    } catch (err) {
      setIncentives([]);
    }
  }

  async function createIncentive(payload) {
    try {
      const res = await api.post('/incentives', payload);
      setIncentives(prev => [res.data?.data || payload, ...prev]);
      toast.success('تم إضافة الحافز');
    } catch (err) {
      setIncentives(prev => [{ id: Date.now(), ...payload }, ...prev]);
      toast.success('تم إضافة الحافز محلياً');
    }
  }

  async function deleteIncentive(id) {
    try {
      await api.delete(`/incentives/${id}`);
      setIncentives(prev => prev.filter(i => i.id !== id));
      toast.success('تم حذف الحافز');
    } catch (err) {
      setIncentives(prev => prev.filter(i => i.id !== id));
      toast.success('تم حذف الحافز محلياً');
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar sticky />

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">لوحة إعدادات النظام</h1>
        </header>

        <div className="bg-gray-50 shadow-md p-4 flex justify-between items-center sticky top-16 z-40">
          <span className="text-indigo-800 font-bold text-xl">الإعدادات</span>
        </div>

        <main className="flex-1 p-6" dir="rtl">
          <div className="bg-white rounded-lg shadow" dir="rtl">
            <Tabs active={activeTab} onChange={setActiveTab} />
            <div className="p-4 border-t">
              {activeTab === "organization" && <OrganizationTab org={org} onSaved={loadAll} />}
              {activeTab === "advances" && <AdvancesTab group={getGroup('advances')} onSave={(v)=>saveSetting('advances', v)} requests={advancesRequests} refresh={loadAll} />}
              {activeTab === "attendance" && <AttendanceTab group={getGroup('attendance')} onSave={(v)=>saveSetting('attendance', v)} warnings={warnings} refresh={loadAll} />}
              {activeTab === "leaves" && <LeavesTab group={getGroup('leaves')} onSave={(v)=>saveSetting('leaves', v)} requests={leavesRequests} employees={employees} refresh={loadAll} />}
              {activeTab === "shifts" && <ShiftsTab shifts={shifts} employees={employees} refresh={loadAll} />}
              {activeTab === "assignments" && <AssignmentsTab assignments={assignments} employees={employees} shifts={shifts} refreshAssignments={(from,to,emp)=>loadAssignments(from,to,emp)} onCreate={createAssignment} onDelete={deleteAssignment} />}
              {activeTab === "holidays" && <HolidaysTab holidays={holidays} employees={employees} onCreate={createHoliday} onDelete={deleteHoliday} />}
              {activeTab === "incentives" && <IncentivesTab incentives={incentives} employees={employees} onCreate={createIncentive} onDelete={deleteIncentive} />}
              {activeTab === "financials" && <FinancialsTab group={getGroup('financials')} onSave={(v)=>saveSetting('financials', v)} employees={employees} />}
              {activeTab === "audit" && <AuditTab audits={audits} />}
            </div>
          </div>
        </main>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

/* ---------- Tabs component (RTL) ---------- */
function Tabs({ active, onChange }) {
  const tabs = [
    { key: 'organization', label: 'المؤسسة' },
    { key: 'advances', label: 'السلفيات' },
    { key: 'attendance', label: 'الحضور والإنذارات' },
    { key: 'leaves', label: 'الإجازات' },
    { key: 'shifts', label: 'الورديات' },
    { key: 'assignments', label: 'جدول التعيينات' },
    { key: 'holidays', label: 'العطلات الرسمية' },
    { key: 'incentives', label: 'الحوافز' },
    { key: 'financials', label: 'الإعدادات المالية' },
    { key: 'audit', label: 'سجل التغييرات' },
  ];
  return (
    <div className="flex border-b flex-row-reverse justify-end" dir="rtl">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-3 -mb-px ${active===t.key ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-800'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Organization Tab (RTL) ---------- */
function OrganizationTab({ org, onSaved }) {
  const [form, setForm] = useState(org || {});
  const [logoFile, setLogoFile] = useState(null);
  const [stampFile, setStampFile] = useState(null);

  useEffect(()=>{ setForm(org || {}); },[org]);

  const submit = async () => {
    try {
      const fd = new FormData();
      fd.append('name', form.name || '');
      fd.append('address', form.address || '');
      fd.append('phone', form.phone || '');
      fd.append('email', form.email || '');
      if (logoFile) fd.append('logo', logoFile);
      if (stampFile) fd.append('stamp', stampFile);
      await api.put('/organization', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('تم حفظ بيانات المؤسسة');
      if (onSaved) onSaved();
    } catch (err) {
      toast.error('فشل الحفظ');
      console.error(err);
    }
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-right">
        <input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="اسم المؤسسة" className="border p-2 text-right" />
        <input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="العنوان" className="border p-2 text-right" />
        <input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="هاتف" className="border p-2 text-right" />
        <input value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="بريد إلكتروني" className="border p-2 text-right" />
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="block text-right">
          شعار المؤسسة
          <input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files[0])} className="mt-1" />
        </label>
        <label className="block text-right">
          ختم المؤسسة
          <input type="file" accept="image/*" onChange={e=>setStampFile(e.target.files[0])} className="mt-1" />
        </label>
      </div>

      <div className="mt-3 text-right">
        <button onClick={submit} className="px-3 py-2 bg-blue-600 text-white rounded">حفظ بيانات المؤسسة</button>
      </div>
    </div>
  );
}

/* ---------- Advances Tab (RTL) ---------- */
function AdvancesTab({ group, onSave, requests = [], refresh }) {
  const [cfg, setCfg] = useState(group.value || {});

  useEffect(()=>{ setCfg(group.value || {}); },[group]);

  const save = () => onSave(cfg);

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">إعدادات السلفيات</h4>
          <label className="block mb-2">
            تفعيل السلفيات
            <input type="checkbox" checked={!!cfg.enabled} onChange={e=>setCfg({...cfg, enabled:e.target.checked})} className="mr-2" />
          </label>
          <label className="block mb-2 text-right">
            الحد كنسبة من الراتب (%)
            <input type="number" value={cfg.max_allowed_percent_of_salary||0} onChange={e=>setCfg({...cfg, max_allowed_percent_of_salary: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>
          <label className="block mb-2 text-right">
            نوع السلفة
            <select value={cfg.type||'single'} onChange={e=>setCfg({...cfg, type:e.target.value})} className="border p-1 w-full text-right">
              <option value="single">من مرتب واحد</option>
              <option value="long">سلفة طويلة</option>
            </select>
          </label>
          <label className="block mb-2 text-right">
            فترة السداد بالأشهر
            <input type="number" value={cfg.repayment_period_months||3} onChange={e=>setCfg({...cfg, repayment_period_months: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>
          <label className="block mb-2 text-right">
            الحد الأدنى للأهلية بالشهور
            <input type="number" value={cfg.min_service_months||0} onChange={e=>setCfg({...cfg, min_service_months: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>
          <div className="mt-2 text-right">
            <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">حفظ</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">طلبات السلفيات</h4>
          {requests.length === 0 ? <div className="text-gray-500">لا توجد طلبات</div> : requests.map(r => (
            <div key={r.id} className="border p-2 rounded mb-2 flex justify-between items-center">
              <div className="text-right">
                <div className="font-semibold">{r.employee?.name || r.employee_id} — {r.amount}</div>
                <div className="text-xs text-gray-500">{r.created_at}</div>
              </div>
              <div className="flex gap-2">
                {r.status === 'pending' && <ApproveButton id={r.id} onDone={refresh} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApproveButton({ id, onDone }) {
  const [loading, setLoading] = useState(false);
  const approve = async () => {
    setLoading(true);
    try {
      await api.post(`/advances/requests/${id}/approve`);
      toast.success('تمت الموافقة');
      if (onDone) onDone();
    } catch (err) { toast.error('فشل الموافقة'); console.error(err); }
    setLoading(false);
  };
  return <button onClick={approve} disabled={loading} className="px-2 py-1 bg-green-600 text-white rounded">{loading ? '...' : 'موافقة'}</button>;
}

/* ---------- Attendance Tab (RTL) ---------- */
function AttendanceTab({ group, onSave, warnings = [], refresh }) {
  const [cfg, setCfg] = useState(group.value || {});

  useEffect(()=>{ setCfg(group.value || {}); },[group]);

  const safeTime = (v, def = "08:00") => v ?? def;

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">إعدادات الحضور والورديات</h4>

          <label className="block mb-2 text-right">
            زمن التأخير المسموح به بالثواني
            <input
              type="number"
              value={cfg.allowed_delay_seconds ?? cfg.grace_period_seconds ?? 600}
              onChange={e => setCfg({ ...cfg, allowed_delay_seconds: Number(e.target.value) })}
              className="border p-1 w-full text-right"
            />
          </label>

          <div className="mb-2">
            <div className="font-semibold text-right mb-1">الوردية الصباحية</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={safeTime(cfg.morning_start_time, "07:00")} onChange={e=>setCfg({...cfg, morning_start_time: e.target.value})} className="border p-1 text-right" />
              <input type="time" value={safeTime(cfg.morning_end_time, "12:00")} onChange={e=>setCfg({...cfg, morning_end_time: e.target.value})} className="border p-1 text-right" />
            </div>
          </div>

          <div className="mb-2">
            <div className="font-semibold text-right mb-1">الوردية المسائية</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={safeTime(cfg.evening_start_time, "13:00")} onChange={e=>setCfg({...cfg, evening_start_time: e.target.value})} className="border p-1 text-right" />
              <input type="time" value={safeTime(cfg.evening_end_time, "18:00")} onChange={e=>setCfg({...cfg, evening_end_time: e.target.value})} className="border p-1 text-right" />
            </div>
          </div>

          <div className="mb-2">
            <div className="font-semibold text-right mb-1">الدوام الكامل</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={safeTime(cfg.full_day_start_time, "08:00")} onChange={e=>setCfg({...cfg, full_day_start_time: e.target.value})} className="border p-1 text-right" />
              <input type="time" value={safeTime(cfg.full_day_end_time, "17:00")} onChange={e=>setCfg({...cfg, full_day_end_time: e.target.value})} className="border p-1 text-right" />
            </div>
          </div>

          <label className="block mb-2 text-right">
            زمن احتساب الغياب بالثواني
            <input
              type="number"
              value={cfg.absence_count_after_seconds ?? 14400}
              onChange={e => setCfg({ ...cfg, absence_count_after_seconds: Number(e.target.value) })}
              className="border p-1 w-full text-right"
            />
          </label>

          <label className="block mb-2 text-right">
            عدد التأخيرات قبل الإنذار
            <input
              type="number"
              value={cfg.late_warning_threshold ?? 3}
              onChange={e => setCfg({ ...cfg, late_warning_threshold: Number(e.target.value) })}
              className="border p-1 w-full text-right"
            />
          </label>

          <label className="block mb-2 text-right">
            بعد كم تأخير يبدأ الخصم
            <input
              type="number"
              value={cfg.late_deduction_start_after ?? 5}
              onChange={e => setCfg({ ...cfg, late_deduction_start_after: Number(e.target.value) })}
              className="border p-1 w-full text-right"
            />
          </label>

          <label className="block mb-2 text-right">
            نسبة الخصم لكل تأخر بعد البداية (%)
            <input
              type="number"
              step="0.1"
              value={cfg.late_deduction_percent_each ?? 1.5}
              onChange={e => setCfg({ ...cfg, late_deduction_percent_each: Number(e.target.value) })}
              className="border p-1 w-full text-right"
            />
          </label>

          <div className="mt-2 text-right">
            <button onClick={()=>onSave(cfg)} className="px-3 py-1 bg-green-600 text-white rounded">حفظ</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">سجل الإنذارات</h4>
          {warnings.length === 0 ? <div className="text-gray-500">لا توجد إنذارات</div> : warnings.map(w => (
            <div key={w.id} className="border p-2 rounded mb-2">
              <div className="font-semibold">{w.employee?.name || w.employee_id}</div>
              <div className="text-xs text-gray-500">{w.note} · {w.created_at}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Leaves Tab (RTL) ---------- */
function LeavesTab({ group, onSave, requests = [], employees = [], refresh }) {
  const [cfg, setCfg] = useState(group.value || {});
  const [gradeKey, setGradeKey] = useState("");
  const [gradeDays, setGradeDays] = useState(0);

  useEffect(()=>{ setCfg(group.value || {}); },[group]);

  const handleStatus = async (id, status) => {
    try {
      await api.post(`/leaves/requests/${id}/status`, { status });
      toast.success(`تم ${status === 'approved' ? 'الموافقة' : 'رفض'} الإجازة`);
      if (refresh) refresh();
    } catch (err) { toast.error('فشل تحديث الحالة'); }
  };

  const addOrUpdateGrade = () => {
    if (!gradeKey) return;
    const newByGrade = { ...(cfg.by_grade || {}) };
    newByGrade[gradeKey] = Number(gradeDays || 0);
    setCfg({ ...cfg, by_grade: newByGrade });
    setGradeKey("");
    setGradeDays(0);
  };

  const removeGrade = (k) => {
    const newByGrade = { ...(cfg.by_grade || {}) };
    delete newByGrade[k];
    setCfg({ ...cfg, by_grade: newByGrade });
  };

  const save = () => onSave(cfg);

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">إعدادات الإجازات العامة</h4>

          <label className="block mb-2 text-right">
            عدد أيام الإجازة السنوية الافتراضي
            <input type="number" value={cfg.annual_days ?? 21} onChange={e=>setCfg({...cfg, annual_days: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>

          <label className="block mb-2 text-right">
            عدد أيام الإجازة المرضية (سنة)
            <input type="number" value={cfg.sick_days ?? 10} onChange={e=>setCfg({...cfg, sick_days: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>

          <label className="block mb-2 text-right">
            عدد أيام إجازة الأمومة
            <input type="number" value={cfg.maternity_days ?? 90} onChange={e=>setCfg({...cfg, maternity_days: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>

          <label className="block mb-2 text-right">
            احتساب الأقدمية
            <select value={cfg.count_service ? "1" : "0"} onChange={e=>setCfg({...cfg, count_service: e.target.value === "1"})} className="border p-1 w-full text-right">
              <option value="1">نعم</option>
              <option value="0">لا</option>
            </select>
          </label>

          <label className="block mb-2 text-right">
            إشعار قبل الإجازة (أيام)
            <input type="number" value={cfg.notice_days ?? 3} onChange={e=>setCfg({...cfg, notice_days: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>

          <div className="mt-2 text-right">
            <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">حفظ</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">الإجازات بحسب الدرجة الوظيفية</h4>

          <div className="mb-3">
            <div className="flex gap-2">
              <input placeholder="الدرجة الوظيفية (مثال: junior)" value={gradeKey} onChange={e=>setGradeKey(e.target.value)} className="border p-1 flex-1 text-right" />
              <input type="number" placeholder="أيام الإجازة" value={gradeDays} onChange={e=>setGradeDays(Number(e.target.value))} className="border p-1 w-32 text-right" />
              <button onClick={addOrUpdateGrade} className="px-3 py-1 bg-blue-600 text-white rounded">إضافة / تحديث</button>
            </div>
          </div>

          <div className="space-y-2">
            {Object.keys(cfg.by_grade || {}).length === 0 ? (
              <div className="text-gray-500">لم تُحدد درجات وظيفية بعد</div>
            ) : (
              Object.entries(cfg.by_grade || {}).map(([k,v]) => (
                <div key={k} className="flex justify-between items-center border p-2 rounded">
                  <div className="text-right">
                    <div className="font-semibold">{k}</div>
                    <div className="text-xs text-gray-500">{v} يوم/سنة</div>
                  </div>
                  <div>
                    <button onClick={()=>removeGrade(k)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 border p-3 rounded text-right">
        <h4 className="font-semibold mb-2">طلبات الإجازات الواردة</h4>
        {requests.length === 0 ? <div className="text-gray-500">لا توجد طلبات</div> : requests.map(r => (
          <div key={r.id} className="border p-2 rounded mb-2 flex justify-between items-center">
            <div>
              <div className="font-semibold">{r.employee?.name || r.employee_id} — {r.type}</div>
              <div className="text-xs text-gray-500">{r.from_date} → {r.to_date} · {r.status === 'pending' ? 'قيد الانتظار' : r.status === 'approved' ? 'موافق عليها' : 'مرفوضة'}</div>
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatus(r.id, 'approved')} className="px-2 py-1 bg-green-600 text-white rounded text-sm">موافقة</button>
                <button onClick={() => handleStatus(r.id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded text-sm">رفض</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Holidays Tab (RTL) ---------- */
function HolidaysTab({ holidays = [], employees = [], onCreate, onDelete }) {
  const [list, setList] = useState(holidays || []);
  const [form, setForm] = useState({ name: "", date: "", duration_days: 1, employee_ids: [] });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  useEffect(()=>{ setList(holidays || []); },[holidays]);

  const toggleEmployee = (id) => {
    const arr = form.employee_ids || [];
    if (arr.includes(id)) setForm({ ...form, employee_ids: arr.filter(x=>x!==id) });
    else setForm({ ...form, employee_ids: [...arr, id] });
  };

  const submit = async () => {
    if (!form.name || !form.date) { toast.error('أكمل اسم وتاريخ العطلة'); return; }
    const payload = { ...form };
    await onCreate(payload);
    setForm({ name: "", date: "", duration_days: 1, employee_ids: [] });
  };

  const confirmRemove = (id) => { setToDeleteId(id); setConfirmOpen(true); };
  const doRemove = async () => {
    if (!toDeleteId) return;
    await onDelete(toDeleteId);
    setList(prev => prev.filter(h => h.id !== toDeleteId));
    setConfirmOpen(false);
    setToDeleteId(null);
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">إضافة عطلة رسمية</h4>
          <input placeholder="اسم العطلة" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border p-2 w-full mb-2 text-right" />
          <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="border p-2 w-full mb-2 text-right" />
          <input type="number" min="1" value={form.duration_days} onChange={e=>setForm({...form,duration_days: Number(e.target.value)})} className="border p-2 w-full mb-2 text-right" />
          <div className="mb-2 text-right">
            <div className="text-sm mb-1">تطبيق على موظفين محددين (اختياري)</div>
            <div className="max-h-40 overflow-auto border p-2 rounded">
              {employees.length === 0 ? <div className="text-gray-500">لا يوجد موظفين</div> : employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 mb-1">
                  <input type="checkbox" checked={(form.employee_ids||[]).includes(emp.id)} onChange={()=>toggleEmployee(emp.id)} />
                  <span className="text-sm">{emp.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="text-right">
            <button onClick={submit} className="px-3 py-1 bg-green-600 text-white rounded">إضافة العطلة</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">قائمة العطلات الرسمية</h4>
          {list.length === 0 ? <div className="text-gray-500">لا توجد عطلات</div> : list.map(h => (
            <div key={h.id} className="border p-2 rounded mb-2 flex justify-between items-center">
              <div className="text-right">
                <div className="font-semibold">{h.name}</div>
                <div className="text-xs text-gray-500">{h.date} · مدة {h.duration_days || 1} يوم</div>
                {h.employee_ids && h.employee_ids.length > 0 && <div className="text-xs text-gray-600">محددة لعدد {h.employee_ids.length} موظف</div>}
              </div>
              <div>
                <button onClick={()=>confirmRemove(h.id)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="تأكيد حذف العطلة" message="هل تريد حذف هذه العطلة؟" onConfirm={doRemove} onCancel={()=>{ setConfirmOpen(false); setToDeleteId(null); }} />
    </div>
  );
}

/* ---------- Incentives Tab (RTL) ---------- */
function IncentivesTab({ incentives = [], employees = [], onCreate, onDelete }) {
  const [list, setList] = useState(incentives || []);
  const [form, setForm] = useState({ type: "bonus", value: 0, employee_id: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  useEffect(()=>{ setList(incentives || []); },[incentives]);

  const submit = async () => {
    if (!form.type || !form.value || !form.employee_id) { toast.error('أكمل نوع الحافز، قيمته، والموظف'); return; }
    await onCreate(form);
    setForm({ type: "bonus", value: 0, employee_id: "" });
  };

  const confirmRemove = (id) => { setToDeleteId(id); setConfirmOpen(true); };
  const doRemove = async () => {
    if (!toDeleteId) return;
    await onDelete(toDeleteId);
    setList(prev => prev.filter(i => i.id !== toDeleteId));
    setConfirmOpen(false);
    setToDeleteId(null);
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">إضافة حافز</h4>

          <label className="block mb-2 text-right">
            نوع الحافز
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="border p-1 w-full text-right">
              <option value="bonus">مكافأة</option>
              <option value="allowance">بدل</option>
              <option value="commission">عمولة</option>
              <option value="other">أخرى</option>
            </select>
          </label>

          <label className="block mb-2 text-right">
            قيمة الحافز
            <input type="number" value={form.value} onChange={e=>setForm({...form,value: Number(e.target.value)})} className="border p-1 w-full text-right" />
          </label>

          <label className="block mb-2 text-right">
            الموظف المستحق
            <select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} className="border p-1 w-full text-right">
              <option value="">اختر موظف</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </label>

          <div className="text-right">
            <button onClick={submit} className="px-3 py-1 bg-green-600 text-white rounded">إضافة الحافز</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">قائمة الحوافز</h4>
          {list.length === 0 ? <div className="text-gray-500">لا توجد حوافز</div> : list.map(i => (
            <div key={i.id} className="border p-2 rounded mb-2 flex justify-between items-center">
              <div className="text-right">
                <div className="font-semibold">{i.type} — {i.value}</div>
                <div className="text-xs text-gray-500">{employees.find(e=>e.id===i.employee_id)?.name || i.employee_id}</div>
              </div>
              <div>
                <button onClick={()=>confirmRemove(i.id)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="تأكيد حذف الحافز" message="هل تريد حذف هذا الحافز؟" onConfirm={doRemove} onCancel={()=>{ setConfirmOpen(false); setToDeleteId(null); }} />
    </div>
  );
}

/* ---------- Financials Tab (RTL) ----------
   - annual_increases: combined by job_type and grade in one entry
   - personal_income_tax: enabled, percent, threshold (optional)
*/
function FinancialsTab({ group, onSave, employees = [] }) {
  const [cfg, setCfg] = useState(group.value || {
    annual_increases: { combined: [], per_employee: {} },
    personal_income_tax: { enabled: false, percent: 0, threshold: 0 }
  });

  const [empSelect, setEmpSelect] = useState("");
  const [empIncrease, setEmpIncrease] = useState(0);
  const [combinedJobType, setCombinedJobType] = useState("");
  const [combinedGrade, setCombinedGrade] = useState("");
  const [combinedPercent, setCombinedPercent] = useState(0);

  useEffect(()=>{ setCfg(group.value || {
    annual_increases: { combined: [], per_employee: {} },
    personal_income_tax: { enabled: false, percent: 0, threshold: 0 }
  }); },[group]);

  const save = () => onSave(cfg);

  const addCombined = () => {
    if (!combinedJobType && !combinedGrade) return;
    const newCombined = [...(cfg.annual_increases?.combined || [])];
    newCombined.push({
      job_type: combinedJobType,
      grade: combinedGrade,
      percent: Number(combinedPercent || 0)
    });
    setCfg({ ...cfg, annual_increases: { ...(cfg.annual_increases || {}), combined: newCombined } });
    setCombinedJobType(""); setCombinedGrade(""); setCombinedPercent(0);
  };

  const removeCombined = (index) => {
    const newCombined = [...(cfg.annual_increases?.combined || [])];
    newCombined.splice(index, 1);
    setCfg({ ...cfg, annual_increases: { ...(cfg.annual_increases || {}), combined: newCombined } });
  };

  const addPerEmployee = () => {
    if (!empSelect) return;
    const perEmp = { ...(cfg.annual_increases?.per_employee || {}) };
    perEmp[empSelect] = Number(empIncrease || 0);
    setCfg({ ...cfg, annual_increases: { ...(cfg.annual_increases || {}), per_employee: perEmp } });
    setEmpSelect(""); setEmpIncrease(0);
  };

  const removePerEmployee = (id) => {
    const perEmp = { ...(cfg.annual_increases?.per_employee || {}) };
    delete perEmp[id];
    setCfg({ ...cfg, annual_increases: { ...(cfg.annual_increases || {}), per_employee: perEmp } });
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">الزيادة السنوية للمرتب</h4>

          <div className="mb-3">
            <div className="text-sm font-semibold mb-1">حسب الوظيفة والدرجة (إضافة واحدة)</div>
            <div className="flex gap-2 mb-2">
              <input 
                placeholder="نوع الوظيفة (اختياري)" 
                value={combinedJobType} 
                onChange={e=>setCombinedJobType(e.target.value)} 
                className="border p-1 flex-1 text-right" 
              />
              <input 
                placeholder="الدرجة الوظيفية (اختياري)" 
                value={combinedGrade} 
                onChange={e=>setCombinedGrade(e.target.value)} 
                className="border p-1 flex-1 text-right" 
              />
              <input 
                type="number" 
                placeholder="%" 
                value={combinedPercent} 
                onChange={e=>setCombinedPercent(Number(e.target.value))} 
                className="border p-1 w-20 text-right" 
              />
            </div>
            <button onClick={addCombined} className="px-3 py-1 bg-blue-600 text-white rounded w-full">إضافة</button>
          </div>

          <div className="space-y-2 mb-4">
            {(cfg.annual_increases?.combined || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border p-2 rounded">
                <div className="text-right">
                  <div className="font-semibold">
                    {item.job_type || '—'} {item.job_type && item.grade ? '/' : ''} {item.grade || '—'}
                  </div>
                  <div className="text-xs text-gray-500">{item.percent}%</div>
                </div>
                <div>
                  <button onClick={()=>removeCombined(idx)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <div className="text-sm font-semibold mb-1">زيادة مخصصة لموظف</div>
            <div className="flex gap-2 mb-2">
              <select value={empSelect} onChange={e=>setEmpSelect(e.target.value)} className="border p-1 flex-1 text-right">
                <option value="">اختر موظف</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <input type="number" placeholder="%" value={empIncrease} onChange={e=>setEmpIncrease(Number(e.target.value))} className="border p-1 w-28 text-right" />
              <button onClick={addPerEmployee} className="px-3 py-1 bg-blue-600 text-white rounded">إضافة</button>
            </div>
            <div className="space-y-2">
              {Object.entries(cfg.annual_increases?.per_employee || {}).map(([id,v]) => (
                <div key={id} className="flex justify-between items-center border p-2 rounded">
                  <div className="text-right">
                    <div className="font-semibold">{employees.find(e=>e.id===id)?.name || id}</div>
                    <div className="text-xs text-gray-500">{v}%</div>
                  </div>
                  <div>
                    <button onClick={()=>removePerEmployee(id)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 text-right">
            <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">حفظ الإعدادات المالية</button>
          </div>
        </div>

        <div className="border p-3 rounded text-right">
          <h4 className="font-semibold mb-2">ضريبة الدخل الشخصي</h4>

          <label className="block mb-2 text-right">
            تفعيل ضريبة الدخل
            <input type="checkbox" checked={!!(cfg.personal_income_tax?.enabled)} onChange={e=>setCfg({...cfg, personal_income_tax: {...(cfg.personal_income_tax||{}), enabled: e.target.checked}})} className="mr-2" />
          </label>

          <label className="block mb-2 text-right">
            نسبة الضريبة من الراتب الأساسي (%)
            <input type="number" value={cfg.personal_income_tax?.percent ?? 0} onChange={e=>setCfg({...cfg, personal_income_tax: {...(cfg.personal_income_tax||{}), percent: Number(e.target.value)}})} className="border p-1 w-full text-right" />
          </label>

          <label className="block mb-2 text-right">
            حد الإعفاء أو العتبة (الراتب الأساسي) - اختياري
            <input type="number" value={cfg.personal_income_tax?.threshold ?? 0} onChange={e=>setCfg({...cfg, personal_income_tax: {...(cfg.personal_income_tax||{}), threshold: Number(e.target.value)}})} className="border p-1 w-full text-right" />
          </label>

          <div className="text-sm text-gray-600 mb-2">
            يمكن تطبيق الضريبة على الراتب الأساسي بعد تجاوز العتبة إن وُجدت.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shifts Tab (RTL) ---------- */
function ShiftsTab({ shifts = [], employees = [], refresh }) {
  const [list, setList] = useState(shifts || []);
  const [form, setForm] = useState({ name:'', start_time:'08:00', end_time:'16:00', week_days:[], weekend_days:[], daily_hours:8, notes:'', active:true });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(()=>{ setList(shifts || []); },[shifts]);

  const days = ['mon','tue','wed','thu','fri','sat','sun'];
  const toggleDay = (arr, d) => arr.includes(d) ? arr.filter(x=>x!==d) : [...arr, d];

  const save = async () => {
    try {
      await api.post('/work-shifts', form);
      toast.success('تم إنشاء الوردية');
      const res = await api.get('/work-shifts');
      setList(res.data?.data || []);
      setForm({ name:'', start_time:'08:00', end_time:'16:00', week_days:[], weekend_days:[], daily_hours:8, notes:'', active:true });
      if (refresh) refresh();
    } catch (err) { toast.error('فشل الإنشاء'); console.error(err); }
  };

  const confirmRemove = (id) => { setToDelete(id); setConfirmOpen(true); };
  const doRemove = async () => {
    try {
      await api.delete(`/work-shifts/${toDelete}`);
      toast.success('تم الحذف');
      setList(prev => prev.filter(s => s.id !== toDelete));
      setConfirmOpen(false);
      setToDelete(null);
      if (refresh) refresh();
    } catch (err) { toast.error('فشل الحذف'); console.error(err); }
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {list.map(s => (
          <div key={s.id} className="border p-2 rounded flex justify-between items-center">
            <div className="text-right">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-gray-500">{s.start_time || '—'} — {s.end_time || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>confirmRemove(s.id)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
            </div>
          </div>
        ))}
      </div>

      <div className="border p-3 rounded text-right">
        <h4 className="font-semibold mb-2">إنشاء وردية</h4>
        <input placeholder="اسم الوردية" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border p-2 w-full mb-2 text-right" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} className="border p-2" />
          <input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} className="border p-2" />
        </div>

        <div className="mb-2 text-right">
          <div className="text-sm mb-1">أيام العمل</div>
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <label key={d} className={`px-2 py-1 border rounded cursor-pointer ${form.week_days.includes(d)?'bg-blue-100':''}`}>
                <input type="checkbox" checked={form.week_days.includes(d)} onChange={()=>setForm({...form, week_days: toggleDay(form.week_days,d)})} className="ml-1" />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-2 text-right">
          <div className="text-sm mb-1">أيام العطلة الأسبوعية</div>
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <label key={d} className={`px-2 py-1 border rounded cursor-pointer ${form.weekend_days.includes(d)?'bg-yellow-100':''}`}>
                <input type="checkbox" checked={form.weekend_days.includes(d)} onChange={()=>setForm({...form, weekend_days: toggleDay(form.weekend_days,d)})} className="ml-1" />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-2 text-right">
          <label>ساعات العمل اليومية
            <input type="number" value={form.daily_hours} onChange={e=>setForm({...form,daily_hours: Number(e.target.value)})} className="border p-1 mr-2" />
          </label>
        </div>

        <textarea placeholder="ملاحظات" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="border p-2 w-full mb-2 text-right" />

        <div className="text-right">
          <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">إنشاء</button>
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="تأكيد حذف الوردية" message="هل تريد حذف هذه الوردية؟" onConfirm={doRemove} onCancel={()=>{ setConfirmOpen(false); setToDelete(null); }} />
    </div>
  );
}

/* ---------- Assignments Tab (RTL) ---------- */
function AssignmentsTab({ assignments = [], employees = [], shifts = [], refreshAssignments, onCreate, onDelete }) {
  const [filter, setFilter] = useState({ from:'', to:'', employee_id:'' });
  const [form, setForm] = useState({ employee_id:'', work_shift_id:'', date:'' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  const confirmDelete = (id) => { setToDeleteId(id); setConfirmOpen(true); };
  const doDelete = async () => {
    if (!toDeleteId) return;
    try {
      await onDelete(toDeleteId);
      setConfirmOpen(false);
      setToDeleteId(null);
    } catch (err) {
      setConfirmOpen(false);
      setToDeleteId(null);
    }
  };

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input type="date" value={filter.from} onChange={e=>setFilter({...filter,from:e.target.value})} className="border p-2 text-right" />
        <input type="date" value={filter.to} onChange={e=>setFilter({...filter,to:e.target.value})} className="border p-2 text-right" />
        <select value={filter.employee_id} onChange={e=>setFilter({...filter,employee_id:e.target.value})} className="border p-2 text-right">
          <option value="">كل الموظفين</option>
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <button onClick={()=>refreshAssignments(filter.from, filter.to, filter.employee_id)} className="bg-blue-600 text-white px-3 py-2 rounded">عرض</button>
      </div>

      <div className="mb-4 border p-3 rounded text-right">
        <h4 className="font-semibold mb-2">إضافة تعيين</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} className="border p-2 text-right">
            <option value="">اختر موظف</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <select value={form.work_shift_id} onChange={e=>setForm({...form,work_shift_id:e.target.value})} className="border p-2 text-right">
            <option value="">اختر وردية</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="border p-2 text-right" />
        </div>
        <div className="mt-2 text-right">
          <button onClick={()=>onCreate(form)} className="bg-green-600 text-white px-3 py-2 rounded">إضافة</button>
        </div>
      </div>

      <div className="space-y-2">
        {assignments.length === 0 ? <div className="text-gray-500 text-right">لا توجد تعيينات</div> : assignments.map(a => (
          <div key={a.id} className="border p-2 rounded flex justify-between">
            <div className="text-right">
              <div className="font-semibold">{a.employee?.name || a.employee_id}</div>
              <div className="text-xs text-gray-500">{a.date} — {a.shift?.name || a.work_shift_id}</div>
            </div>
            <div>
              <button onClick={()=>confirmDelete(a.id)} className="px-2 py-1 bg-red-500 text-white rounded">حذف</button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog open={confirmOpen} title="تأكيد حذف التعيين" message="هل تريد حذف هذا التعيين؟" onConfirm={doDelete} onCancel={()=>{ setConfirmOpen(false); setToDeleteId(null); }} />
    </div>
  );
}

/* ---------- Audit Tab (RTL) ---------- */
function AuditTab({ audits = [] }) {
  return (
    <div dir="rtl">
      {audits.length === 0 ? <div className="text-gray-500 text-right">لا توجد سجلات</div> : audits.map(a => (
        <div key={a.id} className="border p-2 rounded mb-2 text-right">
          <div className="text-sm text-gray-600">{a.setting_key} — {a.created_at}</div>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify({old:a.old_value,new:a.new_value}, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}