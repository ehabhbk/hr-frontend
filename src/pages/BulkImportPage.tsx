import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "../services/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const FIELD_MAP = [
  { key: "file_number", label: "رقم الملف", required: true },
  { key: "name", label: "الاسم", required: true },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "phone", label: "رقم الهاتف" },
  { key: "phone_country_code", label: "كود الدولة" },
  { key: "position", label: "المسمى الوظيفي" },
  { key: "department_id", label: "رقم القسم" },
  { key: "base_salary", label: "المرتب الأساسي" },
  { key: "hire_date", label: "تاريخ التعيين" },
];

const COLUMN_ALIASES: Record<string, string[]> = {
  file_number: ["رقم الملف", "file_number", "File Number", "الرقم"],
  name: ["الاسم", "name", "Name", "اسم الموظف", "employee_name"],
  email: ["البريد", "email", "Email", "البريد الإلكتروني"],
  phone: ["الهاتف", "phone", "Phone", "رقم الهاتف", "الجوال", "mobile"],
  phone_country_code: ["كود الدولة", "phone_country_code", "country_code", "الكود"],
  position: ["المسمى", "position", "Position", "الوظيفة", "المسمى الوظيفي"],
  department_id: ["القسم", "department_id", "Department", "department", "رقم القسم", "القسم (رقم)"],
  base_salary: ["المرتب", "base_salary", "Salary", "الراتب", "المرتب الأساسي", "الراتب الأساسي"],
  hire_date: ["تاريخ التعيين", "hire_date", "Hire Date", "تاريخ الالتحاق"],
};

function matchColumn(colName: string): string | null {
  const lower = colName.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (lower === alias.toLowerCase() || lower.includes(alias.toLowerCase())) {
        return key;
      }
    }
  }
  return null;
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeaders((prev) => prev);
  }, [mapping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (jsonData.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        const cols = Object.keys(jsonData[0] as object);
        setHeaders(cols);
        setPreview(jsonData.slice(0, 10));
        setAllRows(jsonData);

        const autoMapping: Record<string, string> = {};
        for (const col of cols) {
          const matched = matchColumn(col);
          if (matched) {
            autoMapping[matched] = col;
          }
        }
        setMapping(autoMapping);
      } catch {
        toast.error("خطأ في قراءة الملف");
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleMappingChange = (field: string, col: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (col === "") {
        delete next[field];
      } else {
        next[field] = col;
      }
      return next;
    });
  };

  const mappedPreview = preview.map((row) => {
    const mapped: any = {};
    for (const [field, col] of Object.entries(mapping)) {
      mapped[field] = row[col] ?? "";
    }
    return mapped;
  });

  const handleImport = async () => {
    const mappedEmployees = allRows.map((row) => {
      const emp: any = {};
      for (const [field, col] of Object.entries(mapping)) {
        let val = row[col] ?? "";
        if (["department_id", "base_salary"].includes(field) && val !== "") {
          val = Number(val);
        }
        if (field === "department_id" && isNaN(val)) {
          val = "";
        }
        emp[field] = val;
      }
      return emp;
    });

    const validEmployees = mappedEmployees.filter((e) => e.file_number && e.name);
    if (validEmployees.length === 0) {
      toast.error("لا توجد بيانات صحيحة للاستيراد (رقم الملف والاسم مطلوبان)");
      return;
    }

    setImporting(true);
    try {
      const res = await api.post("/employees/bulk-import", { employees: validEmployees });
      setResult(res.data);
      toast.success(`تم استيراد ${res.data.imported} موظف بنجاح`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setAllRows([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="استيراد الموظفين" />

        <main className="flex-1 p-6 space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📁</span> رفع ملف Excel
            </h3>
            <div className="flex items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
              />
              {file && (
                <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap">
                  مسح الملف
                </button>
              )}
            </div>
            {file && (
              <p className="text-xs text-gray-500 mt-2">
                {file.name} — {allRows.length} صف
              </p>
            )}
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && !result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">🔗</span> ربط الأعمدة بالحقول
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FIELD_MAP.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      {f.label}
                      {f.required && <span className="text-red-500 mr-1">*</span>}
                    </label>
                    <select
                      value={mapping[f.key] || ""}
                      onChange={(e) => handleMappingChange(f.key, e.target.value)}
                      className="border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— لا توجد —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              {mappedPreview.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-gray-600 mb-3">معاينة البيانات ({mappedPreview.length} صف)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          {Object.keys(mapping).map((f) => (
                            <th key={f} className="px-3 py-2 text-right font-medium text-gray-600">
                              {FIELD_MAP.find((x) => x.key === f)?.label || f}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedPreview.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                            {Object.keys(mapping).map((f) => (
                              <td key={f} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[150px] truncate">
                                {String(row[f] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Button */}
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={handleImport}
                  disabled={importing || !mapping.file_number || !mapping.name}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 font-semibold disabled:opacity-50 shadow-sm"
                >
                  {importing ? "جارٍ الاستيراد..." : `استيراد ${allRows.length} موظف`}
                </button>
                {!mapping.file_number && (
                  <span className="text-xs text-red-500">* ربط "رقم الملف" مطلوب</span>
                )}
                {!mapping.name && (
                  <span className="text-xs text-red-500">* ربط "الاسم" مطلوب</span>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span> نتائج الاستيراد
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-green-700">{result.imported}</p>
                  <p className="text-sm text-green-600 font-medium">تم الاستيراد بنجاح</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-red-700">{result.errors}</p>
                  <p className="text-sm text-red-600 font-medium">أخطاء</p>
                </div>
              </div>

              {/* Imported employees list */}
              {result.data?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">الموظفون المستوردون</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="px-3 py-2 text-right font-medium text-gray-600">#</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">الاسم</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">رقم الملف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((emp: any, i: number) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2">{emp.id}</td>
                            <td className="px-3 py-2 font-medium">{emp.name}</td>
                            <td className="px-3 py-2">{emp.file_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors details */}
              {result.error_details?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-red-700 mb-2">تفاصيل الأخطاء</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-red-50">
                          <th className="px-3 py-2 text-right font-medium text-gray-600">الصف</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">رقم الملف</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">الخطأ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.error_details.map((err: any, i: number) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2">{err.row}</td>
                            <td className="px-3 py-2">{err.file_number}</td>
                            <td className="px-3 py-2 text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button onClick={reset} className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                استيراد ملف جديد
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
