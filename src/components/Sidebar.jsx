import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  BellIcon,
  BanknotesIcon

} from "@heroicons/react/24/outline";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import api from "../services/api";

export default function Sidebar({ sticky = false, onCollapseChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '5rem' : '16rem');
  }, [isCollapsed]);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      if (onCollapseChange) {
        onCollapseChange(newState);
      }
      return newState;
    });
  };

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count);
      } catch {
        // ignore
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
      document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '5rem' : '16rem');
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const items = useMemo(
    () => [
      { label: "لوحة التحكم", icon: Squares2X2Icon, path: "/dashboard" },
      { label: "الموظفين", icon: UserGroupIcon, path: "/employees" },
      { label: "الأقسام", icon: BuildingOfficeIcon, path: "/departments" },
      { label: "أجهزة البصمة", icon: FingerPrintIcon, path: "/fingerprint-devices" },
      { label: "سجل الحضور", icon: ClipboardDocumentListIcon, path: "/attendance-logs" },
      { label: "التصدير البنكي", icon: BanknotesIcon, path: "/bank-exports" },
      { label: "التقارير", icon: ChartBarIcon, path: "/reports" },
      { label: "الإعدادات", icon: Cog6ToothIcon, path: "/settings" },
    ],
    []
  );

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={[
        "bg-indigo-800 text-white flex flex-col transition-all duration-200 fixed top-0 right-0 h-screen z-50",
        isCollapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div className="p-6 border-b border-indigo-700 flex items-center justify-between">
        <div className="flex-1">
          {!isCollapsed ? (
            <div className="text-center">
              <h2 className="text-xl font-bold">Jawda HR</h2>
              <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-xl font-bold" title="Jawda HR">
                JH
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-full hover:bg-indigo-700 transition"
          title="الإشعارات"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.path);
          return (
            <button
              key={it.label}
              type="button"
              onClick={() => navigate(it.path)}
              className={[
                "flex items-center px-3 py-2 rounded w-full",
                isCollapsed ? "justify-center" : "gap-2 text-right",
                active ? "bg-indigo-700" : "hover:bg-indigo-700",
              ].join(" ")}
              title={isCollapsed ? it.label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isCollapsed && <span>{it.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Toggle at bottom */}
      <div className="p-4 border-t border-indigo-700">
        <button
          type="button"
          onClick={handleToggle}
          className={[
            "w-full rounded px-3 py-2 hover:bg-indigo-700 transition",
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between",
          ].join(" ")}
          aria-label={isCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
          title={isCollapsed ? "توسيع" : "تصغير"}
        >
          {!isCollapsed && <span className="text-sm">تصغير القائمة</span>}
          <span className="text-white/90">{isCollapsed ? "⟫" : "⟪"}</span>
        </button>
      </div>
    </aside>
  );
}

