import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_BANKS } from '../config/banks';
import { fetchCurrency } from '../config/currency';
import { formatDateDisplay } from '../utils/dateUtils';

const BANKS = BASE_BANKS;

export default function BankExportPage() {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBank, setSelectedBank] = useState('فهد');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [addBankModal, setAddBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [currency, setCurrency] = useState({ currency: 'SDG', currency_symbol: 'جنيه' });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [customBanks, setCustomBanks] = useState([]);

  useEffect(() => {
    fetchExports();
    fetchEmployees();
    fetchCustomBanks();
    fetchCurrencyInfo();
  }, []);

  const fetchCurrencyInfo = async () => {
    try {
      const curr = await fetchCurrency();
      setCurrency(curr);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomBanks = async () => {
    try {
      const res = await api.get('/banks/custom');
      setCustomBanks(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Refresh custom banks when modal opens
  useEffect(() => {
    if (addBankModal) {
      fetchCustomBanks();
    }
  }, [addBankModal]);

  const fetchExports = async () => {
    try {
      const res = await api.get('/bank-exports');
      const exportsData = res.data?.data || res.data || [];
      if (Array.isArray(exportsData)) {
        setExports(exportsData);
      } else if (exportsData.data && Array.isArray(exportsData.data)) {
        setExports(exportsData.data);
      } else {
        setExports([]);
      }
    } catch (err) {
      console.error(err);
      setExports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBankSelect = (bankKey) => {
    setSelectedBank(bankKey);
    // Auto-select employees with this bank account
    const employeesWithBank = employees.filter(e => 
      e.bank_name === bankKey && e.bank_account && e.bank_account.trim() !== ''
    );
    setSelectedEmployees(employeesWithBank.map(e => e.id));
  };

  const handlePreview = async () => {
    if (selectedEmployees.length === 0) {
      toast.warning('يرجى اختيار موظفين أولاً');
      return;
    }

    setGenerating(true);
    try {
      const selectedEmpData = employees.filter(e => selectedEmployees.includes(e.id));
      
      // Calculate totals
      let totalBaseSalary = 0;
      let totalPositionAllowance = 0;
      let totalTransport = 0;
      let totalHousing = 0;
      let totalFood = 0;
      let totalPhone = 0;
      let totalOther = 0;
      let totalIncentives = 0;
      let totalInsurance = 0;
      let totalNet = 0;

      selectedEmpData.forEach(emp => {
        totalBaseSalary += parseFloat(emp.base_salary) || 0;
        totalPositionAllowance += parseFloat(emp.position_allowance) || 0;
        totalInsurance += parseFloat(emp.insurance_amount) || 0;
        totalNet += parseFloat(emp.total_salary) || 0;
        
        // Parse allowances
        if (emp.allowances && Array.isArray(emp.allowances)) {
          emp.allowances.forEach(a => {
            if (a.type?.includes('transport')) totalTransport += parseFloat(a.value) || 0;
            else if (a.type?.includes('housing')) totalHousing += parseFloat(a.value) || 0;
            else if (a.type?.includes('food')) totalFood += parseFloat(a.value) || 0;
            else if (a.type?.includes('phone')) totalPhone += parseFloat(a.value) || 0;
            else totalOther += parseFloat(a.value) || 0;
          });
        }
        
        // Parse incentives
        if (emp.incentives && Array.isArray(emp.incentives)) {
          emp.incentives.forEach(i => {
            totalIncentives += parseFloat(i.value) || 0;
          });
        }
      });

      setPreviewData({
        bank: BANKS.find(b => b.key === selectedBank)?.name || selectedBank,
        month,
        year,
        employees: selectedEmpData,
        totalBaseSalary,
        totalPositionAllowance,
        totalTransport,
        totalHousing,
        totalFood,
        totalPhone,
        totalOther,
        totalIncentives,
        totalInsurance,
        totalNet,
      });
    } catch (err) {
      toast.error('حدث خطأ أثناء المعاينة');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedEmployees.length === 0) {
      toast.warning('يرجى اختيار موظفين أولاً');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/bank-exports/generate', {
        month,
        year,
        bank_name: selectedBank,
        employee_ids: selectedEmployees,
      });
      toast.success('تم إنشاء كشف التحويل بنجاح ✅');
      fetchExports();
      setModalOpen(false);
      setPreviewData(null);
      setSelectedEmployees([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء الإنشاء ❌');
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
      a.download = `كشف_تحويل_${id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('تم تحميل الكشف بنجاح ✅');
    } catch (err) {
      toast.error('حدث خطأ أثناء التحميل ❌');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف الكشف؟')) return;
    try {
      await api.delete(`/bank-exports/${id}`);
      toast.success('تم حذف الكشف بنجاح ✅');
      fetchExports();
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف ❌');
    }
  };

  const getBankName = (key) => BANKS.find(b => b.key === key)?.name || key;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SD').format(amount || 0) + ' ' + currency.currency_symbol;
  };

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const addNewBank = async () => {
    if (!newBankName.trim()) {
      toast.warning('يرجى إدخال اسم البنك');
      return;
    }
    
    try {
      const res = await api.post('/banks/custom', { name: newBankName.trim() });
      const newBank = res.data?.data;
      if (newBank) {
        // Refresh custom banks from server
        fetchCustomBanks();
        setNewBankName('');
        setAddBankModal(false);
        setSelectedBank(newBank.key);
        
        // Auto-select employees with this bank
        const empWithBank = employees.filter(emp => 
          emp.bank_name === newBank.key && emp.bank_account && emp.bank_account.trim() !== ''
        );
        setSelectedEmployees(empWithBank.map(emp => emp.id));
        
        toast.success(`تم إضافة بنك "${newBankName.trim()}" بنجاح ✅`);
      }
    } catch (err) {
      if (err.response?.data?.error === 'bank_exists') {
        toast.warning('هذا البنك موجود مسبقاً');
      } else {
        toast.error('فشل إضافة البنك ❌');
      }
      console.error(err);
    }
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col main-content">
        <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="text-2xl font-bold text-indigo-800">📤 تصدير كشف المرتبات البنكي</h1>
        </header>

        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-700">كشف التحويل البنكي</h2>
              <p className="text-gray-500 text-sm">إنشاء وتصدير كشوفات المرتبات للبنوك</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
            >
              <span className="text-xl">➕</span>
              إنشاء كشف جديد
            </button>
          </div>

          {/* بطاقات البنوك */}
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">🏦 اختر البنك</h3>
            <button
              onClick={() => setAddBankModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <span>➕</span>
              إضافة بنك جديد
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {BANKS.map(bank => (
              <div
                key={bank.key}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedBank === bank.key 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
                onClick={() => handleBankSelect(bank.key)}
              >
                <div className="text-3xl mb-2 text-center">{bank.icon}</div>
                <div className="text-center font-semibold text-gray-800 text-sm">{bank.name}</div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  {employees.filter(e => e.bank_name === bank.key && e.bank_account).length} موظف
                </div>
              </div>
            ))}
            
            {/* البنوك المضافة */}
            {customBanks.map(bank => (
              <div
                key={bank.key}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedBank === bank.key 
                    ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
                onClick={() => handleBankSelect(bank.key)}
              >
                <div className="text-3xl mb-2 text-center">🏦</div>
                <div className="text-center font-semibold text-gray-800 text-sm">{bank.name}</div>
                <div className="text-center text-xs text-gray-500 mt-1">
                  {employees.filter(e => e.bank_name === bank.key && e.bank_account).length} موظف
                </div>
              </div>
            ))}
          </div>

          {/* جدول التصديرات */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
              <h3 className="text-white font-bold text-lg">📋 سجل التصديرات</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
            ) : exports.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                لا توجد تصديرات سابقة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">#</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">البنك</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الشهر</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">عدد الموظفين</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الإجمالي</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">الحالة</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {exports.map((exp, index) => (
                      <tr key={exp.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            {BANKS.find(b => b.key === exp.bank_name)?.icon || '🏦'}
                            {getBankName(exp.bank_name)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(exp.year, exp.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm">{exp.employee_count || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          {formatCurrency(exp.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            exp.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {exp.status === 'completed' ? '✅ مكتمل' : '⏳ قيد الانتظار'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            {exp.status === 'completed' && (
                              <button
                                onClick={() => handleDownload(exp.id)}
                                className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700"
                              >
                                📥 تحميل
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                            >
                              🗑️ حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />

      {/* مودال إضافة بنك جديد */}
      {addBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">🏦 إضافة بنك جديد</h2>
              <button 
                onClick={() => { setAddBankModal(false); setNewBankName(''); }}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم البنك الجديد
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="مثال: بنك الخليج"
                  className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">🏦 البنوك المضافة مسبقاً:</h4>
                {customBanks.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد بنوك مضافة</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customBanks.map(bank => (
                      <span 
                        key={bank.key}
                        className="bg-white px-3 py-1 rounded-full text-sm border"
                      >
                        🏦 {bank.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setAddBankModal(false); setNewBankName(''); }}
                className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={addNewBank}
                disabled={!newBankName.trim()}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
              >
                ✅ إضافة البنك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إنشاء كشف جديد */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">إنشاء كشف جديد</h2>
              <button 
                onClick={() => { setModalOpen(false); setPreviewData(null); setSelectedEmployees([]); }}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* البنك والشهر */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🏦 البنك</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      const bankKey = e.target.value;
                      setSelectedBank(bankKey);
                      // Auto-select employees with this bank
                      const empWithBank = employees.filter(emp => 
                        emp.bank_name === bankKey && emp.bank_account && emp.bank_account.trim() !== ''
                      );
                      setSelectedEmployees(empWithBank.map(emp => emp.id));
                    }}
                    className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                  >
                    <optgroup label="البنوك الأساسية">
                      {BANKS.map(bank => (
                        <option key={bank.key} value={bank.key}>{bank.icon} {bank.name}</option>
                      ))}
                    </optgroup>
                    {customBanks.length > 0 && (
                      <optgroup label="البنوك المضافة">
                        {customBanks.map(bank => (
                          <option key={bank.key} value={bank.key}>{bank.icon} {bank.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📅 الشهر</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    {[
                      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                    ].map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📆 السنة</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* زر اختيار موظفي البنك */}
              <div className="bg-blue-50 p-3 rounded-lg mb-6 flex justify-between items-center">
                <span className="text-sm text-blue-800">
                  💡 عند اختيار البنك يتم تحديد الموظفين الذين لديهم حساب في هذا البنك تلقائياً
                </span>
                <button
                  onClick={() => {
                    const empWithBank = employees.filter(emp => 
                      emp.bank_name === selectedBank && emp.bank_account && emp.bank_account.trim() !== ''
                    );
                    setSelectedEmployees(empWithBank.map(emp => emp.id));
                    toast.success(`تم اختيار ${empWithBank.length} موظف لديهم حساب في البنك المحدد`);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  🔄 تحديث اختيار موظفي البنك
                </button>
              </div>

              {/* اختيار الموظفين */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    👥 اختيار الموظفين ({selectedEmployees.length} محدد)
                  </label>
                  <button
                    onClick={selectAllEmployees}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {selectedEmployees.length === employees.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                </div>
                
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">لا يوجد موظفين</div>
                  ) : (
                    employees.map(emp => (
                      <div 
                        key={emp.id}
                        className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                          selectedEmployees.includes(emp.id) ? 'bg-indigo-50' : ''
                        }`}
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => {}}
                          className="w-5 h-5"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-sm text-gray-500">
                            {emp.position || 'بدون وظيفة'} - {emp.department?.name || 'بدون قسم'}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(emp.total_salary)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {selectedEmployees.length > 0 && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg flex justify-between items-center">
                    <span className="text-sm text-green-800">
                      تم اختيار {selectedEmployees.length} موظف
                    </span>
                    <span className="font-bold text-green-700">
                      الإجمالي: {formatCurrency(
                        employees
                          .filter(e => selectedEmployees.includes(e.id))
                          .reduce((sum, e) => sum + (parseFloat(e.total_salary) || 0), 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* معاينة */}
              <button
                onClick={handlePreview}
                disabled={selectedEmployees.length === 0 || generating}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 mb-4"
              >
                👁️ معاينة الكشف
              </button>

              {/* عرض المعاينة */}
              {previewData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">👁️ معاينة الكشف</h4>
                  
                  {/* ملخص البنك والشهر */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-gray-500">البنك</div>
                      <div className="font-semibold">{previewData.bank}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-gray-500">الشهر</div>
                      <div className="font-semibold">
                        {new Date(previewData.year, previewData.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-gray-500">عدد الموظفين</div>
                      <div className="font-semibold">{previewData.employees.length}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center border-2 border-green-200">
                      <div className="text-sm text-green-600">صافي الإجمالي</div>
                      <div className="font-bold text-green-700 text-lg">{formatCurrency(previewData.totalNet)}</div>
                    </div>
                  </div>

                  {/* جدول تفاصيل المرتبات */}
                  <div className="bg-white rounded-lg overflow-hidden mb-4">
                    <div className="bg-indigo-600 text-white p-3">
                      <h5 className="font-bold">💰 تفاصيل المرتبات</h5>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-right">#</th>
                          <th className="p-2 text-right">الاسم</th>
                          <th className="p-2 text-right">الراتب الأساسي</th>
                          <th className="p-2 text-right">بدل الدرجة</th>
                          <th className="p-2 text-right">بدل نقل</th>
                          <th className="p-2 text-right">بدل سكن</th>
                          <th className="p-2 text-right">بدل طعام</th>
                          <th className="p-2 text-right">بدل هاتف</th>
                          <th className="p-2 text-right">بدلات أخرى</th>
                          <th className="p-2 text-right">الحوافز</th>
                          <th className="p-2 text-right">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.employees.map((emp, idx) => {
                          const allowances = emp.allowances || [];
                          const transport = allowances.filter(a => a.type?.includes('transport')).reduce((s, a) => s + parseFloat(a.value || 0), 0);
                          const housing = allowances.filter(a => a.type?.includes('housing')).reduce((s, a) => s + parseFloat(a.value || 0), 0);
                          const food = allowances.filter(a => a.type?.includes('food')).reduce((s, a) => s + parseFloat(a.value || 0), 0);
                          const phone = allowances.filter(a => a.type?.includes('phone')).reduce((s, a) => s + parseFloat(a.value || 0), 0);
                          const other = allowances.filter(a => !a.type?.includes('transport') && !a.type?.includes('housing') && !a.type?.includes('food') && !a.type?.includes('phone')).reduce((s, a) => s + parseFloat(a.value || 0), 0);
                          const incentives = (emp.incentives || []).reduce((s, i) => s + parseFloat(i.value || 0), 0);
                          const gross = parseFloat(emp.base_salary || 0) + parseFloat(emp.position_allowance || 0) + transport + housing + food + phone + other + incentives;
                          
                          return (
                            <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-medium">{emp.name}</td>
                              <td className="p-2">{formatCurrency(emp.base_salary)}</td>
                              <td className="p-2">{formatCurrency(emp.position_allowance)}</td>
                              <td className="p-2">{formatCurrency(transport)}</td>
                              <td className="p-2">{formatCurrency(housing)}</td>
                              <td className="p-2">{formatCurrency(food)}</td>
                              <td className="p-2">{formatCurrency(phone)}</td>
                              <td className="p-2">{formatCurrency(other)}</td>
                              <td className="p-2 text-blue-600">{formatCurrency(incentives)}</td>
                              <td className="p-2 font-bold text-green-600">{formatCurrency(gross)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-indigo-100 font-bold">
                          <td className="p-2" colSpan={2}>الإجمالي</td>
                          <td className="p-2">{formatCurrency(previewData.totalBaseSalary)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalPositionAllowance)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalTransport)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalHousing)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalFood)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalPhone)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalOther)}</td>
                          <td className="p-2">{formatCurrency(previewData.totalIncentives)}</td>
                          <td className="p-2 text-green-700">{formatCurrency(previewData.totalNet + previewData.totalInsurance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* جدول التأمينات */}
                  {previewData.totalInsurance > 0 && (
                    <div className="bg-white rounded-lg overflow-hidden mb-4">
                      <div className="bg-yellow-500 text-white p-3">
                        <h5 className="font-bold">🛡️ التأمينات (الخصومات)</h5>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-yellow-100">
                          <tr>
                            <th className="p-2 text-right">#</th>
                            <th className="p-2 text-right">الاسم</th>
                            <th className="p-2 text-right">نوع التأمين</th>
                            <th className="p-2 text-right">قيمة التأمين</th>
                            <th className="p-2 text-right">ملاحظة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.employees.filter(e => e.insurance_amount > 0).map((emp, idx) => (
                            <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-medium">{emp.name}</td>
                              <td className="p-2">
                                {emp.insurance_type === 'health' ? 'تأمين صحي' : 
                                 emp.insurance_type === 'social' ? 'تأمين اجتماعي' : 
                                 emp.insurance_type === 'both' ? 'تأمين صحي واجتماعي' : '-'}
                              </td>
                              <td className="p-2 text-red-600 font-medium">{formatCurrency(emp.insurance_amount)}</td>
                              <td className="p-2 text-gray-500">يخصم شهرياً</td>
                            </tr>
                          ))}
                          <tr className="bg-yellow-100 font-bold">
                            <td className="p-2" colSpan={3}>إجمالي التأمينات</td>
                            <td className="p-2 text-red-700">{formatCurrency(previewData.totalInsurance)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ملخص صافي المرتبات */}
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-600">إجمالي المرتبات</div>
                        <div className="text-xl font-bold text-green-700">
                          {formatCurrency(previewData.totalNet + previewData.totalInsurance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">إجمالي التأمينات</div>
                        <div className="text-xl font-bold text-red-600">
                          -{formatCurrency(previewData.totalInsurance)}
                        </div>
                      </div>
                      <div className="bg-green-600 text-white p-2 rounded-lg">
                        <div className="text-sm">صافي المرتبات للصرف</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(previewData.totalNet)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setModalOpen(false); setPreviewData(null); setSelectedEmployees([]); }}
                className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedEmployees.length === 0 || generating}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
              >
                {generating ? 'جاري الإنشاء...' : '💾 إنشاء الكشف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
