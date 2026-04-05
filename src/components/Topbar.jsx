import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircleIcon, ArrowRightOnRectangleIcon, UserPlusIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import api from "../services/api";

export default function Topbar({ title }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef(null);
  const username = localStorage.getItem("username");
  const avatar = localStorage.getItem("avatar") || "/default-avatar.png";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await api.get("/me");
        const user = res.data;
        if (user.role?.name === "admin" || user.is_admin || user.isAdmin) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };
    fetchUserRole();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
      <h1 className="text-xl font-semibold text-indigo-800">{title}</h1>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpenMenu(!openMenu)}
          className="flex items-center gap-3 focus:outline-none"
        >
          <img
            src={avatar}
            alt="User Avatar"
            className="w-10 h-10 rounded-full border"
          />
          <span className="text-gray-700 font-medium">{username}</span>
        </button>

        {openMenu && (
          <div className="absolute left-0 mt-2 w-56 bg-white shadow-lg rounded-lg border z-50">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(false);
                navigate("/profilesettings");
              }}
              className="w-full flex items-center justify-end px-4 py-3 text-gray-700 hover:bg-gray-100"
            >
              الملف الشخصي
              <UserCircleIcon className="w-5 h-5 ml-3" />
            </button>

            {isAdmin && (
              <>
                <div className="border-t"></div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/users");
                  }}
                  className="w-full flex items-center justify-end px-4 py-3 text-gray-700 hover:bg-gray-100"
                >
                  إضافة مستخدم
                  <UserPlusIcon className="w-5 h-5 ml-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(false);
                    navigate("/settings?tab=roles");
                  }}
                  className="w-full flex items-center justify-end px-4 py-3 text-gray-700 hover:bg-gray-100"
                >
                  الصلاحيات
                  <ShieldCheckIcon className="w-5 h-5 ml-3" />
                </button>
              </>
            )}

            <div className="border-t"></div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-end px-4 py-3 text-red-600 hover:bg-gray-100"
            >
              تسجيل الخروج
              <ArrowRightOnRectangleIcon className="w-5 h-5 ml-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
