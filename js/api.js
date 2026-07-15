const API_BASE_URL = "http://localhost:8080";

function getAuthToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
}

function getAuthStorage() {
  return localStorage.getItem("authToken") ? localStorage : sessionStorage;
}

function clearAuthSession() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");

  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("userRole");
}

function saveAuthSession(data, keepLogin = false) {
  const tokenInfo = data?.tokenInfo || data?.token || {};
  const accessToken = tokenInfo.accessToken || data?.accessToken || data?.jwt || data?.token;
  const refreshToken = tokenInfo.refreshToken || data?.refreshToken;

  const currentUser = {
    userId: data?.userId ?? data?.userid ?? data?.id ?? "",
    email: data?.email || "",
    name: data?.name || "",
    studentId: data?.studentId || data?.studentid || "",
    department: data?.department || "",
    role: data?.role || "ROLE_STUDENT",
    createdAt: data?.createdAt || "",
  };

  clearAuthSession();

  const storage = keepLogin ? localStorage : sessionStorage;

  if (accessToken) storage.setItem("authToken", accessToken);
  if (refreshToken) storage.setItem("refreshToken", refreshToken);

  storage.setItem("currentUser", JSON.stringify(currentUser));
  storage.setItem("userRole", currentUser.role || "ROLE_STUDENT");
  localStorage.setItem("registeredUser", JSON.stringify(currentUser));

  return currentUser;
}

function getStoredCurrentUser() {
  try {
    return (
      JSON.parse(sessionStorage.getItem("currentUser")) ||
      JSON.parse(localStorage.getItem("currentUser")) ||
      JSON.parse(localStorage.getItem("registeredUser")) ||
      null
    );
  } catch {
    return null;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body =
    options.body && typeof options.body === "object" && !isFormData && !(options.body instanceof Blob)
      ? JSON.stringify(options.body)
      : options.body;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body,
  });

  const text = await response.text();
  const result = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      result.message ||
      result.error ||
      (response.status === 401 ? "로그인이 필요합니다." : "요청에 실패했습니다.");
    throw new Error(message);
  }

  return result;
}
