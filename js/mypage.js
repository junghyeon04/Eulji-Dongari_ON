if (!isLoggedIn()) {
  document.body.classList.add("protected-page-locked");
  openLoginRequiredModal("마이페이지는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?");
} else {
/* =========================================================
   MyPage mock state
   나중에 백엔드 연결 시 아래 데이터 대신 API 응답을 넣으면 됨.

   연결 예정:
   - GET /api/users/me
   - GET /api/users/me/clubs
   - GET /api/users/me/bookmarks
   - GET /api/users/me/applications
   - PATCH /api/users/me
========================================================= */

const BOOKMARK_STORAGE_KEY = "bookmarkedClubs";


function getStoredUser() {
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

const mypageState = {
  user: {
    name: "",
    email: "",
    department: "",
    studentId: "",
  },
  joinedClubs: [
    {
      clubId: 1,
      name: "멋쟁이사자처럼",
      typeText: "중앙동아리",
      category: "기타",
      image: "",
    },
    {
      clubId: 5,
      name: "FLASH",
      typeText: "일반동아리",
      category: "문화/예술/공연",
      image: "./images/flash-poster.png",
    },
  ],
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
  notifications: [
    {
      message: "동아리 ON 개발팀에서 새로운 공지가 등록되었습니다.",
      date: "1시간 전",
    },
    {
      message: "F.L.A.S.H에서 새로운 공지가 작성되었습니다.",
      date: "14시간 전",
    },
    {
      message: "000 동아리의 지원 결과가 발표되었습니다.",
      date: "2026.07.08",
    },
    {
      message: "000 동아리의 지원 마감이 하루 남았습니다.",
      date: "2026.07.01",
    },
  ],
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
  const storedUser = getStoredUser();
  const user = storedUser || mypageState.user;

  const name = user.name || "";
  const email = user.email || "";
  const department = user.department || "";
  const studentId = user.studentId || user.studentid || "";

  document.querySelector("#profileName").textContent = name || "이름 없음";
  document.querySelector("#profileEmail").textContent = email;
  document.querySelector("#profileMeta").textContent =
    department || studentId ? `${department} ㅣ ${studentId}` : "";
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

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === tabName);
  });

  if (tabName === "scraps") {
    renderScraps();
  }

  if (tabName === "overview") {
    renderActivity();
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

renderProfile();
renderJoinedClubs();
renderActivity();
renderNotifications();
renderScraps();
}