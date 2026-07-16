const boardClubSelect = document.getElementById("boardClubSelect");
const boardCategoryFilter = document.getElementById("boardCategoryFilter");
const boardKeyword = document.getElementById("boardKeyword");
const loadPostsBtn = document.getElementById("loadPostsBtn");
const boardSummary = document.getElementById("boardSummary");
const postList = document.getElementById("postList");
const postForm = document.getElementById("postForm");
const postCategory = document.getElementById("postCategory");
const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const postDetail = document.getElementById("postDetail");

const urlParams = new URLSearchParams(location.search);
const initialClubId = urlParams.get("clubId");

function getToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function requireLogin() {
  const token = getToken();

  if (!token) {
    alert("로그인 후 이용할 수 있습니다.");
    location.href = "./login.html";
    return false;
  }

  return true;
}

function getResultData(result) {
  return result?.data ?? result ?? {};
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategoryLabel(category) {
  const labels = {
    NOTICE: "공지",
    RESOURCE: "자료",
    QUESTION: "질문",
  };

  return labels[category] || category || "게시글";
}

async function loadClubsForBoard() {
  try {
    const result = await apiRequest("/api/clubs");
    const clubs = Array.isArray(result.data) ? result.data : [];

    boardClubSelect.innerHTML = `
      <option value="">동아리를 선택하세요</option>
      ${clubs
        .map((club) => {
          const clubId = club.clubId ?? club.id;
          const clubType = club.type === "CENTRAL" ? "중앙" : "일반";

          return `
            <option value="${clubId}">
              ${escapeHtml(club.name)} (${clubType})
            </option>
          `;
        })
        .join("")}
    `;

    if (initialClubId) {
      boardClubSelect.value = initialClubId;
      if (boardClubSelect.value) {
        await loadPosts();
      }
    }
  } catch (error) {
    console.error(error);
    boardClubSelect.innerHTML = `<option value="">동아리 조회 실패</option>`;
    boardSummary.textContent = "동아리 목록을 불러오지 못했습니다.";
  }
}

function buildPostQuery() {
  const params = new URLSearchParams();

  if (boardCategoryFilter.value) {
    params.set("category", boardCategoryFilter.value);
  }

  if (boardKeyword.value.trim()) {
    params.set("keyword", boardKeyword.value.trim());
  }

  params.set("page", "0");
  params.set("size", "20");

  return params.toString();
}

async function loadPosts() {
  const clubId = boardClubSelect.value;

  if (!clubId) {
    alert("동아리를 선택해주세요.");
    return;
  }

  postDetail.classList.add("hidden");
  postList.innerHTML = `<div class="operator-api-empty">게시글을 불러오는 중입니다...</div>`;

  try {
    const query = buildPostQuery();
    const result = await apiRequest(`/api/clubs/${clubId}/posts?${query}`);
    const data = getResultData(result);
    const posts = Array.isArray(data.content) ? data.content : [];

    renderPosts(posts, data);
  } catch (error) {
    console.error(error);
    postList.innerHTML = `
      <div class="operator-api-empty error">
        게시글 목록을 불러오지 못했습니다.
      </div>
    `;
  }
}

function renderPosts(posts, pageData = {}) {
  if (!posts.length) {
    boardSummary.textContent = "조회된 게시글이 없습니다.";
    postList.innerHTML = `<div class="operator-api-empty">조회된 게시글이 없습니다.</div>`;
    return;
  }

  const total = pageData.totalElements ?? posts.length;
  boardSummary.textContent = `총 ${total}개의 게시글이 조회되었습니다.`;

  postList.innerHTML = posts
    .map(
      (post) => `
        <article class="post-api-item" data-post-id="${post.postId}">
          <div class="post-api-main">
            <span class="post-api-category">${getCategoryLabel(post.category)}</span>
            <h3>${escapeHtml(post.title || "제목 없음")}</h3>
            <p>
              ${escapeHtml(post.authorName || "작성자")}
              · ${escapeHtml(post.createdAt || "-")}
            </p>
          </div>
          <div class="post-api-meta">
            <span>조회수</span>
            <strong>${post.viewCount ?? 0}</strong>
          </div>
        </article>
      `
    )
    .join("");

  bindPostItems();
}

function bindPostItems() {
  document.querySelectorAll(".post-api-item").forEach((item) => {
    item.onclick = async function () {
      const clubId = boardClubSelect.value;
      const postId = item.dataset.postId;

      if (!clubId || !postId) return;

      await loadPostDetail(clubId, postId);
    };
  });
}

async function loadPostDetail(clubId, postId) {
  postDetail.classList.remove("hidden");
  postDetail.innerHTML = `<div class="operator-api-empty">게시글 상세를 불러오는 중입니다...</div>`;

  try {
    const result = await apiRequest(`/api/clubs/${clubId}/posts/${postId}`);
    const post = getResultData(result);

    renderPostDetail(post);
    await loadPosts();
  } catch (error) {
    console.error(error);
    postDetail.innerHTML = `
      <div class="operator-api-empty error">
        게시글 상세를 불러오지 못했습니다.
      </div>
    `;
  }
}

function renderPostDetail(post) {
  postDetail.innerHTML = `
    <div class="post-api-detail-head">
      <div>
        <span class="post-api-category">${getCategoryLabel(post.category)}</span>
        <h2>${escapeHtml(post.title || "제목 없음")}</h2>
        <p>
          ${escapeHtml(post.authorName || "작성자")}
          · ${escapeHtml(post.createdAt || "-")}
        </p>
      </div>
      <div class="post-api-meta large">
        <span>조회수</span>
        <strong>${post.viewCount ?? 0}</strong>
      </div>
    </div>

    <div class="post-api-detail-content">
      ${escapeHtml(post.content || "내용이 없습니다.").replaceAll("\n", "<br />")}
    </div>

    ${
      Array.isArray(post.attachmentUrls) && post.attachmentUrls.length > 0
        ? `
          <div class="post-api-attachments">
            <strong>첨부파일</strong>
            ${post.attachmentUrls
              .map(
                (url) => `
                  <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
                    ${escapeHtml(url)}
                  </a>
                `
              )
              .join("")}
          </div>
        `
        : ""
    }
  `;
}

async function createPost(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const clubId = boardClubSelect.value;

  if (!clubId) {
    alert("동아리를 먼저 선택해주세요.");
    return;
  }

  const title = postTitle.value.trim();
  const content = postContent.value.trim();

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  const submitButton = postForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    await apiRequest(`/api/clubs/${clubId}/posts`, {
      method: "POST",
      body: {
        category: postCategory.value,
        status: "PUBLISHED",
        title,
        content,
        attachmentUrls: [],
      },
    });

    alert("게시글이 등록되었습니다.");
    postForm.reset();
    postCategory.value = "NOTICE";
    await loadPosts();
  } catch (error) {
    console.error(error);
    alert(error.message || "게시글 등록에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
}

loadPostsBtn.addEventListener("click", loadPosts);

boardClubSelect.addEventListener("change", () => {
  if (boardClubSelect.value) {
    loadPosts();
  }
});

boardCategoryFilter.addEventListener("change", () => {
  if (boardClubSelect.value) {
    loadPosts();
  }
});

boardKeyword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadPosts();
  }
});

postForm.addEventListener("submit", createPost);

async function initBoardPage() {
  if (typeof apiRequest !== "function") {
    boardSummary.textContent = "api.js가 연결되지 않았습니다.";
    return;
  }

  await loadClubsForBoard();
}

initBoardPage();
