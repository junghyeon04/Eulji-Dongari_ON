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
};

const CATEGORY_MAP = {
  RELIGION: "종교",
  PERFORMANCE: "문화/예술/공연",
  SOCIAL: "친목",
  VOLUNTEER: "봉사",
  SPORTS: "체육",
  IT: "IT/창업",
  MUSIC: "음악",
  DANCE: "댄스",
  MEDIA: "방송/언론",
  ETC: "기타",
};

/*
  백엔드 연결 전 임시 데이터.
  나중에는 GET /api/clubs?type=CENTRAL&keyword=... 응답으로 대체하면 됨.
*/
const clubs = [
  {
    id: "1",
    name: "멋쟁이사자처럼",
    type: "CENTRAL",
    category: "IT",
    description: "전국 최대규모 IT창업동아리",
    status: "OPEN",
    image: "./images/likelion-poster.png",
  },
  {
    id: "2",
    name: "DNG",
    type: "CENTRAL",
    category: "DANCE",
    description: "열정 넘치는 사람들이 모인 댄스동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "3",
    name: "새밝소리",
    type: "CENTRAL",
    category: "MUSIC",
    description: "깡과 의리로 뭉친 새밝소리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "4",
    name: "LUNATIC+",
    type: "CENTRAL",
    category: "PERFORMANCE",
    description: "무대 위를 빛내는 연극/뮤지컬 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "9",
    name: "CAM",
    type: "CENTRAL",
    category: "RELIGION",
    description: "기독교 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "10",
    name: "을지 FC",
    type: "CENTRAL",
    category: "SPORTS",
    description: "축구 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "11",
    name: "호크",
    type: "CENTRAL",
    category: "SPORTS",
    description: "농구 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "12",
    name: "CCC",
    type: "CENTRAL",
    category: "RELIGION",
    description: "기독교 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "13",
    name: "킥오프",
    type: "CENTRAL",
    category: "SPORTS",
    description: "축구 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "14",
    name: "천유",
    type: "CENTRAL",
    category: "PERFORMANCE",
    description: "응원단 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "15",
    name: "오리자",
    type: "CENTRAL",
    category: "VOLUNTEER",
    description: "봉사 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "16",
    name: "EUBS",
    type: "CENTRAL",
    category: "MEDIA",
    description: "방송 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "17",
    name: "찰래말래",
    type: "CENTRAL",
    category: "SPORTS",
    description: "풋살 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "18",
    name: "라이머스",
    type: "CENTRAL",
    category: "MUSIC",
    description: "음악 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "19",
    name: "RCY",
    type: "CENTRAL",
    category: "VOLUNTEER",
    description: "적십자사에서 운영하는 봉사 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "20",
    name: "SHALOM",
    type: "CENTRAL",
    category: "RELIGION",
    description: "기독교 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "21",
    name: "스매싱",
    type: "CENTRAL",
    category: "SPORTS",
    description: "탁구 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "22",
    name: "오션홀릭",
    type: "CENTRAL",
    category: "SPORTS",
    description: "스쿠버다이빙 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "23",
    name: "아굿",
    type: "CENTRAL",
    category: "VOLUNTEER",
    description: "봉사 동아리",
    status: "CLOSED",
    image: "",
  },
  {
    id: "5",
    name: "FLASH",
    type: "GENERAL",
    category: "PERFORMANCE",
    description: "사진동아리 F.L.A.S.H",
    status: "ALWAYS",
    image: "./images/flash-poster.png",
  },
  {
    id: "6",
    name: "야구의 숲",
    type: "GENERAL",
    category: "SPORTS",
    description: "을지대 유일무이 야구동아리",
    status: "ALWAYS",
    image: "",
  },
  {
    id: "7",
    name: "00",
    type: "GENERAL",
    category: "ETC",
    description: "00",
    status: "CLOSED",
    image: "",
  },
  {
    id: "8",
    name: "11",
    type: "GENERAL",
    category: "ETC",
    description: "11",
    status: "CLOSED",
    image: "",
  },
];

const state = {
  type: "CENTRAL",
  keyword: "",
  category: "ALL",
  scrapOnly: false,
};

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
  return getSavedClubs().some((club) => club.id === clubId);
}

function initTypeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");

  if (type === "GENERAL" || type === "CENTRAL") {
    state.type = type;
  }

  document.querySelectorAll(".explore-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.type === state.type);
  });
}

function getFilteredClubs() {
  const savedIds = getSavedClubs().map((club) => club.id);
  const keyword = state.keyword.trim().toLowerCase();

  return clubs.filter((club) => {
    const matchesType = club.type === state.type;
    const matchesScrap = state.scrapOnly ? savedIds.includes(club.id) : true;
    const matchesCategory = state.category === "ALL" ? true : club.category === state.category;
    const matchesKeyword =
      keyword.length === 0 ||
      club.name.toLowerCase().includes(keyword) ||
      club.description.toLowerCase().includes(keyword) ||
      (CATEGORY_MAP[club.category] || "").toLowerCase().includes(keyword);

    return matchesType && matchesScrap && matchesCategory && matchesKeyword;
  });
}

function createClubCard(club) {
  const statusInfo = STATUS_MAP[club.status] || STATUS_MAP.CLOSED;
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
  const filteredClubs = getFilteredClubs();

  grid.innerHTML = filteredClubs.map(createClubCard).join("");

  empty.style.display = filteredClubs.length === 0 ? "block" : "none";

  const typeText = state.type === "CENTRAL" ? "중앙동아리" : "일반동아리";
  const scrapText = state.scrapOnly ? " · 스크랩만 보기" : "";
  const categoryText = state.category === "ALL" ? "" : ` · ${CATEGORY_MAP[state.category]}`;
  resultInfo.textContent = `${typeText}${categoryText}${scrapText} ${filteredClubs.length}개`;

  bindBookmarkButtons();
}

function bindBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".club-card");
      const clubId = card.dataset.clubId;
      const club = clubs.find((item) => item.id === clubId);
      let savedClubs = getSavedClubs();

      if (isSaved(clubId)) {
        savedClubs = savedClubs.filter((savedClub) => savedClub.id !== clubId);
      } else if (club) {
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
    });
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

categoryBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  categoryDropdown.classList.toggle("is-open");
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;

    document.querySelectorAll("[data-category]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.category === state.category);
    });

    currentCategoryText.textContent =
      state.category === "ALL" ? "카테고리: 전체" : `카테고리: ${CATEGORY_MAP[state.category]}`;

    categoryDropdown.classList.remove("is-open");
    renderClubs();
  });
});

document.addEventListener("click", (event) => {
  if (!categoryDropdown.contains(event.target)) {
    categoryDropdown.classList.remove("is-open");
  }
});

document.querySelector("#scrapOnlyBtn").addEventListener("click", () => {
  state.scrapOnly = !state.scrapOnly;
  document.querySelector("#scrapOnlyBtn").classList.toggle("is-active", state.scrapOnly);
  renderClubs();
});

document.querySelector(".explore-search").addEventListener("submit", (event) => {
  event.preventDefault();
  state.keyword = document.querySelector("#clubSearchInput").value;
  renderClubs();
});

document.querySelector("#clubSearchInput").addEventListener("input", (event) => {
  state.keyword = event.target.value;
  renderClubs();
});

initTypeFromQuery();
renderClubs();
