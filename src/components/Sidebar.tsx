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
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import api from "../services/api";

function getPermissions() {
  try {
    const savedPerms = localStorage.getItem("permissions");
    if (savedPerms) {
      return JSON.parse(savedPerms);
    }
  } catch {}
  return [];
}

function hasPermission(perm) {
  const perms = getPermissions();
  return perms.includes("*") || perms.includes(perm);
}

export default function Sidebar({ sticky = false, onCollapseChange = undefined }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [permVersion, setPermVersion] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => setPermVersion((v) => v + 1);
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (window.innerWidth >= 768) {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        isCollapsed ? "5rem" : "16rem"
      );
    }
  }, [isCollapsed]);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      if (onCollapseChange) onCollapseChange(newState);
      return newState;
    });
  };

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        setUnreadCount(res.data.count);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
      if (window.innerWidth >= 768) {
        document.documentElement.style.setProperty(
          "--sidebar-width",
          isCollapsed ? "5rem" : "16rem"
        );
      }
    } catch {}
  }, [isCollapsed]);

  const items = useMemo(() => {
    const perms = getPermissions();
    const isAdmin = perms.includes("*");
    const allItems = [
      { label: "لوحة التحكم", icon: Squares2X2Icon, path: "/dashboard", permission: "menu.dashboard" },
      { label: "الموظفين", icon: UserGroupIcon, path: "/employees", permission: "menu.employees" },
      { label: "الأقسام", icon: BuildingOfficeIcon, path: "/departments", permission: "menu.departments" },
      { label: "أجهزة البصمة", icon: FingerPrintIcon, path: "/fingerprint-devices", permission: "menu.fingerprint" },
      { label: "سجل الحضور", icon: ClipboardDocumentListIcon, path: "/attendance-logs", permission: "menu.attendance" },
      { label: "الطلبيات", icon: ClipboardDocumentCheckIcon, path: "/requests", permission: "menu.requests" },
      { label: "التصدير البنكي", icon: BanknotesIcon, path: "/bank-exports", permission: "menu.bank" },
      { label: "التقارير", icon: ChartBarIcon, path: "/reports", permission: "menu.reports" },
      { label: "السجلات", icon: DocumentTextIcon, path: "/activity-logs", permission: "menu.logs" },
      { label: "الإعلانات", icon: MegaphoneIcon, path: "/announcements", permission: "menu.announcements" },
      { label: "الإعدادات", icon: Cog6ToothIcon, path: "/settings", permission: "menu.settings" },
    ];
    return isAdmin ? allItems : allItems.filter((item) => hasPermission(item.permission));
  }, [permVersion]);

  const isActive = (path) => location.pathname === path;

  const closeMobile = () => setMobileOpen(false);

  const NavContent = ({ collapsed, onNavigate }) => (
    <>
      <div className="p-6 border-b border-indigo-700 flex items-center justify-between">
        <div className="flex-1">
          {!collapsed ? (
            <div className="text-center">
              <h2 className="text-xl font-bold">Jawda HR</h2>
              <p className="text-sm text-gray-300">إدارة الموارد البشرية</p>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-xl font-bold" title="Jawda HR">JH</span>
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
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.path);
          return (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                navigate(it.path);
                if (onNavigate) onNavigate();
              }}
              className={[
                "flex items-center px-3 py-2 rounded w-full",
                collapsed ? "justify-center" : "gap-2 text-right",
                active ? "bg-indigo-700" : "hover:bg-indigo-700",
              ].join(" ")}
              title={collapsed ? it.label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span>{it.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-indigo-700">
        <button
          type="button"
          onClick={handleToggle}
          className={[
            "w-full rounded px-3 py-2 hover:bg-indigo-700 transition",
            "flex items-center",
            collapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          {!collapsed && <span className="text-sm">تصغير القائمة</span>}
          <span className="text-white/90">{collapsed ? "⟫" : "⟪"}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 right-4 z-[60] md:hidden bg-indigo-800 text-white p-2 rounded-lg shadow-lg"
        aria-label="فتح القائمة"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          "bg-indigo-800 text-white flex flex-col transition-all duration-300 fixed top-0 h-screen z-[70]",
          "md:hidden",
          mobileOpen ? "right-0 w-64" : "-right-64 w-64",
        ].join(" ")}
      >
        <div className="absolute top-4 left-4">
          <button
            onClick={closeMobile}
            className="p-1 rounded hover:bg-indigo-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <NavContent collapsed={false} onNavigate={closeMobile} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={[
          "bg-indigo-800 text-white hidden md:flex flex-col transition-all duration-200 fixed top-0 right-0 h-screen z-50",
          isCollapsed ? "w-20" : "w-64",
        ].join(" ")}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
