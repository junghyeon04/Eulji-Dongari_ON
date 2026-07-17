if (!isLoggedIn()) {
  document.body.classList.add("protected-page-locked");
  openLoginRequiredModal("마이페이지는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?");
} else {
/* =========================================================
   MyPage
   - 기본 화면: 일반 회원 마이페이지
   - 내 프로필: 기본 정보 / 계정 보안
   - 운영자 신청/운영진: 운영 동아리 메뉴 추가
========================================================= */

const BOOKMARK_STORAGE_KEY = "bookmarkedClubs";
const BOARD_POST_STORAGE_KEY = "clubBoardPosts";

const mypageState = {
  user: {
    name: "",
    email: "",
    department: "",
    studentId: "",
    joinDate: "",
  },
  joinedClubs: [],
  operatorClubs: [],
  applications: [],
  posts: [],
  postsTotal: 0,
  operatorRecentPosts: [],
  operatorApplicants: [],
  operatorApplicantStatusFilter: "",
  activity: [
    {
      key: "posts",
      title: "내가 쓴 게시물",
      count: 0,
      icon: "pen",
    },
    {
      key: "reviews",
      title: "내가 쓴 후기",
      count: 0,
      icon: "clipboard",
    },
    {
      key: "applications",
      title: "지원 내역",
      count: 0,
      icon: "book",
    },
    {
      key: "scraps",
      title: "스크랩",
      count: 0,
      icon: "bookmark",
    },
  ],
  notifications: [],
};

const STATUS_MAP = {
  OPEN: {
    text: "모집 중",
    className: "status-open",
  },
  CLOSED: {
    text: "모집마감",
    className: "status-closed",
  },
  ALWAYS: {
    text: "상시 모집",
    className: "status-always",
  },
};

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}


function normalizeMyPageRoleValue(value) {
  if (typeof normalizeRoleValue === "function") return normalizeRoleValue(value);
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  const role = raw.trim().toUpperCase();
  if (!role) return "";
  if (role.includes("ROLE_CLUB_ADMIN") || role === "CLUB_ADMIN" || role.includes("CLUB_ADMIN")) return "ROLE_CLUB_ADMIN";
  if (role.includes("OPERATOR") || role.includes("MANAGER") || role.includes("OWNER")) return "ROLE_CLUB_ADMIN";
  if (role.includes("STUDENT") || role.includes("MEMBER")) return "ROLE_STUDENT";
  return role.startsWith("ROLE_") ? role : `ROLE_${role}`;
}

function getStoredUser() {
  const activeUser =
    safeJsonParse(sessionStorage.getItem("currentUser")) ||
    safeJsonParse(localStorage.getItem("currentUser"));

  if (activeUser) return activeUser;

  // 로그인 중인데 currentUser가 없는 경우에는 이전 계정의 registeredUser를 사용하지 않습니다.
  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    return {
      email: localStorage.getItem("lastLoginEmail") || "",
      role: localStorage.getItem("userRole") || sessionStorage.getItem("userRole") || "ROLE_STUDENT",
    };
  }

  return safeJsonParse(localStorage.getItem("registeredUser")) || null;
}

function getMyPageUserStorageKey() {
  if (typeof getCurrentUserStorageKey === "function") return getCurrentUserStorageKey(getStoredUser() || {});
  const user = getStoredUser() || {};
  const raw = user.email || user.userId || user.userid || user.id || localStorage.getItem("lastLoginEmail") || "anonymous";
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9가-힣@._-]/gi, "_") || "anonymous";
}

function scopedMyPageStorageKey(baseKey) {
  if (typeof getUserScopedStorageKey === "function") return getUserScopedStorageKey(baseKey, getStoredUser() || {});
  return `${baseKey}_${getMyPageUserStorageKey()}`;
}

function getScopedMyPageList(baseKey) {
  return safeJsonParse(localStorage.getItem(scopedMyPageStorageKey(baseKey))) || [];
}

function getScopedMyPageItem(baseKey, fallback = null) {
  return safeJsonParse(localStorage.getItem(scopedMyPageStorageKey(baseKey))) || fallback;
}

function getUserEmailForCompare(user = {}) {
  return String(user.email || user.loginId || "").trim().toLowerCase();
}

function mergeOnlySameUser(base = {}, next = {}) {
  const baseEmail = getUserEmailForCompare(base);
  const nextEmail = getUserEmailForCompare(next);

  if (baseEmail && nextEmail && baseEmail !== nextEmail) {
    return { ...next };
  }

  return { ...base, ...next };
}

function saveStoredUser(nextUser) {
  const registeredUser = safeJsonParse(localStorage.getItem("registeredUser")) || {};
  let mergedRegisteredUser = mergeOnlySameUser(registeredUser, nextUser);

  if (typeof applyOperatorRoleOverride === "function") {
    mergedRegisteredUser = applyOperatorRoleOverride(mergedRegisteredUser);
  }

  localStorage.setItem("registeredUser", JSON.stringify(mergedRegisteredUser));

  if (localStorage.getItem("currentUser")) {
    const mergedCurrentUser = mergeOnlySameUser(
      safeJsonParse(localStorage.getItem("currentUser")) || {},
      nextUser
    );
    const fixedUser =
      typeof applyOperatorRoleOverride === "function"
        ? applyOperatorRoleOverride(mergedCurrentUser)
        : mergedCurrentUser;

    localStorage.setItem("currentUser", JSON.stringify(fixedUser));
    localStorage.setItem("userRole", fixedUser.role || "ROLE_STUDENT");
  }

  if (sessionStorage.getItem("currentUser")) {
    const mergedCurrentUser = mergeOnlySameUser(
      safeJsonParse(sessionStorage.getItem("currentUser")) || {},
      nextUser
    );
    const fixedUser =
      typeof applyOperatorRoleOverride === "function"
        ? applyOperatorRoleOverride(mergedCurrentUser)
        : mergedCurrentUser;

    sessionStorage.setItem("currentUser", JSON.stringify(fixedUser));
    sessionStorage.setItem("userRole", fixedUser.role || "ROLE_STUDENT");
  }
}

function getDisplayUser() {
  const storedUser = getStoredUser();

  const merged = {
    ...mypageState.user,
    ...(storedUser || {}),
    joinDate: storedUser?.joinDate || storedUser?.createdAt || storedUser?.createdAtText || "2026.06.01",
  };

  return typeof applyOperatorRoleOverride === "function"
    ? applyOperatorRoleOverride(merged)
    : merged;
}

function isOperatorUser() {
  const user = getDisplayUser();
  const email = getUserEmailForCompare(user) || String(localStorage.getItem("lastLoginEmail") || "").trim().toLowerCase();
  const signupRole = typeof getSignupAccountRoleForEmail === "function" ? getSignupAccountRoleForEmail(email) : "";
  if (signupRole === "ROLE_CLUB_ADMIN") return true;
  if (signupRole === "ROLE_STUDENT") return false;

  const savedRole = typeof getAccountRoleForEmail === "function" ? getAccountRoleForEmail(email) : "";
  const role = normalizeMyPageRoleValue(user.role || user.signupRole || user.memberType || user.membertype || savedRole || "");
  const status = String(user.operatorStatus || user.clubAdminRequestStatus || "").toUpperCase();

  return (
    role === "ROLE_CLUB_ADMIN" ||
    savedRole === "ROLE_CLUB_ADMIN" ||
    user.memberType === "CLUB_ADMIN" ||
    user.membertype === "CLUB_ADMIN" ||
    ["APPROVED", "ACCEPTED", "ACTIVE", "COMPLETE", "COMPLETED"].includes(status) ||
    Boolean(user.operatorRequest || user.clubAdminRequest) ||
    (Array.isArray(mypageState.operatorClubs) && mypageState.operatorClubs.length > 0)
  );
}
function getOperatorRequest() {
  const user = getDisplayUser();
  return user.operatorRequest || {};
}

function getOperatorFallbackClub() {
  const request = getOperatorRequest();

  if (!request.clubId && !request.clubName) return null;

  return {
    clubId: String(request.clubId || ""),
    id: String(request.clubId || ""),
    name: request.clubName || "운영 동아리",
    type: request.clubType || "",
    typeText: request.clubType === "CENTRAL" ? "중앙동아리" : request.clubType === "GENERAL" ? "일반동아리" : "운영 동아리",
    category: "운영진",
    myRole: request.clubRole || "ADMIN",
    image: "",
  };
}

function getSavedClubs() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveClubs(clubs) {
  localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(clubs));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getResponseData(result, fallback = []) {
  return result?.data ?? result ?? fallback;
}

function getPagedContent(result) {
  const data = getResponseData(result, {});
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.posts)) return data.posts;
  if (Array.isArray(data.applications)) return data.applications;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.records)) return data.records;
  return [];
}

function getPagedTotal(result, fallbackLength = 0) {
  const data = getResponseData(result, {});
  return Number(data.totalElements ?? data.totalCount ?? fallbackLength) || fallbackLength;
}

function formatDate(value) {
  if (!value) return "-";
  const text = String(value);
  return text.includes("T") ? text.split("T")[0] : text.split(" ")[0];
}

function getApplicationStatusLabel(status) {
  const labels = {
    PENDING: "대기",
    APPROVED: "승인",
    REJECTED: "거절",
    CANCELLED: "취소",
  };

  return labels[status] || status || "대기";
}

function getApplicationStatusClass(status) {
  const classes = {
    PENDING: "status-pending",
    APPROVED: "status-approved",
    REJECTED: "status-rejected",
    CANCELLED: "status-cancelled",
  };

  return classes[status] || "status-pending";
}

function getPostCategoryLabel(category) {
  const labels = {
    NOTICE: "공지",
    RESOURCE: "자료",
    MATERIAL: "자료",
    QUESTION: "질문",
  };

  return labels[category] || category || "게시물";
}

function getPostClubId(post) {
  return String(post.clubId || post.clubid || post.clubID || post.__clubId || post.club?.clubId || post.club?.id || "");
}

function getPostId(post) {
  return String(post.postId || post.postid || post.id || post.post?.postId || "");
}


const DEFAULT_BOARD_SEED_TITLES = [
  "2026년 2학기 아기사자 모집",
  "비전공자도 지원 가능한가요?",
  "스터디는 온라인으로 참여 가능할까요?",
  "해커톤 참가 팀 모집 안내",
  "7~8월 정기 스터디 일정 안내",
  "2학기 아기사자 모집은 언제 하나요?",
  "6~9주차 기초 스터디 자료",
  "멋사 미니프로젝트 최종 자료",
  "1~5주차 기초 스터디 자료",
  "2026년 1학기 아기사자 모집",
];

function isDefaultBoardSeedPost(post) {
  const title = String(post?.title || "").trim();
  const author = String(post?.author || post?.authorName || post?.writerName || "").trim();

  if (!title) return false;
  if (DEFAULT_BOARD_SEED_TITLES.includes(title)) return true;

  const seedAuthor = author === "운영진" || author === "이*현" || author === "작성자";
  if (seedAuthor && /모집 안내$/.test(title)) return true;
  if (seedAuthor && /활동은 어떻게 진행되나요\?$/.test(title)) return true;
  if (seedAuthor && /소개 자료$/.test(title)) return true;

  return false;
}

function removeDefaultBoardSeedPosts(posts = []) {
  return posts.filter((post) => !isDefaultBoardSeedPost(post));
}

function getLocalBoardPosts() {
  const boardPosts = removeDefaultBoardSeedPosts(safeJsonParse(localStorage.getItem(BOARD_POST_STORAGE_KEY), []) || []);
  const scopedMypagePosts = removeDefaultBoardSeedPosts(getScopedMyPageList("mypageMyPosts"));
  const scopedLastPost = getScopedMyPageItem("lastCreatedBoardPost", null);
  const scopedExtraPosts = removeDefaultBoardSeedPosts(getScopedMyPageList("myCreatedBoardPosts"));
  const perClubPosts = [];

  // 동아리 게시판 캐시는 전체 게시판 표시용이라 계정이 섞일 수 있습니다.
  // 마이페이지에서는 아래 isMyLocalPost()에서 현재 로그인 계정의 게시물만 걸러서 사용합니다.
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith("clubBoardPosts_")) return;
    if (key.startsWith("clubBoardPosts_") && key.includes("@")) return;

    const clubId = key.replace("clubBoardPosts_", "");
    const posts = safeJsonParse(localStorage.getItem(key), []) || [];
    const cleanedPosts = removeDefaultBoardSeedPosts(posts);
    if (cleanedPosts.length !== posts.length) {
      localStorage.setItem(key, JSON.stringify(cleanedPosts));
    }

    cleanedPosts.forEach((post) => {
      perClubPosts.push({
        ...post,
        clubId: post.clubId || clubId,
        postId: post.postId || post.id,
        source: post.source || "club-detail-board-cache",
      });
    });
  });

  const map = new Map();

  [
    ...boardPosts,
    ...perClubPosts,
    ...scopedMypagePosts,
    ...scopedExtraPosts,
    ...(scopedLastPost && !isDefaultBoardSeedPost(scopedLastPost) ? [scopedLastPost] : []),
  ].forEach((post, index) => {
    const key = `${getPostClubId(post) || "club"}-${getPostId(post) || `local-${index}`}`;
    map.set(key, {
      ...post,
      clubId: getPostClubId(post),
      postId: getPostId(post),
      source: post.source || "board-local-cache",
    });
  });

  return removeDefaultBoardSeedPosts(Array.from(map.values()));
}

function getKoreanNameOnly(value) {
  return String(value || "").replace(/[^가-힣]/g, "");
}

function isMaskedNameMatch(userName, authorName) {
  const user = getKoreanNameOnly(userName);
  const author = getKoreanNameOnly(authorName);

  if (!user || !author) return false;
  if (user === author) return true;

  // 예: 이정현 / 이*현, 김민수 / 김*수 처럼 가운데가 마스킹된 작성자명 처리
  if (author.length >= 2 && user.length >= 2) {
    return user[0] === author[0] && user[user.length - 1] === author[author.length - 1];
  }

  return false;
}

function getCurrentUserIdentity() {
  const user = getDisplayUser();

  return {
    userId: String(user.userId || user.userid || user.id || ""),
    email: String(user.email || "").toLowerCase(),
    name: String(user.name || ""),
  };
}

function isMyLocalPost(post) {
  const user = getCurrentUserIdentity();
  const currentOwnerKey = getMyPageUserStorageKey();
  const ownerKey = String(post.ownerKey || post.owner || "").toLowerCase();
  const ownerEmail = String(post.ownerEmail || "").toLowerCase();
  const ownerUserId = String(post.ownerUserId || "");
  const authorId = String(post.authorId || post.userId || post.userid || post.writerId || post.memberId || "");
  const authorEmail = String(post.authorEmail || post.email || post.writerEmail || "").toLowerCase();
  const authorName = String(post.authorName || post.writerName || post.memberName || post.author || "");

  if (ownerKey && ownerKey === currentOwnerKey) return true;
  if (user.email && ownerEmail && user.email === ownerEmail) return true;
  if (user.userId && ownerUserId && user.userId === ownerUserId) return true;
  if (user.userId && authorId && user.userId === authorId) return true;
  if (user.email && authorEmail && user.email === authorEmail) return true;
  // 이름만으로는 다른 계정의 게시물이 섞일 수 있어서,
  // 마이페이지 로컬 게시물 판별에는 이메일/사용자ID/계정별 저장키만 사용합니다.

  const createdIds = getScopedMyPageList("myCreatedBoardPostIds");
  const clubId = getPostClubId(post);
  const postId = getPostId(post);
  if (clubId && postId && createdIds.some((item) => String(item.clubId) === String(clubId) && String(item.postId) === String(postId))) {
    return true;
  }

  return false;
}

function normalizeLocalPost(post) {
  return {
    ...post,
    clubId: getPostClubId(post),
    postId: getPostId(post),
    clubName: post.clubName || post.club?.name || "동아리",
    source: post.source || "board-local-cache",
  };
}

function getLocalMyPosts() {
  const localPosts = getLocalBoardPosts();
  const matchedPosts = localPosts.filter(isMyLocalPost);

  return matchedPosts.map(normalizeLocalPost);
}

function normalizeBoardPostFromClub(post, club = {}) {
  return {
    ...post,
    clubId: getPostClubId(post) || club.clubId || club.id || "",
    postId: getPostId(post),
    clubName: post.clubName || post.club?.name || club.name || "동아리",
  };
}

function isProbablyMyApiPost(post) {
  const user = getCurrentUserIdentity();
  const authorId = String(post.authorId || post.userId || post.userid || post.writerId || post.memberId || "");
  const authorEmail = String(post.authorEmail || post.email || post.writerEmail || "").toLowerCase();
  const authorName = String(post.authorName || post.writerName || post.memberName || post.author || "");

  if (user.userId && authorId && user.userId === authorId) return true;
  if (user.email && authorEmail && user.email === authorEmail) return true;
  // 이름만으로 비교하면 같은 브라우저의 다른 계정 게시물이 섞일 수 있으므로 사용하지 않습니다.

  return false;
}

async function fetchPostsFromMyClubs() {
  let clubs = mypageState.joinedClubs || [];

  if (clubs.length === 0) {
    try {
      const joinedResult = await apiRequest("/api/users/me/clubs");
      clubs = (joinedResult.data || []).map(normalizeApiClub);
    } catch (error) {
      console.warn("게시물 확인용 내 동아리 조회 실패:", error);
      clubs = [];
    }
  }

  if (clubs.length === 0) return [];

  const results = await Promise.allSettled(
    clubs.map(async (club) => {
      const clubId = club.clubId || club.id;
      if (!clubId) return [];

      const result = await apiRequest(`/api/clubs/${clubId}/posts?page=0&size=100`);
      return getPagedContent(result).map((post) => normalizeBoardPostFromClub(post, club));
    })
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

function getLocalPostsByClubId(clubId) {
  return getLocalBoardPosts()
    .filter((post) => String(getPostClubId(post)) === String(clubId))
    .map((post) => ({
      ...post,
      clubId: getPostClubId(post),
      postId: getPostId(post),
      clubName: post.clubName || post.club?.name || "동아리",
      source: post.source || "board-local-cache",
    }));
}

function mergePostLists(apiPosts = [], localPosts = []) {
  const map = new Map();

  localPosts.forEach((post, index) => {
    const key = `${getPostClubId(post) || "club"}-${getPostId(post) || `local-${index}`}`;
    map.set(key, post);
  });

  apiPosts.forEach((post, index) => {
    const key = `${getPostClubId(post) || post.clubId || "club"}-${getPostId(post) || `api-${index}`}`;
    const previous = map.get(key) || {};
    map.set(key, {
      ...previous,
      ...post,
      clubId: getPostClubId(post) || previous.clubId || "",
      clubName: post.clubName || post.club?.name || previous.clubName || "동아리",
    });
  });

  return removeDefaultBoardSeedPosts(Array.from(map.values())).sort((a, b) =>
    String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || ""))
  );
}

function getApplicationId(application) {
  return application.applicationId || application.applicationid || application.id || "";
}

function getApplicationClubName(application) {
  return application.clubName || application.club?.name || application.name || "동아리";
}

function getApplicationClubId(application) {
  return application.clubId || application.club?.clubId || application.club?.id || "";
}

function iconTemplate(type) {
  const icons = {
    pen: `
      <svg class="activity-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 35l4-11 15-15 7 7-15 15-11 4Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
        <path d="M29 12l7 7" stroke="currentColor" stroke-width="4"/>
      </svg>
    `,
    clipboard: `
      <svg class="activity-icon" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="13" y="10" width="22" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="4"/>
        <path d="M19 10a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="4"/>
        <path d="M19 22h10M19 30h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
    book: `
      <svg class="activity-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 13c7-4 13-3 16 1v26c-3-4-9-5-16-1V13Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
        <path d="M40 13c-7-4-13-3-16 1v26c3-4 9-5 16-1V13Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
      </svg>
    `,
    bookmark: `
      <svg class="activity-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M16 8h16a2 2 0 0 1 2 2v30L24 34l-10 6V10a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
      </svg>
    `,
    bell: `
      <svg class="notification-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 23h16l-2-3v-6a6 6 0 0 0-12 0v6l-2 3Z" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M13 25a3 3 0 0 0 6 0" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `,
  };

  return icons[type] || "";
}

function renderProfile() {
  const user = getDisplayUser();

  document.querySelector("#profileName").textContent = user.name || "이름 없음";
  document.querySelector("#profileEmail").textContent = user.email || "";
  document.querySelector("#profileMeta").textContent =
    user.department || user.studentId ? `${user.department || ""} ㅣ ${user.studentId || ""}` : "";
}

function renderProfileDetail() {
  const user = getDisplayUser();

  const fields = {
    name: user.name || "-",
    department: user.department || "-",
    studentId: user.studentId || user.studentid || "-",
    email: user.email || "-",
    joinDate: user.joinDate || "-",
  };

  Object.entries(fields).forEach(([key, value]) => {
    const target = document.querySelector(`[data-profile-field="${key}"]`);
    if (target) target.textContent = value;
  });
}

function renderOperatorArea() {
  const operatorMenu = document.querySelector("#operatorSidebarMenu");
  if (!operatorMenu) return;

  const shouldShowOperatorMenu = isOperatorUser();
  operatorMenu.style.display = shouldShowOperatorMenu ? "block" : "none";

  const request = getOperatorRequest();
  const clubName = request.clubName || "운영 동아리";
  const statusText = request.clubName
    ? `${request.clubName} 운영자로 로그인되었습니다. 운영진 메뉴를 바로 사용할 수 있습니다.`
    : "운영자 권한으로 로그인되었습니다. 운영 동아리를 선택해 관리 기능을 사용할 수 있습니다.";

  const operatorClubName = document.querySelector("#operatorClubName");
  const operatorDashboardClubName = document.querySelector("#operatorDashboardClubName");
  const operatorClubStatus = document.querySelector("#operatorClubStatus");

  if (operatorClubName) operatorClubName.textContent = clubName;
  if (operatorDashboardClubName) operatorDashboardClubName.textContent = clubName;
  if (operatorClubStatus) operatorClubStatus.textContent = statusText;
}

function normalizeUserFromApi(data = {}) {
  const role = normalizeMyPageRoleValue(
    data.role ||
      data.signupRole ||
      data.memberType ||
      data.membertype ||
      data.userRole ||
      data.authority ||
      data.authorities ||
      data.roles ||
      "ROLE_STUDENT"
  ) || "ROLE_STUDENT";

  const operatorStatus = data.operatorStatus || data.clubAdminRequestStatus || data.adminRequestStatus || "";
  const normalizedStatus = String(operatorStatus || "").toUpperCase();
  const isApprovedOperator =
    role === "ROLE_CLUB_ADMIN" ||
    ["APPROVED", "ACCEPTED", "ACTIVE", "COMPLETE", "COMPLETED"].includes(normalizedStatus) ||
    Boolean(data.operatorRequest || data.clubAdminRequest);

  return {
    userId: data.userId || data.userid || data.id || "",
    email: data.email || "",
    name: data.name || "",
    studentId: data.studentId || data.studentid || "",
    department: data.department || "",
    role: isApprovedOperator ? "ROLE_CLUB_ADMIN" : role,
    memberType: isApprovedOperator ? "CLUB_ADMIN" : (data.memberType || data.membertype || ""),
    signupRole: data.signupRole || (isApprovedOperator ? "ROLE_CLUB_ADMIN" : ""),
    operatorStatus: operatorStatus || (isApprovedOperator ? "APPROVED" : ""),
    operatorRequest: data.operatorRequest || data.clubAdminRequest || null,
    createdAt: data.createdAt || "",
    joinDate: data.createdAt || data.joinDate || data.createdAtText || "",
    emailVerified: data.emailVerified ?? data.emailverified ?? data.verified ?? data.emailAuthVerified ?? true,
  };
}
function saveUserFromApi(data = {}) {
  const storedUser = getStoredUser() || {};
  let nextUser = normalizeUserFromApi({
    ...storedUser,
    ...data,
    email: data.email || storedUser.email || localStorage.getItem("lastLoginEmail") || "",
    name: data.name || storedUser.name || "",
    studentId: data.studentId || data.studentid || storedUser.studentId || storedUser.studentid || "",
    department: data.department || storedUser.department || "",
    role: data.role || data.memberType || data.membertype || storedUser.role || storedUser.memberType || "ROLE_STUDENT",
    memberType: data.memberType || data.membertype || storedUser.memberType || "",
    signupRole: data.signupRole || storedUser.signupRole || "",
    operatorStatus: data.operatorStatus || data.clubAdminRequestStatus || storedUser.operatorStatus || "",
  });

  if (typeof applyOperatorRoleOverride === "function") {
    nextUser = applyOperatorRoleOverride(nextUser);
  }

  if (typeof saveAccountRoleForEmail === "function" && nextUser.email) {
    const normalizedRole = normalizeMyPageRoleValue(nextUser.role || nextUser.memberType || "");
    if (normalizedRole === "ROLE_CLUB_ADMIN") {
      saveAccountRoleForEmail(nextUser.email, "ROLE_CLUB_ADMIN");
    }
  }

  saveStoredUser(nextUser);
  mypageState.user = {
    ...mypageState.user,
    ...nextUser,
  };

  return nextUser;
}

function renderEmailVerificationStatus() {
  const target = document.querySelector("#emailVerificationStatus");
  if (!target) return;

  const user = getDisplayUser();
  const verified = user.emailVerified ?? user.emailverified ?? user.verified ?? user.emailAuthVerified ?? true;
  target.textContent = verified ? "인증완료" : "미인증";
}

async function updateMyProfileOnServer(payload) {
  if (typeof apiRequest !== "function") {
    throw new Error("api.js가 연결되지 않았습니다.");
  }

  const result = await apiRequest("/api/users/me", {
    method: "PATCH",
    body: payload,
  });

  const data = result?.data || payload;
  return saveUserFromApi(data);
}

async function setProfileEditMode(isEditMode) {
  const editButton = document.querySelector("#profileInfoEditBtn");
  const user = getDisplayUser();

  if (!editButton) return;

  if (isEditMode) {
    ["name", "department"].forEach((key) => {
      const field = document.querySelector(`[data-profile-field="${key}"]`);
      if (!field) return;

      const value = user[key] || "";
      field.innerHTML = `<input class="profile-edit-input" data-profile-input="${key}" type="text" value="${escapeHtml(value)}" />`;
    });

    const studentIdField = document.querySelector('[data-profile-field="studentId"]');
    if (studentIdField) studentIdField.textContent = user.studentId || user.studentid || "-";

    editButton.textContent = "저장";
    editButton.dataset.mode = "edit";
    return;
  }

  const nextUser = {
    name: document.querySelector('[data-profile-input="name"]')?.value.trim() || "",
    department: document.querySelector('[data-profile-input="department"]')?.value.trim() || "",
  };

  if (!nextUser.name || !nextUser.department) {
    alert("이름과 학과를 모두 입력해주세요.");
    return;
  }

  editButton.disabled = true;
  editButton.textContent = "저장 중...";

  try {
    await updateMyProfileOnServer(nextUser);

    editButton.textContent = "정보 수정";
    editButton.dataset.mode = "view";

    renderProfile();
    renderProfileDetail();
    renderEmailVerificationStatus();
    alert("프로필 정보가 DB에 저장되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "프로필 정보 수정에 실패했습니다.");
    editButton.textContent = "저장";
    editButton.dataset.mode = "edit";
  } finally {
    editButton.disabled = false;
  }
}

function joinedClubTemplate(club) {
  const logo = club.image
    ? `<img src="${club.image}" alt="${club.name} 로고" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;logo-placeholder&quot;></div>'" />`
    : `<div class="logo-placeholder"></div>`;

  return `
    <article class="joined-club-item" data-club-link="${club.clubId}" role="link" tabindex="0">
      <div class="joined-club-logo">${logo}</div>
      <div class="joined-club-info">
        <h3>${club.name}</h3>
        <p>${club.typeText} ㅣ ${club.category}</p>
      </div>
      <span class="arrow-icon">›</span>
    </article>
  `;
}

function renderJoinedClubs() {
  const shortList = document.querySelector("#joinedClubList");
  const fullList = document.querySelector("#joinedClubListFull");

  const emptyHtml = `
    <div class="mypage-empty-line">
      아직 가입한 동아리가 없습니다.
    </div>
  `;

  const html = mypageState.joinedClubs.length === 0
    ? emptyHtml
    : mypageState.joinedClubs.map(joinedClubTemplate).join("\n\n");

  if (shortList) shortList.innerHTML = html;
  if (fullList) fullList.innerHTML = html;

  bindJoinedClubLinks();
}

function bindJoinedClubLinks() {
  document.querySelectorAll("[data-club-link]").forEach((item) => {
    item.addEventListener("click", () => {
      const clubId = item.dataset.clubLink;
      if (!clubId) return;

      window.location.href = `./club-detail.html?clubId=${clubId}`;
    });

    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      const clubId = item.dataset.clubLink;
      if (!clubId) return;

      window.location.href = `./club-detail.html?clubId=${clubId}`;
    });
  });
}

function renderActivity() {
  const grid = document.querySelector("#activityGrid");
  if (!grid) return;

  const savedCount = getSavedClubs().length;

  grid.innerHTML = mypageState.activity
    .map((item) => {
      const count = item.key === "scraps" ? savedCount : item.count;

      return `
        <button type="button" class="activity-card" data-activity="${item.key}">
          ${iconTemplate(item.icon)}
          <h3>${item.title}</h3>
          <strong class="activity-count">${count}</strong>
          <span class="activity-unit">개</span>
        </button>
      `;
    })
    .join("\n\n");

  document.querySelectorAll("[data-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.activity;

      if (key === "scraps") setActiveTab("scraps");
      if (key === "applications") setActiveTab("applications");
      if (key === "posts") setActiveTab("posts");
    });
  });
}

function renderNotifications() {
  const list = document.querySelector("#notificationList");
  if (!list) return;

  if (mypageState.notifications.length === 0) {
    list.innerHTML = `
      <div class="mypage-empty-line">
        최근 알림이 없습니다.
      </div>
    `;
    return;
  }

  list.innerHTML = mypageState.notifications
    .map((notice) => {
      return `
        <article class="notification-item">
          ${iconTemplate("bell")}
          <p>${notice.message}</p>
          <span class="notification-date">${notice.date}</span>
        </article>
      `;
    })
    .join("\n\n");
}

function renderScraps() {
  const grid = document.querySelector("#scrapGrid");
  const empty = document.querySelector("#scrapEmpty");
  const savedClubs = getSavedClubs();

  if (!grid || !empty) return;

  grid.innerHTML = "";

  if (savedClubs.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  grid.innerHTML = savedClubs
    .map((club) => {
      const statusInfo = STATUS_MAP[club.status] || STATUS_MAP.CLOSED;

      return `
        <article class="club-card" data-scrap-id="${club.id}">
          <div class="club-thumb">
            ${club.image ? `<img src="${club.image}" alt="${club.name} 이미지" onerror="this.style.display='none'" />` : ""}
          </div>
          <div class="club-content">
            <h3>${club.name}</h3>
            <p>${club.description || ""}</p>
            <div class="club-bottom">
              <em class="tag ${statusInfo.className}">${statusInfo.text}</em>
              <button type="button" class="bookmark-btn" data-remove-scrap="${club.id}" aria-label="${club.name} 찜 취소">
                <img src="./images/checkbox-on.svg" alt="" class="bookmark-icon" />
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("\n\n");

  document.querySelectorAll("[data-remove-scrap]").forEach((button) => {
    button.addEventListener("click", async () => {
      const removeId = button.dataset.removeScrap;
      const targetClub = getSavedClubs().find((club) => String(club.id) === String(removeId));

      button.disabled = true;

      try {
        if (typeof setBookmarkOnServer === "function") {
          await setBookmarkOnServer(targetClub || { id: removeId, clubId: removeId }, false);
        } else if (typeof apiRequest === "function") {
          await apiRequest(`/api/clubs/${removeId}/bookmarks`, {
            method: "DELETE",
          });

          const nextClubs = getSavedClubs().filter((club) => String(club.id) !== String(removeId));
          saveClubs(nextClubs);
        }

        try {
          if (typeof syncBookmarksFromServer === "function") {
            await syncBookmarksFromServer();
          }
        } catch (syncError) {
          console.warn("스크랩 목록 재동기화 실패:", syncError);
        }

        renderScraps();
        renderActivity();
      } catch (error) {
        console.error(error);
        alert(error.message || "스크랩 취소에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    });
  });
}

function renderApplications() {
  const summary = document.querySelector("#myApplicationsSummary");
  const list = document.querySelector("#myApplicationsList");
  if (!summary || !list) return;

  const applications = mypageState.applications || [];

  if (applications.length === 0) {
    summary.textContent = "아직 지원한 동아리가 없습니다.";
    list.innerHTML = `
      <div class="mypage-api-empty">
        지원 내역이 없습니다.<br />동아리 지원 페이지에서 관심 있는 동아리에 지원해보세요.
      </div>
    `;
    return;
  }

  summary.textContent = `총 ${applications.length}개의 지원 내역이 있습니다.`;
  list.innerHTML = applications
    .map((application) => {
      const applicationId = getApplicationId(application);
      const clubId = getApplicationClubId(application);
      const clubName = getApplicationClubName(application);
      const status = application.status || "PENDING";
      const content = application.content || application.answer || application.answersText || "지원 내용이 저장되어 있습니다.";
      const createdAt = application.createdAt || application.appliedAt || application.createdDate || "";

      return `
        <article class="mypage-api-card application-history-card" data-application-id="${escapeHtml(applicationId)}" data-application-club-id="${escapeHtml(clubId)}">
          <div class="mypage-api-card-head">
            <div>
              <h3>${escapeHtml(clubName)}</h3>
              <p>${escapeHtml(formatDate(createdAt))}</p>
            </div>
            <span class="operator-api-status ${getApplicationStatusClass(status)}">
              ${getApplicationStatusLabel(status)}
            </span>
          </div>
          <div class="mypage-api-content">
            <strong>지원 내용</strong>
            <p>${escapeHtml(content)}</p>
          </div>
          <div class="mypage-api-actions">
            ${clubId ? `<a href="./club-detail.html?clubId=${encodeURIComponent(clubId)}" class="mypage-api-link">동아리 상세</a>` : ""}
            ${status === "PENDING" && applicationId ? `<button type="button" class="mypage-api-button danger" data-cancel-application="${escapeHtml(applicationId)}">신청 취소</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("\n\n");

  bindApplicationCancelButtons();
}

function bindApplicationCancelButtons() {
  document.querySelectorAll("[data-cancel-application]").forEach((button) => {
    button.onclick = async function () {
      const applicationId = button.dataset.cancelApplication;
      if (!applicationId) return;

      if (!confirm("이 지원 신청을 취소할까요?")) return;

      button.disabled = true;

      try {
        await apiRequest(`/api/applications/${applicationId}`, {
          method: "DELETE",
        });

        const card = button.closest("[data-application-id]");
        const clubId = card?.dataset.applicationClubId || "";
        updateLocalApplicationStatus(applicationId, "CANCELLED", clubId);

        alert("지원 신청이 취소되었습니다.");
        await loadMyApplications();
        renderApplications();
        renderActivity();
      } catch (error) {
        console.error(error);
        alert(error.message || "지원 신청 취소에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    };
  });
}

function renderMyPosts() {
  const summary = document.querySelector("#myPostsSummary");
  const list = document.querySelector("#myPostsList");
  if (!summary || !list) return;

  const posts = mypageState.posts || [];

  if (posts.length === 0) {
    summary.textContent = "아직 작성한 게시물이 없습니다.";
    list.innerHTML = `
      <div class="mypage-api-empty">
        작성한 게시물이 없습니다.<br />동아리 게시판에서 게시물을 작성할 수 있습니다.
      </div>
    `;
    return;
  }

  summary.textContent = `총 ${mypageState.postsTotal || posts.length}개의 게시물을 작성했습니다.`;
  list.innerHTML = posts
    .map((post) => {
      const postId = getPostId(post);
      const clubId = getPostClubId(post);
      const clubName = post.clubName || post.club?.name || "동아리";
      const title = post.title || "제목 없음";
      const createdAt = post.createdAt || post.updatedAt || "";
      const viewCount = post.viewCount ?? post.views ?? 0;

      return `
        <article class="mypage-api-card my-post-card" data-post-id="${escapeHtml(postId)}">
          <div class="mypage-api-card-head">
            <div>
              <span class="mypage-post-category">${getPostCategoryLabel(post.category)}</span>
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(clubName)} · ${escapeHtml(formatDate(createdAt))}</p>
            </div>
            <div class="mypage-post-view">
              <span>조회수</span>
              <strong>${viewCount}</strong>
            </div>
          </div>
          <div class="mypage-api-actions">
            ${clubId && postId ? `<a href="./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=board&postId=${encodeURIComponent(postId)}" class="mypage-api-link">게시물 보기</a>` : `<a href="./club-list.html" class="mypage-api-link">게시판 보기</a>`}
          </div>
        </article>
      `;
    })
    .join("\n\n");
}

function renderOperatorRecentPosts() {
  const list = document.querySelector("#operatorRecentPostList");
  updateOperatorBoardLinks();
  if (!list) return;

  const posts = mypageState.operatorRecentPosts || [];

  if (!isOperatorUser()) {
    list.innerHTML = `<div class="mypage-empty-line">운영진 권한이 있어야 게시물을 확인할 수 있습니다.</div>`;
    return;
  }

  if (posts.length === 0) {
    list.innerHTML = `<div class="mypage-empty-line">운영 동아리 게시물이 없습니다.</div>`;
    return;
  }

  list.innerHTML = posts
    .slice(0, 5)
    .map((post) => {
      const clubId = getPostClubId(post) || post.__clubId || "";
      const postId = getPostId(post);
      const title = post.title || "제목 없음";
      const date = formatDate(post.createdAt || post.updatedAt);

      return `
        <article data-operator-post-link="${escapeHtml(clubId)}" data-post-id="${escapeHtml(postId)}" tabindex="0" role="link">
          <span>${getPostCategoryLabel(post.category)}</span>
          <strong>${escapeHtml(title)}</strong>
          <em>${escapeHtml(date)}</em>
        </article>
      `;
    })
    .join("\n\n");

  document.querySelectorAll("[data-operator-post-link]").forEach((item) => {
    item.onclick = function () {
      const clubId = item.dataset.operatorPostLink;
      const postId = item.dataset.postId;
      const query = clubId ? `?clubId=${encodeURIComponent(clubId)}&tab=board${postId ? `&postId=${encodeURIComponent(postId)}` : ""}` : "";
      window.location.href = `./club-detail.html${query}`;
    };

    item.onkeydown = function (event) {
      if (event.key === "Enter") item.click();
    };
  });
}


function getPrimaryOperatorClubForLink() {
  if (Array.isArray(mypageState.operatorClubs) && mypageState.operatorClubs.length > 0) {
    return mypageState.operatorClubs[0];
  }

  const fallbackClub = typeof getOperatorFallbackClub === "function" ? getOperatorFallbackClub() : null;
  if (fallbackClub) return fallbackClub;

  if (Array.isArray(mypageState.joinedClubs) && mypageState.joinedClubs.length > 0) {
    return mypageState.joinedClubs[0];
  }

  return null;
}

function updateOperatorBoardLinks() {
  const writeButton = document.querySelector("#operatorWritePostBtn");
  const boardButton = document.querySelector("#operatorBoardViewBtn");
  const club = getPrimaryOperatorClubForLink();
  const clubId = club?.clubId || club?.id || "";

  if (writeButton) {
    writeButton.textContent = "글쓰기";
    writeButton.setAttribute("aria-label", "운영 동아리 게시글 작성");
    writeButton.href = clubId
      ? `./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=board&mode=write`
      : "./club-list.html";

    writeButton.onclick = function (event) {
      if (clubId) return;
      event.preventDefault();
      alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    };
  }

  if (boardButton) {
    boardButton.href = clubId
      ? `./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=board`
      : "./club-list.html";
  }
}

function getOperatorManagedPosts() {
  const club = getPrimaryOperatorClubForLink();
  const clubId = String(club?.clubId || club?.id || "");

  return (mypageState.operatorRecentPosts || [])
    .filter((post) => {
      const postClubId = String(getPostClubId(post) || post.__clubId || "");
      return !clubId || postClubId === clubId;
    })
    .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")));
}

function updateOperatorBoardManageLinks() {
  const club = getPrimaryOperatorClubForLink();
  const clubId = club?.clubId || club?.id || "";
  const clubName = club?.name || "운영 동아리";
  const clubNameTarget = document.querySelector("#operatorBoardManageClubName");
  const writeButton = document.querySelector("#operatorBoardManageWriteBtn");
  const openButton = document.querySelector("#operatorBoardManageOpenBtn");

  if (clubNameTarget) clubNameTarget.textContent = `${clubName} 게시글`;

  [writeButton, openButton].forEach((button) => {
    if (!button) return;
    button.href = clubId
      ? `./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=board${button === writeButton ? "&mode=write" : ""}`
      : "./club-list.html";
    button.onclick = function (event) {
      if (clubId) return;
      event.preventDefault();
      alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    };
  });
}

function removeOperatorPostFromLocalCaches(clubId, postId) {
  const targets = [
    "clubBoardPosts",
    `clubBoardPosts_${clubId}`,
    scopedMyPageStorageKey("mypageMyPosts"),
    scopedMyPageStorageKey("myCreatedBoardPosts"),
  ];

  targets.forEach((key) => {
    const list = safeJsonParse(localStorage.getItem(key), []);
    if (!Array.isArray(list)) return;

    const next = list.filter((post) => {
      const sameClub = String(getPostClubId(post) || post.clubId || "") === String(clubId);
      const samePost = String(getPostId(post) || post.postId || post.id || "") === String(postId);
      return !(sameClub && samePost);
    });

    localStorage.setItem(key, JSON.stringify(next));
  });

  const lastPost = getScopedMyPageItem("lastCreatedBoardPost", null);
  if (lastPost) {
    const sameClub = String(getPostClubId(lastPost) || lastPost.clubId || "") === String(clubId);
    const samePost = String(getPostId(lastPost) || lastPost.postId || lastPost.id || "") === String(postId);
    if (sameClub && samePost) {
      localStorage.removeItem(scopedMyPageStorageKey("lastCreatedBoardPost"));
    }
  }

  const createdIds = getScopedMyPageList("myCreatedBoardPostIds");
  if (Array.isArray(createdIds)) {
    const nextIds = createdIds.filter((item) => {
      return !(String(item.clubId || "") === String(clubId) && String(item.postId || "") === String(postId));
    });
    localStorage.setItem(scopedMyPageStorageKey("myCreatedBoardPostIds"), JSON.stringify(nextIds));
  }

  sessionStorage.setItem("mypagePostsDirty", "true");
}

async function deleteOperatorManagedPost(clubId, postId) {
  if (!clubId || !postId) {
    alert("삭제할 게시글 정보를 찾을 수 없습니다.");
    return;
  }

  const ok = confirm("이 게시글을 삭제할까요?");
  if (!ok) return;

  try {
    await apiRequest(`/api/clubs/${clubId}/posts/${postId}`, {
      method: "DELETE",
    });

    removeOperatorPostFromLocalCaches(clubId, postId);
    mypageState.operatorRecentPosts = (mypageState.operatorRecentPosts || []).filter((post) => {
      const sameClub = String(getPostClubId(post) || post.__clubId || "") === String(clubId);
      const samePost = String(getPostId(post) || "") === String(postId);
      return !(sameClub && samePost);
    });

    await loadOperatorRecentPosts();
    renderOperatorRecentPosts();
    renderOperatorBoardManagement();
    alert("게시글이 삭제되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "게시글 삭제에 실패했습니다.");
  }
}

function renderOperatorBoardManagement() {
  const summary = document.querySelector("#operatorBoardManageSummary");
  const list = document.querySelector("#operatorBoardManageList");
  if (!summary || !list) return;

  updateOperatorBoardManageLinks();

  if (!isOperatorUser()) {
    summary.textContent = "운영진 권한이 있어야 게시판을 관리할 수 있습니다.";
    list.innerHTML = `<div class="mypage-empty-line">운영진 권한이 없습니다.</div>`;
    return;
  }

  const club = getPrimaryOperatorClubForLink();
  const posts = getOperatorManagedPosts();

  if (!club) {
    summary.textContent = "운영 중인 동아리 정보를 찾을 수 없습니다.";
    list.innerHTML = `<div class="mypage-empty-line">운영 중인 동아리 정보를 찾을 수 없습니다.</div>`;
    return;
  }

  if (posts.length === 0) {
    summary.textContent = `${club.name || "운영 동아리"} 게시글이 없습니다.`;
    list.innerHTML = `<div class="mypage-empty-line">등록된 게시글이 없습니다.</div>`;
    return;
  }

  summary.textContent = `${club.name || "운영 동아리"} 게시글 ${posts.length}개를 관리할 수 있습니다.`;
  list.innerHTML = posts
    .map((post) => {
      const clubId = String(getPostClubId(post) || post.__clubId || club.clubId || club.id || "");
      const postId = String(getPostId(post) || "");
      const title = post.title || "제목 없음";
      const author = post.authorName || post.writerName || post.memberName || post.author || "작성자";
      const date = formatDate(post.createdAt || post.updatedAt || "");
      const viewCount = post.viewCount ?? post.views ?? 0;

      return `
        <article class="operator-board-manage-item" data-managed-club-id="${escapeHtml(clubId)}" data-managed-post-id="${escapeHtml(postId)}">
          <div class="operator-board-manage-main">
            <span>${getPostCategoryLabel(post.category)}</span>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(author)} · ${escapeHtml(date)} · 조회수 ${escapeHtml(viewCount)}</p>
          </div>
          <div class="operator-board-manage-actions">
            <a href="./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=board&postId=${encodeURIComponent(postId)}">보기</a>
            <button type="button" data-delete-managed-post="${escapeHtml(postId)}">삭제</button>
          </div>
        </article>
      `;
    })
    .join("\n\n");

  document.querySelectorAll("[data-delete-managed-post]").forEach((button) => {
    button.onclick = function () {
      const item = button.closest("[data-managed-post-id]");
      const clubId = item?.dataset.managedClubId || "";
      const postId = item?.dataset.managedPostId || button.dataset.deleteManagedPost || "";
      deleteOperatorManagedPost(clubId, postId);
    };
  });
}

function getCurrentApplicationUserIdentity() {
  const user = getDisplayUser() || {};
  return {
    userId: String(user.userId || user.userid || user.id || ""),
    email: String(user.email || "").trim().toLowerCase(),
    studentId: String(user.studentId || user.studentid || "").trim(),
    name: String(user.name || "").trim(),
    ownerKey: getMyPageUserStorageKey(),
  };
}

function getApplicationCache() {
  return safeJsonParse(localStorage.getItem("clubApplicationCache"), []) || [];
}

function saveApplicationCache(applications) {
  localStorage.setItem("clubApplicationCache", JSON.stringify(applications || []));
}

function getApplicationPersonKey(application = {}) {
  const email = String(application.email || application.memberEmail || application.applicantEmail || application.userEmail || "").trim().toLowerCase();
  const studentId = String(application.studentId || application.studentid || application.memberStudentId || application.applicantStudentId || "").trim();
  const userId = String(application.userId || application.userid || application.memberId || application.applicantId || application.ownerUserId || "").trim();
  const name = String(application.studentName || application.memberName || application.userName || application.name || application.applicantName || "").trim();

  if (email) return `email:${email}`;
  if (studentId) return `student:${studentId}`;
  if (userId) return `user:${userId}`;
  if (name) return `name:${name}`;
  return "";
}

function getApplicationMergeKey(application = {}, index = 0) {
  const clubId = String(getApplicationClubId(application) || "");
  const personKey = getApplicationPersonKey(application);
  const status = String(application.status || "PENDING").toUpperCase();
  const date = formatDate(application.createdAt || application.appliedAt || application.createdDate || "");
  const applicationId = String(getApplicationId(application) || "");

  // 백엔드가 applicationId를 내려주고 로컬 캐시는 local-* ID를 가질 때가 있어서,
  // 같은 동아리/같은 사람/같은 상태/같은 날짜면 같은 지원 내역으로 묶는다.
  if (clubId && (personKey || date)) return `fingerprint:${clubId}|${personKey || "unknown"}|${status}|${date || "no-date"}`;
  if (applicationId) return `id:${applicationId}`;
  return `index:${index}`;
}

function isApplicationForCurrentUser(application = {}) {
  const current = getCurrentApplicationUserIdentity();
  const appEmail = String(application.email || application.memberEmail || application.applicantEmail || application.userEmail || "").trim().toLowerCase();
  const appStudentId = String(application.studentId || application.studentid || application.memberStudentId || application.applicantStudentId || "").trim();
  const appUserId = String(application.userId || application.userid || application.memberId || application.applicantId || application.ownerUserId || "").trim();
  const appOwnerKey = String(application.ownerKey || application.owner || "").trim().toLowerCase();

  if (current.email && appEmail) return current.email === appEmail;
  if (current.studentId && appStudentId) return current.studentId === appStudentId;
  if (current.userId && appUserId) return current.userId === appUserId;
  if (current.ownerKey && appOwnerKey) return current.ownerKey === appOwnerKey;

  // 예전에 저장된 로컬 데이터에 식별값이 없으면 현재 브라우저의 지원 내역으로 간주한다.
  return !appEmail && !appStudentId && !appUserId && !appOwnerKey;
}

function getApplicationCacheForMyPage() {
  return getApplicationCache().filter(isApplicationForCurrentUser);
}

function getAnswerTextFromApplication(application = {}) {
  const answers = Array.isArray(application.answers) ? application.answers : [];
  return answers
    .map((answer) => {
      const label = answer.label || answer.questionTitle || answer.question || `문항 ${answer.questionId || ""}`.trim();
      const value = Array.isArray(answer.values) ? answer.values.join(", ") : answer.value || answer.answer || "";
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function normalizeMyApplication(application) {
  const answerText = getAnswerTextFromApplication(application);

  return {
    ...application,
    applicationId: getApplicationId(application),
    clubId: getApplicationClubId(application),
    clubName: getApplicationClubName(application),
    status: String(application.status || "PENDING").toUpperCase(),
    content: application.content || application.answer || application.answersText || answerText || "",
    createdAt: application.createdAt || application.appliedAt || application.createdDate || "",
  };
}

function mergeApplicationRecords(previous = {}, next = {}) {
  const previousContent = previous.content || previous.answer || previous.answersText || getAnswerTextFromApplication(previous);
  const nextContent = next.content || next.answer || next.answersText || getAnswerTextFromApplication(next);

  return {
    ...previous,
    ...next,
    content: nextContent || previousContent || "",
    answers: Array.isArray(next.answers) && next.answers.length ? next.answers : previous.answers,
    clubId: getApplicationClubId(next) || getApplicationClubId(previous),
    clubName: getApplicationClubName(next) || getApplicationClubName(previous),
    applicationId: getApplicationId(next) || getApplicationId(previous),
  };
}

function mergeApplicationsForMyPage(apiApplications = [], localApplications = []) {
  const map = new Map();

  localApplications.map(normalizeMyApplication).forEach((item, index) => {
    const key = getApplicationMergeKey(item, index);
    map.set(key, item);
  });

  apiApplications.map(normalizeMyApplication).filter(isApplicationForCurrentUser).forEach((item, index) => {
    const key = getApplicationMergeKey(item, index);
    const previous = map.get(key) || {};
    map.set(key, mergeApplicationRecords(previous, item));
  });

  const sorted = Array.from(map.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const latestByClub = new Map();

  sorted.forEach((item, index) => {
    const clubId = String(getApplicationClubId(item) || "");
    const key = clubId || `application-${index}`;
    if (!latestByClub.has(key)) latestByClub.set(key, item);
  });

  return Array.from(latestByClub.values());
}

function updateLocalApplicationStatus(applicationId, nextStatus, clubId = "") {
  const current = getCurrentApplicationUserIdentity();
  const applications = getApplicationCache().map((item) => {
    const sameId = applicationId && String(getApplicationId(item)) === String(applicationId);
    const sameClubAndUser =
      clubId &&
      String(getApplicationClubId(item)) === String(clubId) &&
      isApplicationForCurrentUser(item) &&
      String(item.status || "PENDING").toUpperCase() === "PENDING";

    if (sameId || sameClubAndUser) {
      return {
        ...item,
        status: nextStatus,
        ownerKey: item.ownerKey || current.ownerKey,
        ownerEmail: item.ownerEmail || current.email,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  saveApplicationCache(applications);
}

function updateLocalOperatorApplicationStatus(applicationId, nextStatus, clubId = "", personKey = "") {
  const applications = getApplicationCache().map((item) => {
    const sameId = applicationId && String(getApplicationId(item)) === String(applicationId);
    const sameClubAndPerson =
      clubId &&
      personKey &&
      String(getApplicationClubId(item)) === String(clubId) &&
      getApplicationPersonKey(item) === personKey &&
      String(item.status || "PENDING").toUpperCase() === "PENDING";

    if (sameId || sameClubAndPerson) {
      return {
        ...item,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
  saveApplicationCache(applications);
}

async function loadMyApplications() {
  const localApplications = getApplicationCacheForMyPage();
  let apiApplications = [];

  try {
    const appResult = await apiRequest("/api/users/me/applications");
    apiApplications = getPagedContent(appResult);
  } catch (error) {
    console.warn("내 지원 내역 API 조회 실패, 로컬 제출 내역으로 대체:", error);
  }

  mypageState.applications = mergeApplicationsForMyPage(apiApplications, localApplications);
  const target = mypageState.activity.find((item) => item.key === "applications");
  if (target) target.count = mypageState.applications.length;
}

function normalizeOperatorApplication(application, fallbackClub = {}) {
  const answerText = getAnswerTextFromApplication(application);
  const clubId = String(getApplicationClubId(application) || fallbackClub.clubId || fallbackClub.id || "");
  const clubName = getApplicationClubName(application) || fallbackClub.name || "운영 동아리";

  return {
    ...application,
    applicationId: getApplicationId(application),
    clubId,
    clubName,
    studentName: application.studentName || application.memberName || application.userName || application.name || application.applicantName || "이름 없음",
    studentId: application.studentId || application.studentid || application.memberStudentId || application.applicantStudentId || "-",
    department: application.department || application.memberDepartment || application.applicantDepartment || "-",
    email: application.email || application.memberEmail || application.applicantEmail || "-",
    status: String(application.status || "PENDING").toUpperCase(),
    content: application.content || application.answer || application.answersText || answerText || "",
    createdAt: application.createdAt || application.appliedAt || application.createdDate || "",
  };
}

function mergeOperatorApplications(applications = []) {
  const map = new Map();

  applications.map(normalizeOperatorApplication).forEach((item, index) => {
    const key = getApplicationMergeKey(item, index);
    const previous = map.get(key) || {};
    map.set(key, mergeApplicationRecords(previous, item));
  });

  return Array.from(map.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function getLocalApplicationsForOperatorClub(club, status = "") {
  const clubId = String(club?.clubId || club?.id || "");
  return getApplicationCache()
    .filter((item) => String(getApplicationClubId(item)) === clubId)
    .filter((item) => (status ? String(item.status || "PENDING").toUpperCase() === status : true))
    .map((item) => normalizeOperatorApplication(item, club));
}

async function fetchOperatorApplicationsForClub(club) {
  const clubId = String(club?.clubId || club?.id || "");
  if (!clubId) return [];

  const statuses = ["PENDING", "APPROVED", "REJECTED"];
  const results = await Promise.allSettled(
    statuses.map(async (status) => {
      const result = await apiRequest(`/api/clubs/${clubId}/applications?status=${encodeURIComponent(status)}`);
      return getPagedContent(result).map((item) => normalizeOperatorApplication({ ...item, status: item.status || status }, club));
    })
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

async function loadOperatorApplicants() {
  if (!isOperatorUser()) {
    mypageState.operatorApplicants = [];
    return;
  }

  const club = getPrimaryOperatorClubForLink();
  if (!club) {
    mypageState.operatorApplicants = [];
    return;
  }

  let apiApplications = [];
  try {
    apiApplications = await fetchOperatorApplicationsForClub(club);
  } catch (error) {
    console.warn("운영 동아리 지원자 API 조회 실패, 로컬 지원 내역으로 대체:", error);
  }

  const localApplications = getLocalApplicationsForOperatorClub(club);
  mypageState.operatorApplicants = mergeOperatorApplications([...localApplications, ...apiApplications]);
}

function renderOperatorApplicantStats() {
  const applicants = mypageState.operatorApplicants || [];
  const pendingCount = applicants.filter((item) => String(item.status || "PENDING").toUpperCase() === "PENDING").length;
  const approvedCount = applicants.filter((item) => String(item.status || "").toUpperCase() === "APPROVED").length;
  const rejectedCount = applicants.filter((item) => String(item.status || "").toUpperCase() === "REJECTED").length;

  const totalTarget = document.querySelector("#operatorTotalApplicantCount");
  const pendingTarget = document.querySelector("#operatorPendingApplicantCount");
  const approvedTarget = document.querySelector("#operatorApprovedApplicantCount");
  const rejectedTarget = document.querySelector("#operatorRejectedApplicantCount");

  if (totalTarget) totalTarget.textContent = `${applicants.length}명`;
  if (pendingTarget) pendingTarget.textContent = `${pendingCount}명`;
  if (approvedTarget) approvedTarget.textContent = `${approvedCount}명`;
  if (rejectedTarget) rejectedTarget.textContent = `${rejectedCount}명`;
}

function renderOperatorApplicantPreview() {
  const list = document.querySelector("#operatorApplicantPreviewList");
  if (!list) return;

  if (!isOperatorUser()) {
    list.innerHTML = `<tr><td colspan="4">운영진 권한이 있어야 지원자를 확인할 수 있습니다.</td></tr>`;
    return;
  }

  const applicants = (mypageState.operatorApplicants || []).slice(0, 4);

  if (applicants.length === 0) {
    list.innerHTML = `<tr><td colspan="4">조회된 지원자가 없습니다.</td></tr>`;
    return;
  }

  list.innerHTML = applicants
    .map((application) => {
      const status = String(application.status || "PENDING").toUpperCase();
      return `
        <tr data-tab-button="operator-applications">
          <td>${escapeHtml(application.studentName || "이름 없음")}</td>
          <td>${escapeHtml(application.department || "-")}</td>
          <td>${escapeHtml(formatDate(application.createdAt))}</td>
          <td><span class="operator-api-status ${getApplicationStatusClass(status)}">${getApplicationStatusLabel(status)}</span></td>
        </tr>
      `;
    })
    .join("\n");

  list.querySelectorAll("[data-tab-button]").forEach((row) => {
    row.onclick = () => setActiveTab("operator-applications");
  });
}

function getFilteredOperatorApplicants() {
  const status = mypageState.operatorApplicantStatusFilter;
  return (mypageState.operatorApplicants || []).filter((item) => {
    return status ? String(item.status || "PENDING").toUpperCase() === status : true;
  });
}

function renderOperatorApplicationManagement() {
  const summary = document.querySelector("#operatorApplicationsSummary");
  const list = document.querySelector("#operatorApplicationsManageList");
  if (!summary || !list) return;

  if (!isOperatorUser()) {
    summary.textContent = "운영진 권한이 있어야 지원자를 관리할 수 있습니다.";
    list.innerHTML = `<div class="mypage-empty-line">운영진 권한이 없습니다.</div>`;
    return;
  }

  const club = getPrimaryOperatorClubForLink();
  const applicants = getFilteredOperatorApplicants();

  if (!club) {
    summary.textContent = "운영 중인 동아리 정보를 찾을 수 없습니다.";
    list.innerHTML = `<div class="mypage-empty-line">운영 중인 동아리 정보를 찾을 수 없습니다.</div>`;
    return;
  }

  document.querySelectorAll("[data-operator-application-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.operatorApplicationFilter === mypageState.operatorApplicantStatusFilter);
  });

  if (applicants.length === 0) {
    summary.textContent = `${club.name || "운영 동아리"} 지원자가 없습니다.`;
    list.innerHTML = `<div class="mypage-empty-line">조회된 지원자가 없습니다.</div>`;
    return;
  }

  summary.textContent = `${club.name || "운영 동아리"} 지원자 ${applicants.length}명을 확인할 수 있습니다.`;
  list.innerHTML = applicants
    .map((application) => {
      const applicationId = getApplicationId(application);
      const status = String(application.status || "PENDING").toUpperCase();
      const isLocalOnly = String(applicationId).startsWith("local-");
      const content = application.content || "백엔드 응답에 지원서 답변이 없어 기본 정보만 표시됩니다.";

      return `
        <article class="application-api-card operator-inline-application-card" data-operator-application-id="${escapeHtml(applicationId)}" data-operator-application-club-id="${escapeHtml(application.clubId || club.clubId || club.id || "")}" data-operator-application-person-key="${escapeHtml(getApplicationPersonKey(application))}">
          <div class="application-api-head">
            <div>
              <h3>${escapeHtml(application.studentName || "이름 없음")}</h3>
              <p>${escapeHtml(application.studentId || "-")} · ${escapeHtml(application.department || "-")}</p>
            </div>
            <span class="operator-api-status ${getApplicationStatusClass(status)}">${getApplicationStatusLabel(status)}</span>
          </div>

          <div class="application-api-info">
            <p><strong>이메일</strong> ${escapeHtml(application.email || "-")}</p>
            <p><strong>지원일</strong> ${escapeHtml(formatDate(application.createdAt))}</p>
            ${isLocalOnly ? `<p><strong>표시</strong> 이 브라우저에서 제출된 로컬 지원 내역입니다.</p>` : ""}
          </div>

          <div class="application-api-content">
            <strong>지원 내용</strong>
            <p>${escapeHtml(content).replaceAll("\n", "<br />")}</p>
          </div>

          ${status === "PENDING" && applicationId ? `
            <div class="application-api-actions">
              <button type="button" class="operator-api-btn approve" data-operator-application-action="APPROVED">승인</button>
              <button type="button" class="operator-api-btn reject" data-operator-application-action="REJECTED">거절</button>
            </div>
          ` : ""}
        </article>
      `;
    })
    .join("\n");

  bindOperatorApplicationActionButtons();
}

function bindOperatorApplicationActionButtons() {
  document.querySelectorAll("[data-operator-application-action]").forEach((button) => {
    button.onclick = async function () {
      const card = button.closest("[data-operator-application-id]");
      const applicationId = card?.dataset.operatorApplicationId || "";
      const clubId = card?.dataset.operatorApplicationClubId || "";
      const personKey = card?.dataset.operatorApplicationPersonKey || "";
      const nextStatus = button.dataset.operatorApplicationAction;
      if (!applicationId || !nextStatus) return;

      const message = nextStatus === "APPROVED" ? "이 지원자를 승인할까요?" : "이 지원자를 거절할까요?";
      if (!confirm(message)) return;

      button.disabled = true;
      try {
        if (!String(applicationId).startsWith("local-")) {
          await apiRequest(`/api/applications/${applicationId}/status`, {
            method: "PATCH",
            body: { status: nextStatus },
          });
        }

        updateLocalOperatorApplicationStatus(applicationId, nextStatus, clubId, personKey);
        await loadOperatorApplicants();
        renderOperatorApplicantStats();
        renderOperatorApplicantPreview();
        renderOperatorApplicationManagement();
        alert(nextStatus === "APPROVED" ? "승인 처리되었습니다." : "거절 처리되었습니다.");
      } catch (error) {
        console.error(error);
        alert(error.message || "처리에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    };
  });
}

async function fetchMyPostsByCategoryFallback() {
  const categories = ["NOTICE", "RESOURCE", "QUESTION"];
  const results = await Promise.allSettled(
    categories.map((category) =>
      apiRequest(`/api/users/me/posts?category=${category}&page=0&size=20`)
    )
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => getPagedContent(result.value));
}

async function fetchAllClubPostsForMyPage() {
  let clubs = [];
  try {
    const clubResult = await apiRequest("/api/clubs");
    clubs = getPagedContent(clubResult).map(normalizeApiClub);
  } catch (error) {
    console.warn("전체 동아리 게시물 확인용 동아리 목록 조회 실패:", error);
    return [];
  }

  const createdIds = getScopedMyPageList("myCreatedBoardPostIds");
  const createdKeySet = new Set(createdIds.map((item) => `${String(item.clubId)}-${String(item.postId)}`));

  const results = await Promise.allSettled(
    clubs.map(async (club) => {
      const clubId = club.clubId || club.id;
      if (!clubId) return [];
      const result = await apiRequest(`/api/clubs/${clubId}/posts?page=0&size=100`);
      return getPagedContent(result).map((post) => normalizeBoardPostFromClub(post, club));
    })
  );

  const posts = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  return posts.filter((post) => {
    const key = `${String(getPostClubId(post))}-${String(getPostId(post))}`;
    return isProbablyMyApiPost(post) || createdKeySet.has(key);
  });
}

async function loadMyPosts() {
  const localPosts = getLocalMyPosts();
  let apiPosts = [];
  let postResult = null;

  try {
    postResult = await apiRequest("/api/users/me/posts?page=0&size=100");
    apiPosts = removeDefaultBoardSeedPosts(getPagedContent(postResult));

    if (apiPosts.length === 0) {
      apiPosts = removeDefaultBoardSeedPosts(await fetchMyPostsByCategoryFallback());
    }
  } catch (error) {
    console.warn("내 게시물 API 조회 실패, 카테고리별 조회로 대체:", error);
    apiPosts = await fetchMyPostsByCategoryFallback().catch(() => []);
  }

  if (apiPosts.length === 0) {
    const clubPosts = await fetchPostsFromMyClubs().catch(() => []);
    const myClubPosts = clubPosts.filter(isProbablyMyApiPost);

    if (myClubPosts.length > 0) {
      apiPosts = myClubPosts;
    }
  }

  if (apiPosts.length === 0) {
    const allClubPosts = await fetchAllClubPostsForMyPage().catch(() => []);
    if (allClubPosts.length > 0) {
      apiPosts = allClubPosts;
    }
  }

  mypageState.posts = mergePostLists(apiPosts, localPosts);
  mypageState.postsTotal = Math.max(
    getPagedTotal(postResult, apiPosts.length),
    mypageState.posts.length
  );

  const target = mypageState.activity.find((item) => item.key === "posts");
  if (target) target.count = mypageState.postsTotal || mypageState.posts.length;
}

async function loadOperatorRecentPosts() {
  if (!isOperatorUser()) {
    mypageState.operatorRecentPosts = [];
    return;
  }

  const clubs = mypageState.operatorClubs.length > 0
    ? mypageState.operatorClubs
    : mypageState.joinedClubs.slice(0, 1);

  if (clubs.length === 0) {
    mypageState.operatorRecentPosts = [];
    return;
  }

  try {
    const postGroups = await Promise.all(
      clubs.slice(0, 3).map(async (club) => {
        try {
          const result = await apiRequest(`/api/clubs/${club.clubId}/posts?page=0&size=100`);
          const apiPosts = getPagedContent(result).map((post) => ({
            ...post,
            __clubId: club.clubId,
            clubId: getPostClubId(post) || club.clubId,
            clubName: post.clubName || club.name,
          }));
          const localPosts = getLocalPostsByClubId(club.clubId).map((post) => ({
            ...post,
            __clubId: club.clubId,
            clubId: getPostClubId(post) || club.clubId,
            clubName: post.clubName || club.name,
          }));

          return mergePostLists(apiPosts, localPosts);
        } catch (error) {
          console.warn(`${club.name} 게시물 조회 실패, 로컬 게시판 작성 내역으로 대체:`, error);
          return getLocalPostsByClubId(club.clubId).map((post) => ({
            ...post,
            __clubId: club.clubId,
            clubId: getPostClubId(post) || club.clubId,
            clubName: post.clubName || club.name,
          }));
        }
      })
    );

    mypageState.operatorRecentPosts = postGroups
      .flat()
      .sort((a, b) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")));
  } catch (error) {
    console.warn("운영 동아리 게시물 조회 실패:", error);
    mypageState.operatorRecentPosts = [];
  }
}


/* =========================================================
   운영진 활동 관리
   - 백엔드 권한이 막혀도 로컬 저장으로 화면 시연 가능
   - 상세 페이지 활동 탭과 같은 구성: 주요 활동 / 연간 활동 / 활동 사진 / 부원 후기
========================================================= */
const operatorActivityState = {
  localData: null,
  loadedClubId: "",
};

function getOperatorActivityRequestedClubId() {
  return new URLSearchParams(window.location.search).get("clubId") || "";
}

function getOperatorActivityClub() {
  const requestedClubId = getOperatorActivityRequestedClubId();
  const clubs = [
    ...(Array.isArray(mypageState.operatorClubs) ? mypageState.operatorClubs : []),
    ...(Array.isArray(mypageState.joinedClubs) ? mypageState.joinedClubs : []),
  ];

  if (requestedClubId) {
    const matched = clubs.find((club) => String(club.clubId || club.id || "") === String(requestedClubId));
    if (matched) return matched;
    return { clubId: requestedClubId, id: requestedClubId, name: "운영 동아리" };
  }

  return getPrimaryOperatorClubForLink();
}

function getOperatorActivityClubId() {
  const club = getOperatorActivityClub();
  return String(club?.clubId || club?.id || "");
}

function getOperatorActivityStorageKey(clubId = getOperatorActivityClubId()) {
  return `operatorActivityData_${String(clubId || "unknown")}`;
}

function getEmptyOperatorActivityData() {
  return {
    major: "",
    annual: "",
    photos: [],
    reviews: [],
    updatedAt: "",
  };
}

function getOperatorActivityLocalData(clubId = getOperatorActivityClubId()) {
  const parsed = safeJsonParse(localStorage.getItem(getOperatorActivityStorageKey(clubId))) || {};
  return {
    ...getEmptyOperatorActivityData(),
    ...parsed,
    photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
  };
}

function saveOperatorActivityLocalData(data, clubId = getOperatorActivityClubId()) {
  const next = {
    ...getEmptyOperatorActivityData(),
    ...(data || {}),
    photos: Array.isArray(data?.photos) ? data.photos : [],
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(getOperatorActivityStorageKey(clubId), JSON.stringify(next));
  operatorActivityState.localData = next;
  return next;
}

function parseOperatorActivityInfoForForm(value) {
  const text = String(value || "").trim();
  const result = { major: [], annual: [] };
  if (!text) return result;

  let mode = "major";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const normalized = line.replaceAll(" ", "");
    if (/^\[?주요활동\]?$/.test(normalized)) {
      mode = "major";
      return;
    }
    if (/^\[?연간활동\]?$/.test(normalized) || /^\[?연간활동정보\]?$/.test(normalized)) {
      mode = "annual";
      return;
    }

    if (mode === "annual") {
      result.annual.push(line);
    } else {
      result.major.push(line.replace(/^[-•]\s*/, ""));
    }
  });

  return result;
}

function buildOperatorActivityInfoText() {
  const major = document.querySelector("#operatorMajorActivitiesInput")?.value.trim() || "";
  const annual = document.querySelector("#operatorAnnualActivitiesInput")?.value.trim() || "";
  const blocks = [];

  if (major) blocks.push(`[주요 활동]\n${major}`);
  if (annual) blocks.push(`[연간 활동]\n${annual}`);

  return blocks.join("\n\n");
}

function createOperatorActivityId(prefix = "activity") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function renderOperatorActivityHeader(club) {
  const clubId = String(club?.clubId || club?.id || "");
  const clubName = club?.name || "운영 동아리";
  const title = document.querySelector("#operatorActivityClubName");
  const detailLink = document.querySelector("#operatorActivityOpenDetailBtn");

  if (title) title.textContent = `${clubName} 활동 정보`;
  if (detailLink) {
    detailLink.href = clubId
      ? `./club-detail.html?clubId=${encodeURIComponent(clubId)}&tab=activity`
      : "./club-list.html";
    detailLink.onclick = function (event) {
      if (clubId) return;
      event.preventDefault();
      alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    };
  }
}

function renderOperatorActivityPhotos() {
  const grid = document.querySelector("#operatorActivityPhotoGrid");
  if (!grid) return;

  const photos = operatorActivityState.localData?.photos || [];
  if (!photos.length) {
    grid.innerHTML = `<div class="mypage-empty-line">등록된 활동 사진이 없습니다.</div>`;
    return;
  }

  grid.innerHTML = photos
    .map((photo) => {
      return `
        <article class="operator-activity-photo-item" data-photo-id="${escapeHtml(photo.id)}">
          <button type="button" class="operator-activity-photo-view" data-view-activity-photo="${escapeHtml(photo.id)}" aria-label="활동 사진 설명 보기">
            <img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title || "활동 사진")}" />
          </button>
          <button type="button" class="operator-activity-photo-title" data-view-activity-photo="${escapeHtml(photo.id)}">${escapeHtml(photo.title || "활동 사진")}</button>
          <p>${escapeHtml(photo.description || "").slice(0, 80)}</p>
          <span>${escapeHtml(formatDate(photo.createdAt || ""))}</span>
          <button type="button" class="danger" data-delete-activity-photo="${escapeHtml(photo.id)}">사진 삭제</button>
        </article>
      `;
    })
    .join("\n");
}

function renderOperatorActivityReviews() {
  const list = document.querySelector("#operatorActivityReviewList");
  if (!list) return;

  const reviews = operatorActivityState.localData?.reviews || [];
  if (!reviews.length) {
    list.innerHTML = `<div class="mypage-empty-line">등록된 부원 후기가 없습니다.</div>`;
    return;
  }

  list.innerHTML = reviews
    .map((review) => {
      return `
        <article class="operator-activity-review-item" data-review-id="${escapeHtml(review.id)}">
          <div>
            <strong>${escapeHtml(review.author || "부원")}</strong>
            <p>${escapeHtml(review.content || "")}</p>
          </div>
          <button type="button" class="danger" data-delete-activity-review="${escapeHtml(review.id)}">후기 삭제</button>
        </article>
      `;
    })
    .join("\n");
}

function closeOperatorActivityPhotoModal() {
  const modal = document.querySelector(".activity-photo-modal");
  if (modal) modal.remove();
  document.body.classList.remove("activity-modal-open");
}

function showOperatorActivityPhotoDetail(photoId) {
  const photo = (operatorActivityState.localData?.photos || []).find((item) => String(item.id) === String(photoId));
  if (!photo) return;
  closeOperatorActivityPhotoModal();

  const modal = document.createElement("div");
  modal.className = "activity-photo-modal";
  modal.innerHTML = `
    <div class="activity-photo-modal-backdrop" data-close-activity-modal></div>
    <article class="activity-photo-modal-card" role="dialog" aria-modal="true" aria-label="활동 사진 설명">
      <button type="button" class="activity-photo-modal-close" data-close-activity-modal aria-label="닫기">×</button>
      ${photo.imageUrl ? `<img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(photo.title || "활동 사진")}" />` : ""}
      <div class="activity-photo-modal-body">
        <h3>${escapeHtml(photo.title || "활동 사진")}</h3>
        <p>${escapeHtml(photo.description || "등록된 설명이 없습니다.")}</p>
      </div>
    </article>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-activity-modal]")) {
      closeOperatorActivityPhotoModal();
    }
  });

  document.body.appendChild(modal);
  document.body.classList.add("activity-modal-open");
}

function renderOperatorActivityAll() {
  renderOperatorActivityPhotos();
}

async function loadOperatorActivityManagement() {
  const summary = document.querySelector("#operatorActivityManageSummary");
  const majorInput = document.querySelector("#operatorMajorActivitiesInput");
  const annualInput = document.querySelector("#operatorAnnualActivitiesInput");
  if (!summary) return;

  if (!isOperatorUser()) {
    summary.textContent = "운영진 권한이 있어야 활동을 관리할 수 있습니다.";
    return;
  }

  const club = getOperatorActivityClub();
  const clubId = String(club?.clubId || club?.id || "");
  renderOperatorActivityHeader(club);

  if (!clubId) {
    summary.textContent = "운영 중인 동아리 정보를 찾을 수 없습니다.";
    return;
  }

  summary.textContent = "활동 정보를 불러오는 중입니다.";
  operatorActivityState.loadedClubId = clubId;
  let localData = getOperatorActivityLocalData(clubId);

  try {
    const clubResult = await apiRequest(`/api/clubs/${clubId}`);
    const clubData = getResponseData(clubResult, {});
    const parsed = parseOperatorActivityInfoForForm(clubData.activityInfo || "");

    if (!localData.major && parsed.major.length) localData.major = parsed.major.join("\n");
    if (!localData.annual && parsed.annual.length) localData.annual = parsed.annual.join("\n");
  } catch (error) {
    console.warn("동아리 활동 정보 조회 실패, 로컬 데이터로 표시:", error);
  }

  operatorActivityState.localData = localData;

  if (majorInput) majorInput.value = localData.major || "";
  if (annualInput) annualInput.value = localData.annual || "";

  summary.textContent = `${club?.name || "운영 동아리"} 활동을 관리할 수 있습니다.`;
  renderOperatorActivityAll();
}

async function saveOperatorActivityInfo(event) {
  event.preventDefault();

  const clubId = getOperatorActivityClubId();
  if (!clubId) {
    alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    return;
  }

  const button = event.currentTarget.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  const current = getOperatorActivityLocalData(clubId);
  const next = saveOperatorActivityLocalData(
    {
      ...current,
      major: document.querySelector("#operatorMajorActivitiesInput")?.value.trim() || "",
      annual: document.querySelector("#operatorAnnualActivitiesInput")?.value.trim() || "",
    },
    clubId
  );

  try {
    await apiRequest(`/api/clubs/${clubId}`, {
      method: "PATCH",
      body: {
        activityInfo: buildOperatorActivityInfoText(),
      },
    });
  } catch (error) {
    console.warn("백엔드 활동 정보 저장 실패, 로컬 저장으로 대체:", error);
  } finally {
    if (button) button.disabled = false;
  }

  operatorActivityState.localData = next;
  alert("활동 정보가 저장되었습니다.");
}

function readOperatorActivityImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("파일을 찾을 수 없습니다."));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      reject(new Error("JPG, PNG, WebP 파일만 업로드할 수 있습니다."));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("사진은 10MB 이하만 업로드할 수 있습니다."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("사진 파일을 불러오지 못했습니다."));
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveOperatorActivityPhoto(event) {
  event.preventDefault();

  const clubId = getOperatorActivityClubId();
  if (!clubId) {
    alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    return;
  }

  const titleInput = document.querySelector("#operatorActivityPhotoTitle");
  const descInput = document.querySelector("#operatorActivityPhotoDescription");
  const fileInput = document.querySelector("#operatorActivityPhotoFiles");
  const title = titleInput?.value.trim() || "";
  const description = descInput?.value.trim() || "";
  const files = Array.from(fileInput?.files || []);

  if (!title || !description || !files.length) {
    alert("사진 제목, 설명, 사진 파일을 모두 입력해주세요.");
    return;
  }

  const button = event.currentTarget.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  try {
    const photos = [];
    for (const [index, file] of files.entries()) {
      const imageUrl = await readOperatorActivityImageFile(file);
      photos.push({
        id: createOperatorActivityId("photo"),
        title: files.length > 1 ? `${title} ${index + 1}` : title,
        description,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
    }

    const current = getOperatorActivityLocalData(clubId);
    const next = saveOperatorActivityLocalData(
      {
        ...current,
        photos: [...photos, ...(current.photos || [])],
      },
      clubId
    );

    operatorActivityState.localData = next;
    renderOperatorActivityPhotos();

    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";
    if (fileInput) fileInput.value = "";

    alert("활동 사진이 추가되었습니다.");
  } catch (error) {
    alert(error.message || "활동 사진 추가에 실패했습니다.");
  } finally {
    if (button) button.disabled = false;
  }
}

function deleteOperatorActivityPhoto(photoId) {
  const clubId = getOperatorActivityClubId();
  if (!clubId || !photoId) return;
  if (!confirm("이 활동 사진을 삭제할까요?")) return;

  const current = getOperatorActivityLocalData(clubId);
  const next = saveOperatorActivityLocalData(
    {
      ...current,
      photos: (current.photos || []).filter((photo) => String(photo.id) !== String(photoId)),
    },
    clubId
  );

  operatorActivityState.localData = next;
  renderOperatorActivityPhotos();
  alert("활동 사진이 삭제되었습니다.");
}

function saveOperatorActivityReview(event) {
  event.preventDefault();

  const clubId = getOperatorActivityClubId();
  if (!clubId) {
    alert("운영 중인 동아리 정보를 찾을 수 없습니다.");
    return;
  }

  const authorInput = document.querySelector("#operatorActivityReviewAuthor");
  const contentInput = document.querySelector("#operatorActivityReviewContent");
  const author = authorInput?.value.trim() || "";
  const content = contentInput?.value.trim() || "";

  if (!author || !content) {
    alert("작성자와 후기 내용을 입력해주세요.");
    return;
  }

  const current = getOperatorActivityLocalData(clubId);
  const next = saveOperatorActivityLocalData(
    {
      ...current,
      reviews: [
        {
          id: createOperatorActivityId("review"),
          author,
          content,
          createdAt: new Date().toISOString(),
        },
        ...(current.reviews || []),
      ],
    },
    clubId
  );

  operatorActivityState.localData = next;
  renderOperatorActivityReviews();

  if (authorInput) authorInput.value = "";
  if (contentInput) contentInput.value = "";

  alert("부원 후기가 추가되었습니다.");
}

function deleteOperatorActivityReview(reviewId) {
  const clubId = getOperatorActivityClubId();
  if (!clubId || !reviewId) return;
  if (!confirm("이 부원 후기를 삭제할까요?")) return;

  const current = getOperatorActivityLocalData(clubId);
  const next = saveOperatorActivityLocalData(
    {
      ...current,
      reviews: (current.reviews || []).filter((review) => String(review.id) !== String(reviewId)),
    },
    clubId
  );

  operatorActivityState.localData = next;
  renderOperatorActivityReviews();
  alert("부원 후기가 삭제되었습니다.");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOperatorActivityPhotoModal();
});

function bindOperatorActivityManagementEvents() {
  document.querySelector("#operatorActivityInfoForm")?.addEventListener("submit", saveOperatorActivityInfo);
  document.querySelector("#operatorActivityPhotoForm")?.addEventListener("submit", saveOperatorActivityPhoto);
  document.querySelector("#operatorActivityRefreshBtn")?.addEventListener("click", loadOperatorActivityManagement);

  document.querySelector("#operatorActivityPhotoGrid")?.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-activity-photo]");
    const deleteButton = event.target.closest("[data-delete-activity-photo]");

    if (viewButton) {
      showOperatorActivityPhotoDetail(viewButton.dataset.viewActivityPhoto);
      return;
    }

    if (deleteButton) {
      deleteOperatorActivityPhoto(deleteButton.dataset.deleteActivityPhoto);
    }
  });
}

function setActiveTab(tabName) {
  if (String(tabName || "").startsWith("operator-") && !isOperatorUser()) {
    tabName = "dashboard";
  }

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".operator-sidebar-menu [data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });

  if (tabName === "profile") {
    renderProfileDetail();
    renderEmailVerificationStatus();
  }

  if (tabName === "scraps") {
    renderScraps();
  }

  if (tabName === "applications") {
    renderApplications();
  }

  if (tabName === "posts") {
    renderMyPosts();
  }

  if (tabName === "operator-dashboard" || tabName === "operator-board" || tabName === "operator-applications") {
    renderOperatorApplicantStats();
    renderOperatorApplicantPreview();
    renderOperatorApplicationManagement();
    renderOperatorRecentPosts();
    renderOperatorBoardManagement();
  }

  if (tabName === "operator-activity-records") {
    loadOperatorActivityManagement();
  }
}

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

document.querySelectorAll("[data-tab-button]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tabButton);
  });
});

document.querySelector("#clearBookmarks")?.addEventListener("click", () => {
  saveClubs([]);
  renderScraps();
  renderActivity();
});

document.querySelector("#refreshApplicationsBtn")?.addEventListener("click", async () => {
  await loadMyApplications();
  renderApplications();
  renderActivity();
});

document.querySelector("#refreshMyPostsBtn")?.addEventListener("click", async () => {
  await loadMyPosts();
  renderMyPosts();
  renderActivity();
});

document.querySelector("#operatorBoardRefreshBtn")?.addEventListener("click", async () => {
  await loadOperatorRecentPosts();
  renderOperatorRecentPosts();
  renderOperatorBoardManagement();
});

document.querySelector("#operatorApplicationsRefreshBtn")?.addEventListener("click", async () => {
  await loadOperatorApplicants();
  renderOperatorApplicantStats();
  renderOperatorApplicantPreview();
  renderOperatorApplicationManagement();
});

document.querySelectorAll("[data-operator-application-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    mypageState.operatorApplicantStatusFilter = button.dataset.operatorApplicationFilter || "";
    renderOperatorApplicationManagement();
  });
});

document.querySelector(".profile-edit-btn")?.addEventListener("click", async () => {
  const refreshToken = typeof getRefreshToken === "function" ? getRefreshToken() : (localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken"));

  try {
    if (refreshToken && typeof apiRequest === "function") {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
    }
  } catch (error) {
    console.warn("로그아웃 API 호출 실패, 로컬 세션은 삭제합니다:", error);
  } finally {
    if (typeof clearAuthSession === "function") {
      clearAuthSession();
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("currentUser");
      sessionStorage.removeItem("userRole");
    }

    window.location.href = "./index.html";
  }
});

document.querySelector("#profileInfoEditBtn")?.addEventListener("click", async () => {
  const button = document.querySelector("#profileInfoEditBtn");
  const isEditMode = button.dataset.mode === "edit";
  await setProfileEditMode(!isEditMode);
});

document.querySelector("#changePasswordBtn")?.addEventListener("click", async () => {
  const nextPassword = prompt("새 비밀번호를 입력해주세요.\n8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");

  if (nextPassword === null) return;

  const trimmedPassword = nextPassword.trim();
  const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  if (!passwordRule.test(trimmedPassword)) {
    alert("비밀번호는 8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");
    return;
  }

  const confirmPassword = prompt("새 비밀번호를 한 번 더 입력해주세요.");

  if (confirmPassword === null) return;

  if (confirmPassword.trim() !== trimmedPassword) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  const button = document.querySelector("#changePasswordBtn");
  button.disabled = true;

  try {
    await updateMyProfileOnServer({
      password: trimmedPassword,
    });

    alert("비밀번호가 DB에 저장되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.");
  } catch (error) {
    console.error(error);
    alert(error.message || "비밀번호 변경에 실패했습니다.");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#withdrawAccountBtn")?.addEventListener("click", async () => {
  const user = getDisplayUser() || {};
  const emailText = user.email ? `\n\n탈퇴 계정: ${user.email}` : "";
  const ok = confirm(
    "정말 회원 탈퇴를 진행할까요?\n" +
      "탈퇴가 완료되면 로그인 정보가 삭제되고 메인 화면으로 이동합니다." +
      emailText
  );

  if (!ok) return;

  const password = prompt("회원 탈퇴를 위해 현재 비밀번호를 입력해주세요.");
  if (password === null) return;
  if (!password.trim()) {
    alert("현재 비밀번호를 입력해야 회원 탈퇴가 가능합니다.");
    return;
  }

  const secondOk = confirm("한 번 더 확인합니다. 정말 계정을 탈퇴할까요?");
  if (!secondOk) return;

  const button = document.querySelector("#withdrawAccountBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "탈퇴 처리 중...";
  }

  try {
    if (typeof deleteCurrentAccount !== "function") {
      throw new Error("회원 탈퇴 API 연결 함수를 찾을 수 없습니다.");
    }

    await deleteCurrentAccount(password);
    alert("회원 탈퇴가 완료되었습니다.");
    window.location.href = "./index.html";
  } catch (error) {
    console.error(error);
    alert(error.message || "회원 탈퇴 처리 중 오류가 발생했습니다.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "회원 탈퇴";
    }
  }
});


function normalizeApiClub(apiClub) {
  return {
    id: String(apiClub.clubId || apiClub.id || apiClub.club?.clubId || apiClub.club?.id || ""),
    clubId: String(apiClub.clubId || apiClub.id || apiClub.club?.clubId || apiClub.club?.id || ""),
    name: apiClub.name || apiClub.clubName || apiClub.club?.name || "-",
    description: apiClub.shortDescription || apiClub.description || apiClub.club?.shortDescription || "",
    status: apiClub.recruitmentStatus || apiClub.status || apiClub.club?.status || "UNKNOWN",
    image: apiClub.imageUrl || apiClub.club?.imageUrl || "",
    category: apiClub.category || apiClub.club?.category || "기타",
    type: apiClub.type || apiClub.club?.type || "",
    typeText: apiClub.type === "CENTRAL" || apiClub.club?.type === "CENTRAL" ? "중앙동아리" : "일반동아리",
  };
}

function saveBookmarkListFromApi(bookmarks) {
  const clubs = (bookmarks || []).map(normalizeApiClub).filter((club) => club.id);
  saveClubs(clubs);
}

async function syncMyPageFromApi() {
  if (typeof apiRequest !== "function") return;

  try {
    const profileResult = await apiRequest("/api/users/me");
    const data = profileResult.data || {};

    saveUserFromApi(data);
  } catch (error) {
    console.warn("내 프로필 API 조회 실패:", error);
    if (String(error.message || "").includes("토큰") || String(error.message || "").includes("로그인")) {
      clearAuthSession?.();
    }
  }

  try {
    const joinedResult = await apiRequest("/api/users/me/clubs");
    mypageState.joinedClubs = (joinedResult.data || []).map((club) => ({
      clubId: String(club.clubId),
      name: club.name,
      typeText: club.type === "CENTRAL" ? "중앙동아리" : "일반동아리",
      category: club.myRole === "ADMIN" || club.myRole === "OWNER" || club.myRole === "MANAGER" ? "운영진" : "부원",
      myRole: club.myRole || club.role || "",
      image: club.imageUrl || "",
    }));

    mypageState.operatorClubs = mypageState.joinedClubs.filter((club) => {
      if (typeof isOperatorClubRoleValue === "function") {
        return [club.myRole, club.role, club.clubRole, club.memberRole, club.position, club.category].some(isOperatorClubRoleValue);
      }
      const role = String(club.myRole || club.category || "").toUpperCase();
      return (
        role.includes("ADMIN") ||
        role.includes("OWNER") ||
        role.includes("MANAGER") ||
        role.includes("PRESIDENT") ||
        role.includes("LEADER") ||
        role.includes("STAFF") ||
        role.includes("OPERATOR") ||
        role.includes("운영") ||
        role.includes("회장") ||
        role.includes("대표") ||
        role.includes("관리")
      );
    });

    if (mypageState.operatorClubs.length > 0) {
      const currentUser = getDisplayUser();
      const operatorClub = mypageState.operatorClubs[0];
      const fixedUser = typeof markUserAsOperatorFromClub === "function"
        ? markUserAsOperatorFromClub(currentUser, operatorClub)
        : {
            ...currentUser,
            role: "ROLE_CLUB_ADMIN",
            signupRole: "ROLE_CLUB_ADMIN",
            memberType: "CLUB_ADMIN",
            operatorStatus: "APPROVED",
          };
      saveStoredUser(fixedUser);
    }

    if (mypageState.operatorClubs.length === 0 && isOperatorUser() && mypageState.joinedClubs.length > 0) {
      mypageState.operatorClubs = [mypageState.joinedClubs[0]];
    }

    if (isOperatorUser()) {
      const fallbackClub = getOperatorFallbackClub();
      if (fallbackClub && !mypageState.operatorClubs.some((club) => String(club.clubId) === String(fallbackClub.clubId))) {
        mypageState.operatorClubs.unshift(fallbackClub);
      }
      if (fallbackClub && !mypageState.joinedClubs.some((club) => String(club.clubId) === String(fallbackClub.clubId))) {
        mypageState.joinedClubs.unshift(fallbackClub);
      }
    }
  } catch (error) {
    console.warn("내 가입 동아리 API 조회 실패:", error);

    if (isOperatorUser()) {
      const fallbackClub = getOperatorFallbackClub();
      if (fallbackClub) {
        mypageState.operatorClubs = [fallbackClub];
        if (mypageState.joinedClubs.length === 0) mypageState.joinedClubs = [fallbackClub];
      }
    }
  }

  try {
    const bookmarkResult = await apiRequest("/api/users/me/bookmarks");
    saveBookmarkListFromApi(bookmarkResult.data || []);
  } catch (error) {
    console.warn("내 스크랩 API 조회 실패:", error);
  }

  await loadMyApplications();
  await loadMyPosts();
  await loadOperatorApplicants();
  await loadOperatorRecentPosts();
}

function getInitialMyPageTab() {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get("tab");

  if (requestedTab) {
    if (requestedTab.startsWith("operator-") && !isOperatorUser()) {
      return "dashboard";
    }

    return requestedTab;
  }

  if (isOperatorUser()) return "operator-dashboard";
  return "dashboard";
}

async function initMyPage() {
  await syncMyPageFromApi();

  renderProfile();
  renderProfileDetail();
  renderOperatorArea();
  renderJoinedClubs();
  renderActivity();
  renderNotifications();
  renderScraps();
  renderApplications();
  renderMyPosts();
  renderOperatorApplicantStats();
  renderOperatorApplicantPreview();
  renderOperatorApplicationManagement();
  renderOperatorRecentPosts();
  renderOperatorBoardManagement();
  bindOperatorActivityManagementEvents();

  const initialTab = getInitialMyPageTab();
  setActiveTab(initialTab);
}

initMyPage();
}