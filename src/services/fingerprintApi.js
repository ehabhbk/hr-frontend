import api from "./api";

function unwrap(res) {
  if (res?.data?.data !== undefined) {
    return res.data.data;
  }
  return res?.data ?? res;
}

function normalizeError(err) {
  const status = err?.response?.status;
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (status ? `Request failed (${status})` : "Request failed");
  const details = err?.response?.data?.errors || err?.response?.data;
  return { status, message, details, raw: err };
}

export async function listDevices() {
  try {
    return unwrap(await api.get("/attendance-device"));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function createDevice(payload) {
  try {
    const devicePayload = {
      name: payload.name,
      host: payload.ip || payload.host,
      port: payload.port,
      device_id: payload.device_id,
      password: payload.password,
      enabled: true,
    };
    return unwrap(await api.post("/attendance-device", devicePayload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function updateDevice(id, payload) {
  try {
    const devicePayload = {
      name: payload.name,
      host: payload.ip || payload.host,
      port: payload.port,
      device_id: payload.device_id,
      password: payload.password,
    };
    return unwrap(await api.put(`/attendance-device/${id}`, devicePayload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function deleteDevice(id) {
  try {
    return unwrap(await api.delete(`/attendance-device/${id}`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function testDevice(id) {
  try {
    return unwrap(await api.post(`/attendance-device/${id}/test`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function syncDevice(id) {
  try {
    const response = await api.post(`/attendance-device/${id}/sync`);
    const result = response.data;
    return {
      stored: result.stored ?? 0,
      fetched: result.fetched ?? 0,
      skipped: result.skipped ?? 0,
      ok: result.ok ?? false,
    };
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function syncAttendance() {
  try {
    return unwrap(await api.post("/attendance-device/sync-all"));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function listAttendanceLogs(params = {}) {
  try {
    return unwrap(await api.get("/attendance-logs", { params }));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function registerUserOnDevice(deviceId, payload) {
  try {
    return unwrap(await api.post(`/attendance-device/${deviceId}/register-user`, payload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function removeUserFromDevice(deviceId, userId) {
  try {
    return unwrap(await api.post(`/attendance-device/${deviceId}/remove-user`, { user_id: userId }));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function saveFingerprintToDatabase(employeeId, fingerprintData) {
  try {
    return unwrap(await api.post(`/employees/${employeeId}/fingerprint`, fingerprintData));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function deleteFingerprintFromDatabase(employeeId, fingerprintId) {
  try {
    return unwrap(await api.delete(`/employees/${employeeId}/fingerprint/${fingerprintId}`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function getEmployeeFingerprints(employeeId) {
  try {
    return unwrap(await api.get(`/employees/${employeeId}/fingerprints`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function setDeviceTime(deviceId) {
  try {
    return unwrap(await api.post(`/attendance-device/${deviceId}/set-time`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function downloadFingerprints(deviceId) {
  try {
    return unwrap(await api.get(`/attendance-device/${deviceId}/fingerprints`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function uploadFingerprints(deviceId) {
  try {
    return unwrap(await api.post(`/attendance-device/${deviceId}/upload-fingerprints`));
  } catch (e) {
    throw normalizeError(e);
  }
}

