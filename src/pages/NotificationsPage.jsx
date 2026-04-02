import { useState, useEffect } from 'react';
import api from '../services/api';

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
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a5f' }}>
          🔔 الإشعارات
        </h1>
        <button
          onClick={markAllAsRead}
          style={{
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ✓ قراءة الكل
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['unread', 'read', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              background: filter === f ? '#1e3a5f' : '#e0e0e0',
              color: filter === f ? '#fff' : '#333',
              fontSize: '14px',
            }}
          >
            {f === 'unread' ? 'غير مقروءة' : f === 'read' ? 'مقروءة' : 'الكل'}
          </button>
        ))}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>جاري التحميل...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <p>لا توجد إشعارات</p>
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  background: notif.status === 'unread' ? '#f8f9ff' : '#fff',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '24px' }}>{getTypeIcon(notif.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      background: '#e3f2fd',
                      color: '#1565c0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}>
                      {getTypeLabel(notif.type)}
                    </span>
                    {notif.status === 'unread' && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#1e3a5f',
                      }} />
                    )}
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#1e3a5f' }}>{notif.title}</h4>
                  <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>{notif.message}</p>
                  <span style={{ color: '#999', fontSize: '12px' }}>{formatDate(notif.created_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {notif.status === 'unread' && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      style={{
                        background: '#e3f2fd',
                        color: '#1565c0',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✓ قراءة
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    style={{
                      background: '#ffebee',
                      color: '#c62828',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
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
  );
}
