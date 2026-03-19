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
    return unwrap(await api.get("/attendance-device/settings"));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function createDevice(payload) {
  try {
    return unwrap(await api.post("/attendance-device/settings", payload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function updateDevice(id, payload) {
  try {
    return unwrap(await api.put(`/attendance-device/settings/${id}`, payload));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function deleteDevice(id) {
  try {
    return unwrap(await api.delete(`/attendance-device/settings/${id}`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function testDevice(id) {
  try {
    return unwrap(await api.post(`/attendance-device/settings/${id}/test`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function syncDevice(id) {
  try {
    return unwrap(await api.post(`/attendance-device/settings/${id}/sync`));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function syncAttendance() {
  try {
    return unwrap(await api.post("/attendance-device/sync"));
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function listAttendanceLogs(params = {}) {
  try {
    return unwrap(await api.get("/attendance-device", { params }));
  } catch (e) {
    throw normalizeError(e);
  }
}

