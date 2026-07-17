const API_BASE_URL = "http://localhost:8080";

function getAuthToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
}



function normalizeRoleValue(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const role = raw.trim().toUpperCase();

  if (!role) return "";
  if (role.includes("ROLE_CLUB_ADMIN")) return "ROLE_CLUB_ADMIN";
  if (role === "CLUB_ADMIN" || role.includes("CLUB_ADMIN")) return "ROLE_CLUB_ADMIN";
  if (role.includes("OPERATOR") || role.includes("MANAGER") || role.includes("OWNER")) return "ROLE_CLUB_ADMIN";
  if (role.includes("ROLE_ADMIN") || role === "ADMIN") return "ROLE_ADMIN";
  if (role.includes("STUDENT") || role.includes("MEMBER")) return "ROLE_STUDENT";

  return role.startsWith("ROLE_") ? role : `ROLE_${role}`;
}

function getRoleFromAuthData(data = {}) {
  const payload = data?.data || data || {};
  const tokenInfo = payload?.tokenInfo || payload?.token || data?.tokenInfo || {};
  const user = payload?.user || data?.user || {};

  const candidates = [
    payload.role,
    payload.signupRole,
    payload.memberType,
    payload.membertype,
    payload.userRole,
    payload.authority,
    payload.authorities,
    payload.roles,
    payload.clubRole,
    payload.accountRole,
    tokenInfo.role,
    tokenInfo.signupRole,
    tokenInfo.memberType,
    user.role,
    user.signupRole,
    user.memberType,
    user.membertype,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRoleValue(candidate);
    if (normalized === "ROLE_CLUB_ADMIN") return "ROLE_CLUB_ADMIN";
    if (normalized === "ROLE_ADMIN") return "ROLE_ADMIN";
    if (normalized === "ROLE_STUDENT") continue;
    if (normalized) return normalized;
  }

  const status = String(
    payload.operatorStatus ||
      payload.clubAdminRequestStatus ||
      payload.adminRequestStatus ||
      user.operatorStatus ||
      user.clubAdminRequestStatus ||
      ""
  ).toUpperCase();

  if (["APPROVED", "ACCEPTED", "ACTIVE", "COMPLETE", "COMPLETED"].includes(status)) {
    return "ROLE_CLUB_ADMIN";
  }

  if (payload.operatorRequest || payload.clubAdminRequest || user.operatorRequest || user.clubAdminRequest) {
    return "ROLE_CLUB_ADMIN";
  }

  return "ROLE_STUDENT";
}

function getStoredOperatorHintByEmail(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return null;

  const candidates = [
    localStorage.getItem("lastOperatorSignupUser"),
    localStorage.getItem("registeredUser"),
    localStorage.getItem("currentUser"),
    sessionStorage.getItem("currentUser"),
  ];

  for (const item of candidates) {
    try {
      const parsed = JSON.parse(item || "null");
      if (!parsed) continue;

      const parsedEmail = normalizeOperatorEmail(parsed.email || parsed.loginId || "");
      if (!parsedEmail || parsedEmail !== normalizedEmail) continue;

      const parsedRole = normalizeRoleValue(parsed.role || parsed.signupRole || parsed.memberType || parsed.membertype);
      const isOperator =
        parsedRole === "ROLE_CLUB_ADMIN" ||
        parsed.memberType === "CLUB_ADMIN" ||
        parsed.membertype === "CLUB_ADMIN" ||
        parsed.operatorStatus === "APPROVED" ||
        Boolean(parsed.operatorRequest);

      if (isOperator) return parsed;
    } catch {}
  }

  const lastOperatorSignupEmail = normalizeOperatorEmail(localStorage.getItem("lastOperatorSignupEmail") || "");
  if (lastOperatorSignupEmail && lastOperatorSignupEmail === normalizedEmail) {
    return {
      email: normalizedEmail,
      role: "ROLE_CLUB_ADMIN",
      signupRole: "ROLE_CLUB_ADMIN",
      operatorStatus: "APPROVED",
    };
  }

  return null;
}

function normalizeOperatorEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const ACCOUNT_ROLE_STORAGE_KEY = "accountRoleByEmail";

function getAccountRoleMap() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_ROLE_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAccountRoleForEmail(email, role) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return;

  const normalizedRole = normalizeRoleValue(role) || "ROLE_STUDENT";
  const roleMap = getAccountRoleMap();
  roleMap[normalizedEmail] = normalizedRole;
  localStorage.setItem(ACCOUNT_ROLE_STORAGE_KEY, JSON.stringify(roleMap));
}

function getAccountRoleForEmail(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return "";

  const roleMap = getAccountRoleMap();
  return normalizeRoleValue(roleMap[normalizedEmail] || "");
}


const SIGNUP_ACCOUNT_STORAGE_KEY = "signupAccountByEmail";

function getSignupAccountMap() {
  try {
    return JSON.parse(localStorage.getItem(SIGNUP_ACCOUNT_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function getSignupAccountByEmail(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return null;
  const map = getSignupAccountMap();
  return map[normalizedEmail] || null;
}

function getSignupAccountRoleForEmail(email) {
  const account = getSignupAccountByEmail(email);
  if (!account) return "";
  return normalizeRoleValue(account.role || account.signupRole || account.memberType || account.membertype || "");
}

function saveSignupAccountForEmail(email, user = {}, role = "ROLE_STUDENT") {
  const normalizedEmail = normalizeOperatorEmail(email || user.email || user.loginId || "");
  if (!normalizedEmail) return null;

  const normalizedRole = normalizeRoleValue(role || user.role || user.signupRole || user.memberType || "ROLE_STUDENT") || "ROLE_STUDENT";
  const isOperator = normalizedRole === "ROLE_CLUB_ADMIN";
  const map = getSignupAccountMap();
  const previous = map[normalizedEmail] || {};

  const account = {
    ...previous,
    ...user,
    email: normalizedEmail,
    role: isOperator ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT",
    signupRole: isOperator ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT",
    memberType: isOperator ? "CLUB_ADMIN" : "STUDENT",
    operatorStatus: isOperator ? (user.operatorStatus || "APPROVED") : "NONE",
    roleSource: "signup",
    savedAt: new Date().toISOString(),
  };

  map[normalizedEmail] = account;
  localStorage.setItem(SIGNUP_ACCOUNT_STORAGE_KEY, JSON.stringify(map));
  saveAccountRoleForEmail(normalizedEmail, account.role);

  if (isOperator) {
    const overrides = getOperatorRoleOverrides();
    overrides[normalizedEmail] = {
      ...(overrides[normalizedEmail] || {}),
      ...account,
    };
    localStorage.setItem("operatorRoleOverrides", JSON.stringify(overrides));
    localStorage.setItem("lastOperatorSignupEmail", normalizedEmail);
    localStorage.setItem("lastOperatorSignupUser", JSON.stringify(account));
  }

  if (typeof unmarkAccountDeletedForEmail === "function") {
    unmarkAccountDeletedForEmail(normalizedEmail);
  }

  return account;
}

function isSignupAccountOperator(email) {
  return getSignupAccountRoleForEmail(email) === "ROLE_CLUB_ADMIN";
}

function isOperatorRole(role) {
  return normalizeRoleValue(role) === "ROLE_CLUB_ADMIN";
}

function isStudentRole(role) {
  return normalizeRoleValue(role) === "ROLE_STUDENT";
}




function getArrayFromApiResponse(result) {
  const data = result?.data ?? result ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.clubs)) return data.clubs;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function isOperatorClubRoleValue(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');
  const role = raw.trim().toUpperCase();
  if (!role) return false;
  return (
    role.includes('ADMIN') ||
    role.includes('OWNER') ||
    role.includes('MANAGER') ||
    role.includes('PRESIDENT') ||
    role.includes('LEADER') ||
    role.includes('STAFF') ||
    role.includes('EXECUTIVE') ||
    role.includes('OPERATOR') ||
    role.includes('운영') ||
    role.includes('회장') ||
    role.includes('대표') ||
    role.includes('관리')
  );
}

function getOperatorClubFromList(clubs = []) {
  return (clubs || []).find((club) => {
    const values = [
      club.myRole,
      club.role,
      club.clubRole,
      club.memberRole,
      club.position,
      club.authority,
      club.category,
      club.status,
    ];
    return values.some(isOperatorClubRoleValue);
  }) || null;
}

function markUserAsOperatorFromClub(user = {}, club = {}) {
  const clubId = club.clubId || club.id || club.club?.clubId || club.club?.id || user.operatorRequest?.clubId || '';
  const clubName = club.name || club.clubName || club.club?.name || user.operatorRequest?.clubName || '운영 동아리';
  const nextUser = {
    ...user,
    role: 'ROLE_CLUB_ADMIN',
    signupRole: 'ROLE_CLUB_ADMIN',
    memberType: 'CLUB_ADMIN',
    operatorStatus: 'APPROVED',
    operatorRequest: {
      ...(user.operatorRequest || {}),
      clubId,
      clubName,
      clubType: club.type || club.club?.type || user.operatorRequest?.clubType || '',
      clubRole: club.myRole || club.role || club.clubRole || club.memberRole || club.position || user.operatorRequest?.clubRole || 'ADMIN',
    },
  };
  if (nextUser.email && typeof saveAccountRoleForEmail === 'function') {
    saveAccountRoleForEmail(nextUser.email, 'ROLE_CLUB_ADMIN');
  }
  return nextUser;
}

async function detectOperatorUserFromMyClubs(user = {}) {
  if (typeof apiRequest !== 'function') return user;
  try {
    const joinedResult = await apiRequest('/api/users/me/clubs');
    const clubs = getArrayFromApiResponse(joinedResult);
    const operatorClub = getOperatorClubFromList(clubs);
    if (operatorClub) return markUserAsOperatorFromClub(user, operatorClub);
  } catch (error) {
    console.warn('운영 동아리 권한 확인 실패:', error);
  }
  return user;
}

function getOperatorRoleOverrides() {
  try {
    return JSON.parse(localStorage.getItem("operatorRoleOverrides")) || {};
  } catch {
    return {};
  }
}

function getOperatorRoleOverrideByEmail(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return null;
  const overrides = getOperatorRoleOverrides();
  return overrides[normalizedEmail] || overrides[email] || null;
}

function applyOperatorRoleOverride(user = {}) {
  const email = normalizeOperatorEmail(user.email || user.loginId || localStorage.getItem("lastLoginEmail") || "");
  const currentRole = getRoleFromAuthData(user);
  const signupAccount = getSignupAccountByEmail(email);
  const signupRole = getSignupAccountRoleForEmail(email);
  const override = getOperatorRoleOverrideByEmail(email) || getStoredOperatorHintByEmail(email);
  const savedRole = getAccountRoleForEmail(email);

  // 최우선 기준: 회원가입 화면에서 선택한 회원 유형을 이메일별로 저장한 값
  if (signupRole === "ROLE_CLUB_ADMIN") {
    const account = signupAccount || override || {};
    return {
      ...user,
      ...account,
      email: user.email || account.email || email,
      name: user.name || account.name,
      studentId: user.studentId || user.studentid || account.studentId || account.studentid,
      department: user.department || account.department,
      operatorRequest: user.operatorRequest || user.clubAdminRequest || account.operatorRequest || account.clubAdminRequest || null,
      role: "ROLE_CLUB_ADMIN",
      signupRole: "ROLE_CLUB_ADMIN",
      operatorStatus: "APPROVED",
      memberType: "CLUB_ADMIN",
    };
  }

  if (signupRole === "ROLE_STUDENT") {
    return {
      ...user,
      ...(signupAccount || {}),
      email: user.email || signupAccount?.email || email,
      role: "ROLE_STUDENT",
      signupRole: "ROLE_STUDENT",
      memberType: "STUDENT",
      operatorStatus: "NONE",
      operatorRequest: null,
      clubAdminRequest: null,
    };
  }

  // 백엔드가 실제 운영진으로 내려주는 경우
  if (currentRole === "ROLE_CLUB_ADMIN") {
    return {
      ...user,
      email: user.email || email,
      role: "ROLE_CLUB_ADMIN",
      signupRole: "ROLE_CLUB_ADMIN",
      operatorStatus: user.operatorStatus || "APPROVED",
      memberType: "CLUB_ADMIN",
    };
  }

  // 기존 버전에서 운영자로 회원가입하며 저장된 이메일별 운영진 기록
  if (override) {
    saveAccountRoleForEmail(email, "ROLE_CLUB_ADMIN");
    return {
      ...user,
      ...override,
      email: user.email || override.email || email,
      name: user.name || override.name,
      studentId: user.studentId || user.studentid || override.studentId || override.studentid,
      department: user.department || override.department,
      operatorRequest: user.operatorRequest || user.clubAdminRequest || override.operatorRequest || override.clubAdminRequest || null,
      role: "ROLE_CLUB_ADMIN",
      signupRole: "ROLE_CLUB_ADMIN",
      operatorStatus: "APPROVED",
      memberType: "CLUB_ADMIN",
    };
  }

  // 구버전에서 저장된 계정별 role이 운영진이면 운영진으로 처리
  if (savedRole === "ROLE_CLUB_ADMIN") {
    return {
      ...user,
      email: user.email || email,
      role: "ROLE_CLUB_ADMIN",
      signupRole: "ROLE_CLUB_ADMIN",
      operatorStatus: "APPROVED",
      memberType: "CLUB_ADMIN",
    };
  }

  return {
    ...user,
    email: user.email || email,
    role: currentRole === "ROLE_ADMIN" ? "ROLE_ADMIN" : "ROLE_STUDENT",
    signupRole: "ROLE_STUDENT",
    memberType: user.memberType || user.membertype || "STUDENT",
    operatorStatus: "NONE",
  };
}
window.normalizeOperatorEmail = normalizeOperatorEmail;
window.saveSignupAccountForEmail = saveSignupAccountForEmail;
window.getSignupAccountByEmail = getSignupAccountByEmail;
window.getSignupAccountRoleForEmail = getSignupAccountRoleForEmail;
window.isSignupAccountOperator = isSignupAccountOperator;
window.applyOperatorRoleOverride = applyOperatorRoleOverride;
window.saveAccountRoleForEmail = saveAccountRoleForEmail;
window.getAccountRoleForEmail = getAccountRoleForEmail;
window.isOperatorRole = isOperatorRole;
window.getArrayFromApiResponse = getArrayFromApiResponse;
window.isOperatorClubRoleValue = isOperatorClubRoleValue;
window.getOperatorClubFromList = getOperatorClubFromList;
window.markUserAsOperatorFromClub = markUserAsOperatorFromClub;
window.detectOperatorUserFromMyClubs = detectOperatorUserFromMyClubs;

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

  let currentUser = {
    userId: data?.userId ?? data?.userid ?? data?.id ?? "",
    email: data?.email || tokenInfo.email || localStorage.getItem("lastLoginEmail") || "",
    name: data?.name || "",
    studentId: data?.studentId || data?.studentid || "",
    department: data?.department || "",
    role: getRoleFromAuthData(data),
    memberType: data?.memberType || data?.membertype || "",
    createdAt: data?.createdAt || "",
  };

  currentUser = applyOperatorRoleOverride(currentUser);

  if (currentUser.email) {
    const normalizedSavedRole = getAccountRoleForEmail(currentUser.email);
    if (!normalizedSavedRole && currentUser.role === "ROLE_CLUB_ADMIN") {
      saveAccountRoleForEmail(currentUser.email, "ROLE_CLUB_ADMIN");
    }
  }

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

function getCurrentUserForStorageScope() {
  return getStoredCurrentUser() || {};
}

function normalizeStorageScopeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣@._-]/gi, "_") || "anonymous";
}

function getCurrentUserStorageKey(user = getCurrentUserForStorageScope()) {
  const raw =
    user.email ||
    user.userId ||
    user.userid ||
    user.id ||
    localStorage.getItem("lastLoginEmail") ||
    "anonymous";

  return normalizeStorageScopeValue(raw);
}

function getUserScopedStorageKey(baseKey, user = getCurrentUserForStorageScope()) {
  return `${baseKey}_${getCurrentUserStorageKey(user)}`;
}

function getUserScopedStorageList(baseKey, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(getUserScopedStorageKey(baseKey))) || fallback;
  } catch {
    return fallback;
  }
}

function setUserScopedStorageList(baseKey, value) {
  localStorage.setItem(getUserScopedStorageKey(baseKey), JSON.stringify(value || []));
}

function getUserScopedStorageItem(baseKey, fallback = null) {
  try {
    const value = localStorage.getItem(getUserScopedStorageKey(baseKey));
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function setUserScopedStorageItem(baseKey, value) {
  localStorage.setItem(getUserScopedStorageKey(baseKey), JSON.stringify(value));
}

window.getCurrentUserStorageKey = getCurrentUserStorageKey;
window.getUserScopedStorageKey = getUserScopedStorageKey;
window.getUserScopedStorageList = getUserScopedStorageList;
window.setUserScopedStorageList = setUserScopedStorageList;
window.getUserScopedStorageItem = getUserScopedStorageItem;
window.setUserScopedStorageItem = setUserScopedStorageItem;


/* =========================================================
   Account deletion helpers
   - 백엔드에 DELETE /api/users/me가 있으면 실제 DB 삭제를 시도합니다.
   - API가 아직 없으면 현재 브라우저에서 해당 이메일 계정 정보를 삭제 처리하고,
     같은 브라우저에서 다시 로그인되지 않게 막습니다.
========================================================= */
const DELETED_ACCOUNT_STORAGE_KEY = "deletedAccountByEmail";

function getDeletedAccountMap() {
  try {
    return JSON.parse(localStorage.getItem(DELETED_ACCOUNT_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDeletedAccountMap(map = {}) {
  localStorage.setItem(DELETED_ACCOUNT_STORAGE_KEY, JSON.stringify(map || {}));
}

function markAccountDeletedForEmail(email, meta = {}) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return;
  const map = getDeletedAccountMap();
  map[normalizedEmail] = {
    email: normalizedEmail,
    deletedAt: new Date().toISOString(),
    ...meta,
  };
  saveDeletedAccountMap(map);
}

function unmarkAccountDeletedForEmail(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return;
  const map = getDeletedAccountMap();
  delete map[normalizedEmail];
  saveDeletedAccountMap(map);
}

function isAccountDeleted(email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return false;
  return Boolean(getDeletedAccountMap()[normalizedEmail]);
}

function removeValueFromJsonMap(storageKey, email) {
  const normalizedEmail = normalizeOperatorEmail(email);
  if (!normalizedEmail) return;
  try {
    const map = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (map && typeof map === "object") {
      delete map[normalizedEmail];
      localStorage.setItem(storageKey, JSON.stringify(map));
    }
  } catch {}
}

function removeAccountScopedLocalData(email) {
  const normalizedEmail = normalizeOperatorEmail(email || localStorage.getItem("lastLoginEmail") || "");
  const currentUser = getStoredCurrentUser() || { email: normalizedEmail };
  const scopeKey = getCurrentUserStorageKey({ ...currentUser, email: normalizedEmail });

  [
    "operatorRoleOverrides",
    "signupAccountByEmail",
    "accountRoleByEmail",
    "deletedAccountByEmail",
  ].forEach((key) => {
    if (key !== DELETED_ACCOUNT_STORAGE_KEY) removeValueFromJsonMap(key, normalizedEmail);
  });

  // 현재 계정 전용으로 저장했던 캐시만 삭제합니다.
  const suffix = `_${scopeKey}`;
  Object.keys(localStorage).forEach((key) => {
    if (key.endsWith(suffix) || key.includes(suffix + "_")) {
      localStorage.removeItem(key);
    }
  });

  // 구버전에서 전역으로 저장되던 일부 사용자 캐시도 정리합니다.
  localStorage.removeItem("bookmarkedClubs");
  localStorage.removeItem("mypageMyPosts");
  localStorage.removeItem("lastCreatedBoardPost");

  const lastOperatorEmail = normalizeOperatorEmail(localStorage.getItem("lastOperatorSignupEmail") || "");
  if (lastOperatorEmail === normalizedEmail) {
    localStorage.removeItem("lastOperatorSignupEmail");
    localStorage.removeItem("lastOperatorSignupUser");
  }

  const registered = (() => {
    try { return JSON.parse(localStorage.getItem("registeredUser") || "null"); } catch { return null; }
  })();
  if (normalizeOperatorEmail(registered?.email || "") === normalizedEmail) {
    localStorage.removeItem("registeredUser");
  }

  localStorage.removeItem("signupRole");
  localStorage.removeItem("signupStatus");
}

async function requestAccountDeletionOnServer(password) {
  const token = getAuthToken();
  const trimmedPassword = String(password || "").trim();

  if (!trimmedPassword) {
    throw new Error("회원 탈퇴를 하려면 현재 비밀번호를 입력해야 합니다.");
  }

  if (!token) {
    throw new Error("로그인이 필요합니다. 다시 로그인한 뒤 시도해주세요.");
  }

  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: trimmedPassword }),
  });

  const text = await response.text();
  let result = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = { message: text }; }

  if (!response.ok) {
    throw new Error(result.message || result.error || "회원 탈퇴 요청에 실패했습니다.");
  }

  return { serverDeleted: true, endpoint: "/api/users/me", result };
}

async function deleteCurrentAccount(password) {
  const user = getStoredCurrentUser() || {};
  const email = normalizeOperatorEmail(user.email || localStorage.getItem("lastLoginEmail") || "");
  const serverResult = await requestAccountDeletionOnServer(password);

  removeAccountScopedLocalData(email);
  clearAuthSession();
  return { ...serverResult, email };
}

window.getDeletedAccountMap = getDeletedAccountMap;
window.markAccountDeletedForEmail = markAccountDeletedForEmail;
window.unmarkAccountDeletedForEmail = unmarkAccountDeletedForEmail;
window.isAccountDeleted = isAccountDeleted;
window.removeAccountScopedLocalData = removeAccountScopedLocalData;
window.deleteCurrentAccount = deleteCurrentAccount;

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
