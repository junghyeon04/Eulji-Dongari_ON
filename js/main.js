const CHECKBOX_OFF = "./images/checkbox.svg";
const CHECKBOX_ON = "./images/checkbox-on.svg";
const STORAGE_KEY = "bookmarkedClubs";

function getSavedClubs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveClubs(clubs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
}

function isSaved(clubId) {
  return getSavedClubs().some((club) => club.id === clubId);
}

function getClubDataFromCard(card) {
  const title = card.querySelector("h3")?.textContent?.trim() || card.dataset.clubName || "";
  const description = card.querySelector(".club-content p")?.textContent?.trim() || "";
  const status = card.dataset.status || "CLOSED";
  const image = card.querySelector(".club-thumb img")?.getAttribute("src") || "";

  return {
    id: card.dataset.clubId,
    name: card.dataset.clubName || title,
    description,
    status,
    image,
  };
}

function updateBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn").forEach((button) => {
    const card = button.closest(".club-card");
    const icon = button.querySelector("img");
    const clubId = card.dataset.clubId;
    const clubName = card.dataset.clubName;

    if (isSaved(clubId)) {
      icon.src = CHECKBOX_ON;
      button.classList.add("is-active");
      button.setAttribute("aria-label", `${clubName} 찜 취소`);
    } else {
      icon.src = CHECKBOX_OFF;
      button.classList.remove("is-active");
      button.setAttribute("aria-label", `${clubName} 찜하기`);
    }
  });
}

document.querySelectorAll(".bookmark-btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();

    const card = button.closest(".club-card");
    const club = getClubDataFromCard(card);

    let savedClubs = getSavedClubs();

    if (isSaved(club.id)) {
      savedClubs = savedClubs.filter((savedClub) => savedClub.id !== club.id);
    } else {
      savedClubs.push(club);
    }

    saveClubs(savedClubs);
    updateBookmarkButtons();
  });
});

document.querySelectorAll(".feature-card").forEach((card) => {
  card.addEventListener("click", () => {
    card.classList.toggle("is-back");
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.classList.toggle("is-back");
    }
  });
});

const searchForm = document.querySelector(".search-bar");

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });
}

/* ===== Recruitment status: 운영진 관리 페이지/API 연동 대비 =====
   지금은 HTML의 data-status 값을 읽어서 표시함.
   백엔드 연결 후에는 GET /api/clubs 응답의 status 값으로 data-status를 바꾸거나,
   카드 자체를 JS로 렌더링하면 됨.

   예상 status 값:
   OPEN   -> 모집 중
   CLOSED -> 모집마감
   ALWAYS -> 상시 모집
*/
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

function renderStatusBadges() {
  document.querySelectorAll(".club-card").forEach((card) => {
    const badge = card.querySelector("[data-status-badge]");
    if (!badge) return;

    const status = card.dataset.status || "CLOSED";
    const statusInfo = STATUS_MAP[status] || STATUS_MAP.CLOSED;

    badge.textContent = statusInfo.text;
    badge.className = `tag ${statusInfo.className}`;
  });
}

/* 콘솔 테스트용:
   changeClubStatus("1", "CLOSED")
   실제 프로젝트에서는 운영진 관리 페이지에서 PATCH /api/clubs/{clubId} 성공 후 목록을 다시 조회하면 됨.
*/
function changeClubStatus(clubId, nextStatus) {
  const card = document.querySelector(`.club-card[data-club-id="${clubId}"]`);
  if (!card) return;

  card.dataset.status = nextStatus;
  renderStatusBadges();
}

updateBookmarkButtons();
renderStatusBadges();


function fixHomeMoreLinks() {
  document.querySelectorAll(".club-section").forEach((section) => {
    const title = section.querySelector(".section-title-row h2, .section-title h2")?.textContent?.trim();
    const moreLink = section.querySelector('a[href*="club-list.html"]');

    if (!moreLink) return;

    if (title === "중앙동아리") {
      moreLink.href = "./club-list.html?type=CENTRAL";
    }

    if (title === "일반동아리") {
      moreLink.href = "./club-list.html?type=GENERAL";
    }
  });
}

fixHomeMoreLinks();


function initHomeClubCardLinks() {
  document.querySelectorAll(".club-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".bookmark-btn")) return;

      const clubId = card.dataset.clubId;
      if (!clubId) return;

      window.location.href = `./club-detail.html?clubId=${clubId}`;
    });

    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "link");

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const clubId = card.dataset.clubId;
        if (!clubId) return;

        window.location.href = `./club-detail.html?clubId=${clubId}`;
      }
    });
  });
}

initHomeClubCardLinks();
