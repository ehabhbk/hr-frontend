import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { formatDateArabic } from '../utils/dateUtils';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?status=${filter}`);
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
      toast.success('تم وضع علامة مقروء على الكل');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
      toast.success('تم حذف الإشعار');
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave': return '🏖️';
      case 'warning': return '⚠️';
      case 'salary': return '💰';
      case 'attendance': return '📋';
      default: return '🔔';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'leave': return 'طلب إجازة';
      case 'warning': return 'إنذار';
      case 'salary': return 'راتب';
      case 'attendance': return 'حضور';
      default: return 'إشعار';
    }
  };

  const filterButtons = [
    { key: 'unread', label: 'غير مقروءة' },
    { key: 'read', label: 'مقروءة' },
    { key: 'all', label: 'الكل' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col main-content">
        <Topbar title="🔔 الإشعارات" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === f.key
                      ? "bg-indigo-800 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={markAllAsRead}
              className="bg-indigo-800 hover:bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ✓ قراءة الكل
            </button>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="text-5xl mb-4">🔔</div>
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-4 border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      notif.status === 'unread' ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                  >
                    <div className="text-2xl mt-1">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                          {getTypeLabel(notif.type)}
                        </span>
                        {notif.status === 'unread' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-800 inline-block" />
                        )}
                      </div>
                      <h4 className="text-gray-800 font-semibold text-sm mb-1">{notif.title}</h4>
                      <p className="text-gray-500 text-sm mb-1">{notif.message}</p>
                      <span className="text-gray-400 text-xs">{formatDateArabic(notif.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {notif.status === 'unread' && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          ✓ قراءة
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
