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

const mypageState = {
  user: {
    name: "",
    email: "",
    department: "",
    studentId: "",
    joinDate: "",
  },
  joinedClubs: [],
  activity: [
    {
      key: "posts",
      title: "내가 쓴 게시글",
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

function setProfileEditMode(isEditMode) {
  const editButton = document.querySelector("#profileInfoEditBtn");
  const editableKeys = ["name", "department", "studentId"];
  const user = getDisplayUser();

  if (isEditMode) {
    editableKeys.forEach((key) => {
      const field = document.querySelector(`[data-profile-field="${key}"]`);
      if (!field) return;

      const value = key === "studentId" ? (user.studentId || user.studentid || "") : (user[key] || "");
      field.innerHTML = `<input class="profile-edit-input" data-profile-input="${key}" type="text" value="${value}" />`;
    });

    editButton.textContent = "저장";
    editButton.dataset.mode = "edit";
    return;
  }

  const nextUser = {
    name: document.querySelector('[data-profile-input="name"]')?.value.trim() || "",
    department: document.querySelector('[data-profile-input="department"]')?.value.trim() || "",
    studentId: document.querySelector('[data-profile-input="studentId"]')?.value.trim() || "",
  };

  if (!nextUser.name || !nextUser.department || !nextUser.studentId) {
    alert("이름, 학과, 학번을 모두 입력해주세요.");
    return;
  }

  saveStoredUser(nextUser);
  editButton.textContent = "정보 수정";
  editButton.dataset.mode = "view";

  renderProfile();
  renderProfileDetail();
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
    : mypageState.joinedClubs.map(joinedClubTemplate).join("");

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
    .join("");

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
    .join("");
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
    .join("");

  document.querySelectorAll("[data-remove-scrap]").forEach((button) => {
    button.addEventListener("click", () => {
      const removeId = button.dataset.removeScrap;
      const nextClubs = getSavedClubs().filter((club) => club.id !== removeId);
      saveClubs(nextClubs);
      renderScraps();
      renderActivity();
    });
  });
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
  }

  if (tabName === "scraps") {
    renderScraps();
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

document.querySelector(".profile-edit-btn")?.addEventListener("click", () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");

  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("userRole");

  window.location.href = "./index.html";
});

document.querySelector("#profileInfoEditBtn")?.addEventListener("click", () => {
  const button = document.querySelector("#profileInfoEditBtn");
  const isEditMode = button.dataset.mode === "edit";
  setProfileEditMode(!isEditMode);
});

document.querySelector("#changePasswordBtn")?.addEventListener("click", () => {
  const nextPassword = prompt("새 비밀번호를 입력해주세요. (8자 이상)");

  if (nextPassword === null) return;

  const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  if (!passwordRule.test(nextPassword.trim())) {
    alert("비밀번호는 8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");
    return;
  }

  const registeredUser = safeJsonParse(localStorage.getItem("registeredUser")) || {};
  registeredUser.password = nextPassword.trim();
  localStorage.setItem("registeredUser", JSON.stringify(registeredUser));

  alert("비밀번호가 변경되었습니다.");
});

document.querySelector("#withdrawAccountBtn")?.addEventListener("click", () => {
  const ok = confirm("정말 회원 탈퇴하시겠습니까? 저장된 회원가입 정보와 로그인 정보가 삭제됩니다.");

  if (!ok) return;

  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "./index.html";
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

    saveStoredUser({
      userId: data.userId || data.userid || "",
      email: data.email || "",
      name: data.name || "",
      studentId: data.studentId || data.studentid || "",
      department: data.department || "",
      role: data.role || "ROLE_STUDENT",
      createdAt: data.createdAt || "",
    });
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
      category: club.myRole === "ADMIN" ? "운영진" : "부원",
      image: club.imageUrl || "",
    }));
  } catch (error) {
    console.warn("내 가입 동아리 API 조회 실패:", error);
  }

  try {
    const bookmarkResult = await apiRequest("/api/users/me/bookmarks");
    saveBookmarkListFromApi(bookmarkResult.data || []);
  } catch (error) {
    console.warn("내 스크랩 API 조회 실패:", error);
  }

  try {
    const appResult = await apiRequest("/api/users/me/applications");
    const target = mypageState.activity.find((item) => item.key === "applications");
    if (target) target.count = (appResult.data || []).length;
  } catch (error) {
    console.warn("내 지원 내역 API 조회 실패:", error);
  }
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
}

initMyPage();
}