import { useState, useEffect } from 'react';
import api from '../services/api';

const BANKS = [
  { key: 'bank_of_khartoum', name: 'بنك الخرطوم', icon: '🏦' },
  { key: 'bank_of_sudan', name: 'بنك السودان المركزي', icon: '🏛️' },
  { key: 'faisal_islamic_bank', name: 'بنك فيصل الإسلامي', icon: '☪️' },
  { key: 'agricultural_bank', name: 'البنك الزراعي', icon: '🌾' },
  { key: 'industrial_bank', name: 'البنك الصناعي', icon: '🏭' },
  { key: 'other', name: 'بنوك أخرى', icon: '💼' },
];

export default function BankExportPage() {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBank, setSelectedBank] = useState('bank_of_khartoum');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchExports();
  }, []);

  const fetchExports = async () => {
    try {
      const res = await api.get('/bank-exports');
      setExports(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/bank-exports/generate', {
        month,
        year,
        bank_name: selectedBank,
      });
      alert('تم إنشاء كشف التحويل بنجاح');
      fetchExports();
      setModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ أثناء الإنشاء');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/bank-exports/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_export_${id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('حدث خطأ أثناء التحميل');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await api.delete(`/bank-exports/${id}`);
      fetchExports();
    } catch (err) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const getBankName = (key) => BANKS.find(b => b.key === key)?.name || key;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SD').format(amount) + ' جنيه سوداني';
  };

  return (
    <div style={{ padding: '24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a5f' }}>
          📤 تصدير كشف المرتبات البنكي
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ➕ إنشاء كشف جديد
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {BANKS.map(bank => (
          <div
            key={bank.key}
            onClick={() => setSelectedBank(bank.key)}
            style={{
              padding: '20px',
              borderRadius: '12px',
              border: selectedBank === bank.key ? '2px solid #1e3a5f' : '1px solid #e0e0e0',
              background: selectedBank === bank.key ? '#f0f7ff' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{bank.icon}</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{bank.name}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {exports.filter(e => e.bank_name === bank.key).length} كشف
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e0e0', background: '#f8f9fa' }}>
          <h3 style={{ margin: 0, color: '#1e3a5f' }}>سجل التصديرات</h3>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>جاري التحميل...</div>
        ) : exports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            لا توجد تصديرات سابقة
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>البنك</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>الشهر</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>عدد الموظفين</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>الإجمالي</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', color: '#666' }}>الحالة</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#666' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {exports.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getBankName(exp.bank_name)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {new Date(exp.year, exp.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{exp.employee_count}</td>
                  <td style={{ padding: '12px 16px' }}>{formatCurrency(exp.total_amount)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: exp.status === 'completed' ? '#e8f5e9' : '#fff3e0',
                      color: exp.status === 'completed' ? '#2e7d32' : '#ef6c00',
                    }}>
                      {exp.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {exp.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(exp.id)}
                        style={{
                          background: '#1e3a5f',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          marginLeft: '8px',
                        }}
                      >
                        📥 تحميل
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(exp.id)}
                      style={{
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '450px',
            maxWidth: '90%',
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e3a5f' }}>إنشاء كشف جديد</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>البنك</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                }}
              >
                {BANKS.map(bank => (
                  <option key={bank.key} value={bank.key}>{bank.icon} {bank.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>الشهر</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2024, m - 1).toLocaleDateString('ar-EG', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>السنة</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  background: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? 'جاري الإنشاء...' : 'إنشاء الكشف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
