const CHECKBOX_OFF = "./images/checkbox.svg";
const CHECKBOX_ON = "./images/checkbox-on.svg";
const STORAGE_KEY = "bookmarkedClubs";
const BOARD_STORAGE_KEY = "clubBoardPosts";

/*
  역할 확인:
  기본은 일반 회원(ROLE_STUDENT) 화면.
  운영자 화면 테스트는 브라우저 콘솔에서 아래처럼 실행:
  setUserRole("ROLE_CLUB_ADMIN")
  일반 회원으로 되돌리기:
  setUserRole("ROLE_STUDENT")

  나중에 로그인 API가 붙으면 response.data.role 값을 localStorage/sessionStorage에 저장하면 됨.
*/
function getUserRole() {
  return sessionStorage.getItem("userRole") || localStorage.getItem("userRole") || "ROLE_STUDENT";
}

function setUserRole(role) {
  localStorage.setItem("userRole", role);
  location.reload();
}

window.setUserRole = setUserRole;

const isClubAdmin = () => getUserRole() === "ROLE_CLUB_ADMIN" || getUserRole() === "ROLE_SCHOOL_ADMIN";

const club = {
  id: "1",
  name: "멋쟁이사자처럼",
  description: "전국 최대규모 IT창업동아리",
  shortDescription: "코딩으로 세상을 바꾸는 대학생 개발자 커뮤니티",
  type: "CENTRAL",
  category: "기타",
  status: "OPEN",
  image: "./images/likelion-poster.png",
};

const CATEGORY_LABELS = {
  NOTICE: "공지",
  MATERIAL: "자료",
  QUESTION: "질문",
};

const DEFAULT_BOARD_POSTS = [
  {
    id: 10,
    category: "NOTICE",
    title: "2026년 2학기 아기사자 모집",
    author: "운영진",
    date: "2026.07.08",
    views: 128,
    content:
      "안녕하세요, 멋쟁이사자처럼 을지대학교 운영진입니다!\n\n멋쟁이사자처럼에서 함께 성장할 2026년 2학기 아기사자를 모집합니다. 개발에 관심 있는 을지대학교 재학생 여러분의 많은 관심 부탁드립니다.\n\n자세한 사항은 카드뉴스를 참고해주세요!",
  },
  {
    id: 9,
    category: "QUESTION",
    title: "비전공자도 지원 가능한가요?",
    author: "이*현",
    date: "2026.07.01",
    views: 8,
    content: "비전공자도 멋쟁이사자처럼에 지원할 수 있는지 궁금합니다.",
  },
  {
    id: 8,
    category: "QUESTION",
    title: "스터디는 온라인으로 참여 가능할까요?",
    author: "박*진",
    date: "2026.06.22",
    views: 13,
    content: "정기 스터디를 온라인으로도 참여할 수 있나요?",
  },
  {
    id: 7,
    category: "NOTICE",
    title: "해커톤 참가 팀 모집 안내",
    author: "운영진",
    date: "2026.06.01",
    views: 65,
    content: "해커톤 참가 팀 모집 안내입니다. 참여를 원하는 부원은 운영진에게 문의해주세요.",
  },
  {
    id: 6,
    category: "NOTICE",
    title: "7~8월 정기 스터디 일정 안내",
    author: "운영진",
    date: "2026.06.01",
    views: 29,
    content: "7~8월 정기 스터디 일정 안내입니다.",
  },
  {
    id: 5,
    category: "QUESTION",
    title: "2학기 아기사자 모집은 언제 하나요?",
    author: "심*지",
    date: "2026.05.28",
    views: 16,
    content: "2학기 아기사자 모집 일정이 궁금합니다.",
  },
  {
    id: 4,
    category: "MATERIAL",
    title: "6~9주차 기초 스터디 자료",
    author: "운영진",
    date: "2026.05.22",
    views: 13,
    content: "6~9주차 기초 스터디 자료입니다.",
  },
  {
    id: 3,
    category: "NOTICE",
    title: "멋사 미니프로젝트 최종 자료",
    author: "운영진",
    date: "2026.05.04",
    views: 65,
    content: "멋사 미니프로젝트 최종 자료입니다.",
  },
  {
    id: 2,
    category: "MATERIAL",
    title: "1~5주차 기초 스터디 자료",
    author: "운영진",
    date: "2026.04.18",
    views: 48,
    content: "1~5주차 기초 스터디 자료입니다.",
  },
  {
    id: 1,
    category: "NOTICE",
    title: "2026년 1학기 아기사자 모집",
    author: "운영진",
    date: "2026.03.03",
    views: 221,
    content: "2026년 1학기 아기사자 모집 안내입니다.",
  },
];

let boardFilter = "ALL";
let boardKeyword = "";

function todayText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}.${month}.${date}`;
}

function getCurrentUser() {
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

function getBoardPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    return [];
  }

  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(DEFAULT_BOARD_POSTS));
  return DEFAULT_BOARD_POSTS;
}

function saveBoardPosts(posts) {
  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(posts));
}

function createBoardPost({ category, title, author, content }) {
  const posts = getBoardPosts();
  const maxId = posts.reduce((max, post) => Math.max(max, Number(post.id) || 0), 0);

  const nextPost = {
    id: maxId + 1,
    category,
    title,
    author,
    date: todayText(),
    views: 0,
    content,
  };

  posts.unshift(nextPost);
  saveBoardPosts(posts);
  return nextPost;
}

function increasePostViews(postId) {
  const posts = getBoardPosts();
  const target = posts.find((post) => String(post.id) === String(postId));

  if (!target) return null;

  target.views = (Number(target.views) || 0) + 1;
  saveBoardPosts(posts);

  return target;
}

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
  return getSavedClubs().some((savedClub) => savedClub.id === clubId);
}

function updateDetailScrapButton() {
  const button = document.querySelector("#detailScrapBtn");
  if (!button) return;

  const icon = button.querySelector("img");
  const text = button.querySelector("span");
  const saved = isSaved(club.id);

  icon.src = saved ? CHECKBOX_ON : CHECKBOX_OFF;
  text.textContent = "스크랩";
  button.classList.toggle("is-active", saved);
}

function toggleScrap() {
  let savedClubs = getSavedClubs();

  if (isSaved(club.id)) {
    savedClubs = savedClubs.filter((savedClub) => savedClub.id !== club.id);
  } else {
    savedClubs.push({
      id: club.id,
      name: club.name,
      description: club.description,
      status: club.status,
      image: club.image,
      category: "IT",
      type: club.type,
    });
  }

  saveClubs(savedClubs);
  updateDetailScrapButton();
}

function setActiveDetailTab(tabName) {
  if (tabName === "board" && !requireLogin("게시판은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?")) return;

  document.querySelectorAll("[data-detail-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.detailTab === tabName);
  });

  document.querySelectorAll("[data-detail-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.detailPanel === tabName);
  });

  if (tabName === "board") {
    showBoardList();
    renderBoardPosts();
  }
}

function getFilteredBoardPosts() {
  const keyword = boardKeyword.trim().toLowerCase();

  return getBoardPosts().filter((post) => {
    const matchesCategory = boardFilter === "ALL" ? true : post.category === boardFilter;
    const matchesKeyword =
      keyword.length === 0 ||
      post.title.toLowerCase().includes(keyword) ||
      post.author.toLowerCase().includes(keyword) ||
      CATEGORY_LABELS[post.category].toLowerCase().includes(keyword);

    return matchesCategory && matchesKeyword;
  });
}

function renderBoardPosts() {
  const tbody = document.querySelector("#boardTableBody");
  if (!tbody) return;

  const filteredPosts = getFilteredBoardPosts();

  if (filteredPosts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="board-empty-row">등록된 게시글이 없습니다.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredPosts
    .map((post, index) => {
      return `
        <tr data-post-id="${post.id}">
          <td>${filteredPosts.length - index}</td>
          <td>${CATEGORY_LABELS[post.category]}</td>
          <td><button type="button" class="post-link">${post.title}</button></td>
          <td>${post.author}</td>
          <td>${post.date}</td>
          <td>${post.views}</td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("[data-post-id]").forEach((row) => {
    row.addEventListener("click", () => {
      openPostDetail(row.dataset.postId);
    });
  });
}

function renderPostCategoryTabs() {
  const wrapper = document.querySelector("#postCategoryTabs");
  const help = document.querySelector("#categoryHelp");
  const author = document.querySelector("#postAuthor");

  if (!wrapper) return;

  const categories = isClubAdmin()
    ? [
        { value: "NOTICE", label: "공지" },
        { value: "MATERIAL", label: "자료" },
        { value: "QUESTION", label: "질문" },
      ]
    : [{ value: "QUESTION", label: "질문" }];

  wrapper.innerHTML = categories
    .map((category, index) => {
      return `
        <button type="button" class="${index === 0 ? "is-active" : ""}" data-write-category="${category.value}">
          ${category.label}
        </button>
      `;
    })
    .join("");

  if (help) {
    help.textContent = isClubAdmin() ? "" : "*일반 회원은 질문만 작성할 수 있습니다.";
  }

  if (author) {
    const user = getCurrentUser();
    author.value = isClubAdmin() ? "운영자" : user?.name || "일반회원";
  }

  wrapper.querySelectorAll("[data-write-category]").forEach((button) => {
    button.addEventListener("click", () => {
      wrapper.querySelectorAll("[data-write-category]").forEach((item) => {
        item.classList.remove("is-active");
      });
      button.classList.add("is-active");
    });
  });
}

function clearBoardForm() {
  const title = document.querySelector("#postTitle");
  const content = document.querySelector("#postContent");
  const count = document.querySelector("#postCount");

  if (title) title.value = "";
  if (content) content.value = "";
  if (count) count.textContent = "0/2000자";
}

function showBoardList() {
  document.querySelector("#boardListPanel").style.display = "block";
  document.querySelector("#boardWritePanel").style.display = "none";
  document.querySelector("#boardPostPanel").style.display = "none";
  renderBoardPosts();
}

function showWriteForm() {
  if (!requireLogin("게시글 작성은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?")) return;

  document.querySelector("#boardListPanel").style.display = "none";
  document.querySelector("#boardWritePanel").style.display = "block";
  document.querySelector("#boardPostPanel").style.display = "none";
  renderPostCategoryTabs();
}

function openPostDetail(postId) {
  const post = increasePostViews(postId);
  if (!post) return;

  document.querySelector("#postDetailTitle").textContent = post.title;
  document.querySelector("#postDetailAuthor").textContent = post.author;
  document.querySelector("#postDetailDate").textContent = post.date;
  document.querySelector("#postDetailViews").textContent = post.views;

  const postBody = document.querySelector(".post-body");
  if (postBody) {
    postBody.innerHTML = `
      <p>${String(post.content || "").replace(/\n/g, "<br />")}</p>
    `;

    if (post.category === "NOTICE") {
      postBody.innerHTML += `
        <div class="poster-large post-poster">
          <img src="./images/likelion-poster.png" alt="모집 공지 이미지" onerror="this.style.display='none'; this.parentElement.classList.add('is-empty');" />
          <p>공지 이미지를 images/likelion-poster.png로 넣으면 여기에 표시됩니다.</p>
        </div>
      `;
    }
  }

  document.querySelector("#boardListPanel").style.display = "none";
  document.querySelector("#boardWritePanel").style.display = "none";
  document.querySelector("#boardPostPanel").style.display = "block";
}

function initAdminTools() {
  const tools = document.querySelector("#adminClubTools");
  if (!tools) return;

  tools.style.display = isClubAdmin() ? "flex" : "none";

  tools.querySelectorAll("[data-admin-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.adminAction;

      if (action === "edit") {
        alert("나중에 PATCH /api/clubs/{clubId}로 동아리 정보를 수정하면 됩니다.");
      }

      if (action === "record") {
        alert("나중에 POST /api/clubs/{clubId}/records로 활동 기록을 추가하면 됩니다.");
      }

      if (action === "delete") {
        alert("나중에 DELETE /api/clubs/{clubId}로 동아리를 삭제하면 됩니다.");
      }
    });
  });
}

document.querySelectorAll("[data-detail-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveDetailTab(button.dataset.detailTab);
  });
});

document.querySelectorAll("[data-board-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    boardFilter = button.dataset.boardFilter;

    document.querySelectorAll("[data-board-filter]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.boardFilter === boardFilter);
    });

    renderBoardPosts();
  });
});

document.querySelector("#boardSearchInput")?.addEventListener("input", (event) => {
  boardKeyword = event.target.value;
  renderBoardPosts();
});

document.querySelector(".board-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderBoardPosts();
});

document.querySelector("#openWriteForm")?.addEventListener("click", showWriteForm);
document.querySelector("#closeWriteForm")?.addEventListener("click", showBoardList);
document.querySelector("#cancelWrite")?.addEventListener("click", showBoardList);
document.querySelector("#closePostDetail")?.addEventListener("click", showBoardList);
document.querySelector("#detailScrapBtn")?.addEventListener("click", toggleScrap);

document.querySelector("#postContent")?.addEventListener("input", (event) => {
  document.querySelector("#postCount").textContent = `${event.target.value.length}/2000자`;
});

document.querySelector(".board-form")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const activeCategory = document.querySelector("[data-write-category].is-active")?.dataset.writeCategory || "QUESTION";
  const title = document.querySelector("#postTitle").value.trim();
  const content = document.querySelector("#postContent").value.trim();
  const author = document.querySelector("#postAuthor").value.trim() || "익명";

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  /*
    나중에 백엔드 연결:
    POST /api/clubs/{clubId}/boards
    {
      category: activeCategory,
      title,
      content
    }
  */

  const post = createBoardPost({
    category: activeCategory,
    title,
    author,
    content,
  });

  clearBoardForm();
  boardFilter = "ALL";

  document.querySelectorAll("[data-board-filter]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.boardFilter === "ALL");
  });

  alert("게시글이 등록되었습니다.");
  showBoardList();

  // 등록한 글을 바로 확인하고 싶으면 아래 줄을 켜면 됨.
  // openPostDetail(post.id);
});

const detailApplyBtnGuard = document.querySelector(".detail-apply-btn");
detailApplyBtnGuard?.addEventListener("click", (event) => {
  if (!requireLogin("지원하기는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?")) {
    event.preventDefault();
  }
});

updateDetailScrapButton();
initAdminTools();
renderBoardPosts();
renderPostCategoryTabs();
showBoardList();
