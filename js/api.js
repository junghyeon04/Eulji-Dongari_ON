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

  // 스크랩은 계정별 데이터라 로그아웃 시 로컬 캐시도 비웁니다.
  localStorage.removeItem("bookmarkedClubs");
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


/* =========================================================
   Bookmark sync helpers
   - POST /api/clubs/{clubId}/bookmarks : 관심 동아리 등록
   - DELETE /api/clubs/{clubId}/bookmarks : 관심 동아리 취소
   - GET /api/users/me/bookmarks : 내 관심 동아리 목록 조회
========================================================= */
function getLocalBookmarkedClubs() {
  try {
    return JSON.parse(localStorage.getItem("bookmarkedClubs")) || [];
  } catch {
    return [];
  }
}

function saveLocalBookmarkedClubs(clubs) {
  localStorage.setItem("bookmarkedClubs", JSON.stringify(clubs || []));
}

function normalizeBookmarkClub(apiClub = {}) {
  const source = apiClub.club || apiClub;
  const id = String(
    source.clubId ||
      source.id ||
      apiClub.clubId ||
      apiClub.id ||
      ""
  );

  return {
    id,
    clubId: id,
    name: source.name || apiClub.clubName || apiClub.name || "-",
    description:
      source.shortDescription ||
      source.description ||
      apiClub.shortDescription ||
      apiClub.description ||
      "",
    status:
      source.recruitmentStatus ||
      source.status ||
      apiClub.recruitmentStatus ||
      apiClub.status ||
      "UNKNOWN",
    image: source.imageUrl || apiClub.imageUrl || "",
    category: source.category || apiClub.category || "",
    type: source.type || apiClub.type || "",
  };
}

async function syncBookmarksFromServer() {
  const token = getAuthToken();

  if (!token || typeof apiRequest !== "function") {
    return getLocalBookmarkedClubs();
  }

  const result = await apiRequest("/api/users/me/bookmarks");
  const bookmarks = Array.isArray(result.data) ? result.data : [];
  const clubs = bookmarks.map(normalizeBookmarkClub).filter((club) => club.id);

  saveLocalBookmarkedClubs(clubs);
  return clubs;
}

async function setBookmarkOnServer(club, shouldSave) {
  const clubId = String(club?.id || club?.clubId || "");

  if (!clubId) {
    throw new Error("동아리 정보를 찾을 수 없습니다.");
  }

  if (!getAuthToken()) {
    throw new Error("로그인 후 스크랩할 수 있습니다.");
  }

  await apiRequest(`/api/clubs/${clubId}/bookmarks`, {
    method: shouldSave ? "POST" : "DELETE",
  });

  const normalized = normalizeBookmarkClub({ ...club, clubId });
  let savedClubs = getLocalBookmarkedClubs();

  if (shouldSave) {
    const exists = savedClubs.some((savedClub) => String(savedClub.id) === clubId);
    if (!exists) savedClubs.push(normalized);
  } else {
    savedClubs = savedClubs.filter((savedClub) => String(savedClub.id) !== clubId);
  }

  saveLocalBookmarkedClubs(savedClubs);

  try {
    return await syncBookmarksFromServer();
  } catch (error) {
    console.warn("스크랩 서버 동기화 실패, 로컬 상태만 반영:", error);
    return savedClubs;
  }
}
