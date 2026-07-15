const CHECKBOX_OFF = "./images/checkbox.svg";
const CHECKBOX_ON = "./images/checkbox-on.svg";
const STORAGE_KEY = "bookmarkedClubs";

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
  ALWAYS_OPEN: {
    text: "상시 모집",
    className: "status-always",
  },
  UNKNOWN: {
    text: "모집 정보 없음",
    className: "status-unknown",
  },
};

const LOCAL_CLUB_IMAGES = {
  "멋쟁이사자처럼": "https://www.figma.com/api/mcp/asset/e921dd97-70c7-4765-bb0a-04f289afba3a",
  DNG: "https://www.figma.com/api/mcp/asset/53774021-3314-489d-bd50-640ee7e952c9",
  "새밝소리": "https://www.figma.com/api/mcp/asset/44e7b3ad-9b5d-4803-ab23-40f486228699",
  "LUNATIC+": "https://www.figma.com/api/mcp/asset/bef36369-6cf4-4185-b149-20adc1aac6d0",
  "F.L.A.S.H": "https://www.figma.com/api/mcp/asset/9b06a878-6e5b-4341-b7ab-a797c20d9803",
  FLASH: "https://www.figma.com/api/mcp/asset/9b06a878-6e5b-4341-b7ab-a797c20d9803",
  "야구의 숲": "https://www.figma.com/api/mcp/asset/cf907e5d-7457-4148-86fd-221629a9e630",
};

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
  return getSavedClubs().some((club) => String(club.id) === String(clubId));
}

function convertClubFromApi(apiClub) {
  const recruitmentStatus = apiClub.recruitmentStatus || "UNKNOWN";

  return {
    id: String(apiClub.clubId),
    name: apiClub.name,
    type: apiClub.type,
    category: apiClub.category,
    description: apiClub.shortDescription || "",
    status: recruitmentStatus,
    statusLabel: apiClub.recruitmentStatusLabel || STATUS_MAP[recruitmentStatus]?.text || "모집 정보 없음",
    image: apiClub.imageUrl || LOCAL_CLUB_IMAGES[apiClub.name] || "",
  };
}

function createHomeClubCard(club) {
  const statusInfo = STATUS_MAP[club.status] || STATUS_MAP.UNKNOWN;
  const imageHtml = club.image
    ? `<img src="${club.image}" alt="${club.name} 모집 이미지" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
    : "";

  return `
    <article class="club-card" data-club-id="${club.id}" data-club-name="${club.name}" data-status="${club.status}">
      <div class="club-thumb">
        ${imageHtml}
      </div>
      <div class="club-content">
        <h3>${club.name}</h3>
        <p>${club.description}</p>
        <div class="club-bottom">
          <em class="tag ${statusInfo.className}" data-status-badge>${club.statusLabel || statusInfo.text}</em>
          <button type="button" class="bookmark-btn" aria-label="${club.name} 찜하기">
            <img src="${isSaved(club.id) ? CHECKBOX_ON : CHECKBOX_OFF}" alt="" class="bookmark-icon" />
          </button>
        </div>
      </div>
    </article>
  `;
}

async function loadHomeClubsFromApi() {
  if (typeof apiRequest !== "function") return;

  try {
    const result = await apiRequest("/api/clubs");
    const clubs = (result.data || []).map(convertClubFromApi);
    const sections = document.querySelectorAll(".club-section");

    sections.forEach((section) => {
      const title = section.querySelector(".section-title-row h2, .section-title h2")?.textContent?.trim();
      const grid = section.querySelector(".club-grid");
      if (!grid) return;

      const type = title === "일반동아리" ? "GENERAL" : "CENTRAL";
      const limit = type === "GENERAL" ? 3 : 4;
      const items = clubs.filter((club) => club.type === type).slice(0, limit);

      if (items.length > 0) {
        grid.innerHTML = items.map(createHomeClubCard).join("");
      }
    });
  } catch (error) {
    console.warn("홈 동아리 API 조회 실패, 기존 HTML 카드 사용:", error);
  }
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
    if (!card) return;

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

function bindBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const card = button.closest(".club-card");
      const club = getClubDataFromCard(card);

      let savedClubs = getSavedClubs();

      if (isSaved(club.id)) {
        savedClubs = savedClubs.filter((savedClub) => String(savedClub.id) !== String(club.id));
      } else {
        savedClubs.push(club);
      }

      saveClubs(savedClubs);
      updateBookmarkButtons();
    });
  });
}

function initFeatureCards() {
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
}

function initSearchForm() {
  const searchForm = document.querySelector(".search-bar");

  if (!searchForm) return;

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = searchForm.querySelector("input")?.value.trim() || "";
    window.location.href = `./club-list.html${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""}`;
  });
}

function renderStatusBadges() {
  document.querySelectorAll(".club-card").forEach((card) => {
    const badge = card.querySelector("[data-status-badge]");
    if (!badge) return;

    const status = card.dataset.status || "CLOSED";
    const statusInfo = STATUS_MAP[status] || STATUS_MAP.UNKNOWN;

    if (!badge.textContent.trim()) {
      badge.textContent = statusInfo.text;
    }
    badge.className = `tag ${statusInfo.className}`;
  });
}

function changeClubStatus(clubId, nextStatus) {
  const card = document.querySelector(`.club-card[data-club-id="${clubId}"]`);
  if (!card) return;

  card.dataset.status = nextStatus;
  renderStatusBadges();
}

window.changeClubStatus = changeClubStatus;

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

async function initHomePage() {
  await loadHomeClubsFromApi();

  bindBookmarkButtons();
  updateBookmarkButtons();
  renderStatusBadges();
  fixHomeMoreLinks();
  initHomeClubCardLinks();
  initFeatureCards();
  initSearchForm();
}

initHomePage();
