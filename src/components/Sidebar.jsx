import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { FingerPrintIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export default function Sidebar({ sticky = false }) {
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
    try {
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const items = useMemo(
    () => [
      { label: "لوحة التحكم", icon: Cog6ToothIcon, path: "/dashboard" },
      { label: "الموظفين", icon: UserGroupIcon, path: "/employees" },
      { label: "الأقسام", icon: BuildingOfficeIcon, path: "/departments" },
      { label: "أجهزة البصمة", icon: FingerPrintIcon, path: "/fingerprint-devices" },
      { label: "سجل الحضور", icon: ClipboardDocumentListIcon, path: "/attendance-logs" },
      { label: "الإعدادات", icon: Cog6ToothIcon, path: "/settings" },
      { label: "التقارير", icon: ChartBarIcon, path: "/reports" },
    ],
    []
  );

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={[
        "bg-indigo-800 text-white flex flex-col transition-all duration-200",
        isCollapsed ? "w-20" : "w-64",
        sticky ? "sticky top-0 h-screen" : "",
      ].join(" ")}
    >
      <div className="p-6 border-b border-indigo-700">
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
          onClick={() => setIsCollapsed((s) => !s)}
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

