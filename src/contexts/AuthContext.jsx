import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/me');
      const userData = res.data;
      setUser(userData);
      
      const isAdmin = userData.role?.name === 'admin' || userData.is_admin;
      
      let perms = [];
      if (userData.role?.permissions) {
        perms = userData.role.permissions.map(p => {
          if (typeof p === 'string') return p;
          return p.name || p;
        }).filter(Boolean);
      }
      
      const allPerms = isAdmin ? ['*'] : perms;
      
      setPermissions(allPerms);
      localStorage.setItem("permissions", JSON.stringify(allPerms));
    } catch (err) {
      console.error('Error loading user:', err);
      const savedPerms = localStorage.getItem("permissions");
      if (savedPerms) {
        setPermissions(JSON.parse(savedPerms));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedPerms = localStorage.getItem("permissions");
    if (savedPerms) {
      setPermissions(JSON.parse(savedPerms));
      setLoading(false);
    }
    loadUser();
  }, [loadUser]);

  const hasPermission = useCallback((permission) => {
    return permissions.includes('*') || permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((perms) => {
    if (permissions.includes('*')) {
      return true;
    }
    return perms.some(p => permissions.includes(p));
  }, [permissions]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions([]);
  }

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      loading,
      hasPermission,
      hasAnyPermission,
      loadUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
