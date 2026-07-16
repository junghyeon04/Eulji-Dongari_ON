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

function getStoredUser() {
  return (
    safeJsonParse(sessionStorage.getItem("currentUser")) ||
    safeJsonParse(localStorage.getItem("currentUser")) ||
    safeJsonParse(localStorage.getItem("registeredUser")) ||
    null
  );
}

function saveStoredUser(nextUser) {
  const registeredUser = safeJsonParse(localStorage.getItem("registeredUser")) || {};
  const mergedRegisteredUser = {
    ...registeredUser,
    ...nextUser,
  };

  localStorage.setItem("registeredUser", JSON.stringify(mergedRegisteredUser));

  if (localStorage.getItem("currentUser")) {
    localStorage.setItem("currentUser", JSON.stringify({
      ...safeJsonParse(localStorage.getItem("currentUser")),
      ...nextUser,
    }));
  }

  if (sessionStorage.getItem("currentUser")) {
    sessionStorage.setItem("currentUser", JSON.stringify({
      ...safeJsonParse(sessionStorage.getItem("currentUser")),
      ...nextUser,
    }));
  }
}

function getDisplayUser() {
  const storedUser = getStoredUser();

  return {
    ...mypageState.user,
    ...(storedUser || {}),
    joinDate: storedUser?.joinDate || storedUser?.createdAt || storedUser?.createdAtText || "2026.06.01",
  };
}

function isOperatorUser() {
  const user = getDisplayUser();

  return (
    user.role === "ROLE_CLUB_ADMIN" ||
    user.signupRole === "ROLE_CLUB_ADMIN_PENDING" ||
    user.operatorStatus === "PENDING" ||
    Boolean(user.operatorRequest)
  );
}

function getOperatorRequest() {
  const user = getDisplayUser();
  return user.operatorRequest || {};
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
  const mypagePosts = removeDefaultBoardSeedPosts(safeJsonParse(localStorage.getItem("mypageMyPosts"), []) || []);
  const lastPost = safeJsonParse(localStorage.getItem("lastCreatedBoardPost"), null);
  const extraPosts = removeDefaultBoardSeedPosts(safeJsonParse(localStorage.getItem("myCreatedBoardPosts"), []) || []);
  const perClubPosts = [];

  // club-detail.html 게시판은 clubBoardPosts_{clubId} 키에 저장되어 있었기 때문에
  // 모든 동아리별 게시판 캐시도 같이 읽어온다.
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith("clubBoardPosts_")) return;

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
    ...mypagePosts,
    ...extraPosts,
    ...(lastPost && !isDefaultBoardSeedPost(lastPost) ? [lastPost] : []),
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
  const authorId = String(post.authorId || post.userId || post.userid || post.writerId || post.memberId || "");
  const authorEmail = String(post.authorEmail || post.email || post.writerEmail || "").toLowerCase();
  const authorName = String(post.authorName || post.writerName || post.memberName || post.author || "");

  if (post.createdByCurrentUser === true || post.isMine === true || post.createdByMe === true) return true;
  if (user.userId && authorId && user.userId === authorId) return true;
  if (user.email && authorEmail && user.email === authorEmail) return true;
  if (user.name && authorName && (user.name === authorName || isMaskedNameMatch(user.name, authorName))) return true;

  const createdIds = safeJsonParse(localStorage.getItem("myCreatedBoardPostIds"), []) || [];
  const clubId = getPostClubId(post);
  const postId = getPostId(post);
  if (clubId && postId && createdIds.some((item) => String(item.clubId) === String(clubId) && String(item.postId) === String(postId))) {
    return true;
  }

  if ((post.source === "board-local-cache" || post.source === "club-detail-board-cache") && ((!authorId && !authorEmail) || authorName === "나" || post.createdByCurrentUser === true)) return true;

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

  // API가 아직 내가 쓴 게시글을 제대로 못 내려주거나, 이전 버전에서 작성한 글은
  // 작성자 식별값이 부족할 수 있어서 로컬 게시판 작성 글을 보조로 보여준다.
  const postsToShow = matchedPosts.length > 0
    ? matchedPosts
    : localPosts.filter((post) => post.source === "board-local-cache");

  return postsToShow.map(normalizeLocalPost);
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
  if (user.name && authorName && (user.name === authorName || isMaskedNameMatch(user.name, authorName))) return true;

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
    ? `${request.clubName} 운영자 신청 상태입니다. 학교 승인 후 실제 관리 기능을 사용할 수 있습니다.`
    : "학교 승인 후 동아리 정보 수정 기능을 사용할 수 있습니다.";

  const operatorClubName = document.querySelector("#operatorClubName");
  const operatorDashboardClubName = document.querySelector("#operatorDashboardClubName");
  const operatorClubStatus = document.querySelector("#operatorClubStatus");

  if (operatorClubName) operatorClubName.textContent = clubName;
  if (operatorDashboardClubName) operatorDashboardClubName.textContent = clubName;
  if (operatorClubStatus) operatorClubStatus.textContent = statusText;
}

function normalizeUserFromApi(data = {}) {
  return {
    userId: data.userId || data.userid || data.id || "",
    email: data.email || "",
    name: data.name || "",
    studentId: data.studentId || data.studentid || "",
    department: data.department || "",
    role: data.role || "ROLE_STUDENT",
    createdAt: data.createdAt || "",
    joinDate: data.createdAt || data.joinDate || data.createdAtText || "",
    emailVerified: data.emailVerified ?? data.emailverified ?? data.verified ?? data.emailAuthVerified ?? true,
  };
}

function saveUserFromApi(data = {}) {
  const nextUser = normalizeUserFromApi(data);

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
        <article class="mypage-api-card application-history-card" data-application-id="${escapeHtml(applicationId)}">
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

function getApplicationCacheForMyPage() {
  return safeJsonParse(localStorage.getItem("clubApplicationCache"), []) || [];
}

function normalizeMyApplication(application) {
  const answers = Array.isArray(application.answers) ? application.answers : [];
  const answerText = answers
    .map((answer) => {
      const label = answer.label || answer.questionTitle || answer.question || `문항 ${answer.questionId || ""}`.trim();
      const value = Array.isArray(answer.values) ? answer.values.join(", ") : answer.value || answer.answer || "";
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    ...application,
    applicationId: getApplicationId(application),
    clubId: getApplicationClubId(application),
    clubName: getApplicationClubName(application),
    status: application.status || "PENDING",
    content: application.content || application.answer || application.answersText || answerText || "지원 내용이 저장되어 있습니다.",
    createdAt: application.createdAt || application.appliedAt || application.createdDate || "",
  };
}

function mergeApplicationsForMyPage(apiApplications = [], localApplications = []) {
  const map = new Map();

  localApplications.map(normalizeMyApplication).forEach((item, index) => {
    const key = getApplicationId(item) || `${getApplicationClubId(item)}-${item.studentId || item.studentid || index}`;
    map.set(key, item);
  });

  apiApplications.map(normalizeMyApplication).forEach((item, index) => {
    const key = getApplicationId(item) || `${getApplicationClubId(item)}-${item.studentId || item.studentid || index}`;
    const previous = map.get(key) || {};
    map.set(key, { ...previous, ...item });
  });

  return Array.from(map.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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

  const createdIds = safeJsonParse(localStorage.getItem("myCreatedBoardPostIds"), []) || [];
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
          const result = await apiRequest(`/api/clubs/${club.clubId}/posts?page=0&size=5`);
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

function setActiveTab(tabName) {
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

  if (tabName === "operator-dashboard" || tabName === "operator-board") {
    renderOperatorRecentPosts();
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
  const ok = confirm("정말 회원 탈퇴하시겠습니까? 탈퇴 후에는 현재 계정으로 로그인할 수 없습니다.");

  if (!ok) return;

  const finalCheck = prompt("탈퇴하려면 '회원탈퇴'를 입력해주세요.");

  if (finalCheck !== "회원탈퇴") {
    alert("회원 탈퇴가 취소되었습니다.");
    return;
  }

  const button = document.querySelector("#withdrawAccountBtn");
  button.disabled = true;

  try {
    await apiRequest("/api/users/me", {
      method: "DELETE",
    });

    alert("회원 탈퇴가 완료되었습니다.");

    if (typeof clearAuthSession === "function") clearAuthSession();
    else {
      localStorage.clear();
      sessionStorage.clear();
    }

    window.location.href = "./index.html";
  } catch (error) {
    console.error(error);
    alert(
      error.message ||
        "회원 탈퇴 API 호출에 실패했습니다. 백엔드에 DELETE /api/users/me 엔드포인트가 있는지 확인해주세요."
    );
  } finally {
    button.disabled = false;
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
      const role = String(club.myRole || club.category || "").toUpperCase();
      return role.includes("ADMIN") || role.includes("OWNER") || role.includes("MANAGER") || role.includes("운영");
    });

    if (mypageState.operatorClubs.length === 0 && isOperatorUser() && mypageState.joinedClubs.length > 0) {
      mypageState.operatorClubs = [mypageState.joinedClubs[0]];
    }
  } catch (error) {
    console.warn("내 가입 동아리 API 조회 실패:", error);
  }

  try {
    const bookmarkResult = await apiRequest("/api/users/me/bookmarks");
    saveBookmarkListFromApi(bookmarkResult.data || []);
  } catch (error) {
    console.warn("내 스크랩 API 조회 실패:", error);
  }

  await loadMyApplications();
  await loadMyPosts();
  await loadOperatorRecentPosts();
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
  renderOperatorRecentPosts();
}

initMyPage();
}