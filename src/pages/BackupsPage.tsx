import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../services/api";

interface Backup {
  id: number;
  filename: string;
  file_size: number;
  status: "success" | "failed";
  created_at: string;
}

const statusLabels: Record<string, string> = {
  success: "نجاح",
  failed: "فشل",
};

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get("/backups");
      setBackups(res.data.data || res.data || []);
    } catch {
      toast.error("خطأ في تحميل النسخ الاحتياطية");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!confirm("هل تريد إنشاء نسخة احتياطية جديدة؟")) return;
    setCreating(true);
    try {
      await api.post("/backups");
      toast.success("تم إنشاء النسخة الاحتياطية بنجاح");
      fetchBackups();
    } catch {
      toast.error("خطأ في إنشاء النسخة الاحتياطية");
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://server/hr-app/public/api/backups/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("تم تحميل النسخة الاحتياطية");
    } catch {
      toast.error("خطأ في التحميل");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await api.delete(`/backups/${id}`);
      toast.success("تم حذف النسخة الاحتياطية");
      fetchBackups();
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col md:mr-64 mr-0">
        <Topbar title="💾 النسخ الاحتياطي" />
        <div className="mt-16 md:mt-4 px-4 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-500">
              إجمالي النسخ: {backups.length}
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-indigo-800 hover:bg-indigo-900 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="animate-spin">⏳</span> جاري الإنشاء...
                </>
              ) : (
                "+ إنشاء نسخة احتياطية جديدة"
              )}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
            ) : backups.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="text-5xl mb-4">💾</div>
                <p>لا توجد نسخ احتياطية</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right">اسم الملف</th>
                      <th className="px-4 py-3 text-right">الحجم</th>
                      <th className="px-4 py-3 text-right">الحالة</th>
                      <th className="px-4 py-3 text-right">التاريخ</th>
                      <th className="px-4 py-3 text-right">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📁</span>
                            <span className="font-medium font-mono text-xs">{backup.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatFileSize(backup.file_size)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[backup.status]}`}>
                            {statusLabels[backup.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {backup.created_at ? new Date(backup.created_at).toLocaleString("ar-EG") : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {backup.status === "success" && (
                              <button
                                onClick={() => handleDownload(backup.id, backup.filename)}
                                className="bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                              >
                                ⬇️ تحميل
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(backup.id)}
                              className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
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
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
