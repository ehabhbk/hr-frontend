import api from "./api";

function unwrap(res) {
  return res?.data?.data ?? res?.data;
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
    return unwrap(await api.post("/attendance-device/", payload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function updateDevice(id, payload) {
  try {
    return unwrap(await api.put(`/attendance-device/${id}`, payload));
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
    return unwrap(await api.post(`/attendance-device/${id}/sync`));
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

