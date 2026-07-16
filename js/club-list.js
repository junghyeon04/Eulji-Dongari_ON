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
    text: "상시 모집",
    className: "status-always",
  },
};

const CATEGORY_MAP = {
  RELIGION: "종교",
  CULTURE_ART: "문화/예술/공연",
  PERFORMANCE: "문화/예술/공연",
  SOCIAL: "친목",
  VOLUNTEER: "봉사",
  SPORTS: "체육",
  ETC: "기타",
};

const CATEGORY_ALIAS = {
  PERFORMANCE: "CULTURE_ART",
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

let clubs = [];

const state = {
  type: "CENTRAL",
  keyword: "",
  category: "ALL",
  scrapOnly: false,
};

function normalizeCategory(category) {
  return CATEGORY_ALIAS[category] || category;
}

function getSavedClubs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveClubs(savedClubs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedClubs));
}

function isSaved(clubId) {
  return getSavedClubs().some((club) => String(club.id) === String(clubId));
}

function initTypeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const keyword = params.get("keyword") || "";

  if (type === "GENERAL" || type === "CENTRAL") {
    state.type = type;
  }

  if (keyword) {
    state.keyword = keyword;
    const searchInput = document.querySelector("#clubSearchInput");
    if (searchInput) searchInput.value = keyword;
  }

  document.querySelectorAll(".explore-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.type === state.type);
  });
}

function convertClubFromApi(apiClub) {
  const recruitmentStatus =
  apiClub.recruitmentStatus === "UNKNOWN" || !apiClub.recruitmentStatus
    ? "ALWAYS"
    : apiClub.recruitmentStatus;

  return {
    id: String(apiClub.clubId),
    name: apiClub.name,
    type: apiClub.type,
    category: apiClub.category,
    description: apiClub.shortDescription || "",
    status: recruitmentStatus,
    image: apiClub.imageUrl || LOCAL_CLUB_IMAGES[apiClub.name] || "",
    recruitPeriod: apiClub.recruitPeriod,
    recruitmentStatus,
    recruitmentStatusLabel: apiClub.recruitmentStatusLabel || "모집 정보 없음",
    isRecruiting: apiClub.isRecruiting,
  };
}

async function loadClubsFromApi() {
  const grid = document.querySelector("#clubGrid");
  const empty = document.querySelector("#exploreEmpty");
  const resultInfo = document.querySelector("#resultInfo");

  try {
    if (resultInfo) {
      resultInfo.textContent = "동아리 목록을 불러오는 중...";
    }

    const result = await apiRequest("/api/clubs");

    clubs = result.data.map(convertClubFromApi);

    renderClubs();
  } catch (error) {
    console.error(error);

    if (grid) {
      grid.innerHTML = "";
    }

    if (empty) {
      empty.style.display = "block";
      empty.textContent = "동아리 목록을 불러오지 못했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.";
    }

    if (resultInfo) {
      resultInfo.textContent = "동아리 목록 조회 실패";
    }
  }
}

function getFilteredClubs() {
  const savedIds = getSavedClubs().map((club) => String(club.id));
  const keyword = state.keyword.trim().toLowerCase();
  const selectedCategory = normalizeCategory(state.category);

  return clubs.filter((club) => {
    const matchesType = club.type === state.type;
    const matchesScrap = state.scrapOnly ? savedIds.includes(String(club.id)) : true;
    const matchesCategory =
      selectedCategory === "ALL" ? true : normalizeCategory(club.category) === selectedCategory;

    const matchesKeyword =
      keyword.length === 0 ||
      club.name.toLowerCase().includes(keyword) ||
      club.description.toLowerCase().includes(keyword) ||
      (CATEGORY_MAP[club.category] || "").toLowerCase().includes(keyword);

    return matchesType && matchesScrap && matchesCategory && matchesKeyword;
  });
}

function createClubCard(club) {
  const statusInfo = STATUS_MAP[club.status] || {
  text: club.recruitmentStatusLabel || "모집 정보 없음",
  className: "status-unknown",
  };

  const saved = isSaved(club.id);

  const imageHtml = club.image
    ? `<img src="${club.image}" alt="${club.name} 이미지" onerror="this.style.display='none'" />`
    : "";

  return `
    <article class="club-card explore-club-card"
      data-club-id="${club.id}"
      data-club-name="${club.name}"
      data-status="${club.status}"
      data-category="${club.category}">
      <a href="./club-detail.html?clubId=${club.id}" class="explore-card-link" aria-label="${club.name} 상세보기">
        <div class="club-thumb">${imageHtml}</div>
        <div class="club-content">
          <h3>${club.name}</h3>
          <p>${club.description}</p>
        </div>
      </a>
      <div class="club-bottom explore-club-bottom">
        <em class="tag ${statusInfo.className}">${statusInfo.text}</em>
        <button type="button" class="bookmark-btn" aria-label="${club.name} ${saved ? "스크랩 취소" : "스크랩"}">
          <img src="${saved ? CHECKBOX_ON : CHECKBOX_OFF}" alt="" class="bookmark-icon" />
        </button>
      </div>
    </article>
  `;
}

function renderClubs() {
  const grid = document.querySelector("#clubGrid");
  const empty = document.querySelector("#exploreEmpty");
  const resultInfo = document.querySelector("#resultInfo");

  if (!grid || !empty || !resultInfo) return;

  const filteredClubs = getFilteredClubs();

  grid.innerHTML = filteredClubs.map(createClubCard).join("");

  empty.style.display = filteredClubs.length === 0 ? "block" : "none";

  const typeText = state.type === "CENTRAL" ? "중앙동아리" : "일반동아리";
  const scrapText = state.scrapOnly ? " · 스크랩만 보기" : "";
  const categoryText =
    state.category === "ALL" ? "" : ` · ${CATEGORY_MAP[normalizeCategory(state.category)] || ""}`;

  resultInfo.textContent = `${typeText}${categoryText}${scrapText} ${filteredClubs.length}개`;

  bindBookmarkButtons();
}

function bindBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn").forEach((button) => {
    button.onclick = async function (event) {
      event.preventDefault();
      event.stopPropagation();

      const card = button.closest(".club-card");
      const clubId = card?.dataset.clubId;
      const club = clubs.find((item) => String(item.id) === String(clubId));

      if (!clubId || !club) {
        alert("동아리 정보를 찾을 수 없습니다.");
        return;
      }

      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      if (!token) {
        alert("로그인 후 스크랩할 수 있습니다.");
        location.href = "./login.html";
        return;
      }

      button.disabled = true;

      try {
        await apiRequest(`/api/clubs/${clubId}/bookmarks`, {
          method: "POST",
        });

        let savedClubs = getSavedClubs();

        if (isSaved(clubId)) {
          savedClubs = savedClubs.filter(
            (savedClub) => String(savedClub.id) !== String(clubId)
          );
        } else {
          savedClubs.push({
            id: club.id,
            name: club.name,
            description: club.description,
            status: club.status,
            image: club.image,
            category: club.category,
            type: club.type,
          });
        }

        saveClubs(savedClubs);
        renderClubs();
      } catch (error) {
        console.error(error);
        alert(error.message || "스크랩 처리에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    };
  });
}

document.querySelectorAll(".explore-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.type = tab.dataset.type;

    document.querySelectorAll(".explore-tab").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.type === state.type);
    });

    renderClubs();
  });
});

const categoryDropdown = document.querySelector("#categoryDropdown");
const categoryBtn = document.querySelector("#categoryBtn");
const currentCategoryText = document.querySelector("#currentCategoryText");

categoryBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  categoryDropdown.classList.toggle("is-open");
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;

    document.querySelectorAll("[data-category]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.category === state.category);
    });

    const normalizedCategory = normalizeCategory(state.category);

    currentCategoryText.textContent =
      state.category === "ALL"
        ? "카테고리: 전체"
        : `카테고리: ${CATEGORY_MAP[normalizedCategory] || "기타"}`;

    categoryDropdown.classList.remove("is-open");
    renderClubs();
  });
});

document.addEventListener("click", (event) => {
  if (categoryDropdown && !categoryDropdown.contains(event.target)) {
    categoryDropdown.classList.remove("is-open");
  }
});

document.querySelector("#scrapOnlyBtn")?.addEventListener("click", () => {
  state.scrapOnly = !state.scrapOnly;
  document.querySelector("#scrapOnlyBtn").classList.toggle("is-active", state.scrapOnly);
  renderClubs();
});

document.querySelector(".explore-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  state.keyword = document.querySelector("#clubSearchInput").value;
  renderClubs();
});

document.querySelector("#clubSearchInput")?.addEventListener("input", (event) => {
  state.keyword = event.target.value;
  renderClubs();
});

initTypeFromQuery();
loadClubsFromApi();