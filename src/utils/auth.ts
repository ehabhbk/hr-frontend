export const getCurrentPermissions = (): string[] => {
  try {
    const s = localStorage.getItem('permissions');
    if (!s) return [];
    return JSON.parse(s);
  } catch {
    return [];
  }
};

export const hasPermission = (perm: string): boolean => {
  const perms = getCurrentPermissions();
  if (perms.includes('*')) return true;
  return perms.includes(perm);
};

export const hasAnyPermission = (perms: string[]): boolean => {
  if (perms.length === 0) return true;
  const userPerms = getCurrentPermissions();
  if (userPerms.includes('*')) return true;
  return perms.some(p => userPerms.includes(p));
};

export const getUserRoles = (): any[] => {
  try {
    const s = localStorage.getItem('user_roles');
    if (!s) return [];
    return JSON.parse(s);
  } catch {
    return [];
  }
};

export const clearAuth = () => {
  localStorage.removeItem('permissions');
  localStorage.removeItem('user_roles');
  localStorage.removeItem('token');
};
