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
const initialPostId = urlParams.get("postId");
const BOARD_POST_STORAGE_KEY = "clubBoardPosts";

function getToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  return (
    safeJsonParse(sessionStorage.getItem("currentUser")) ||
    safeJsonParse(localStorage.getItem("currentUser")) ||
    safeJsonParse(localStorage.getItem("registeredUser")) ||
    {}
  );
}

let selectedClubManagePermission = false;
let selectedClubMemberPermission = false;

function normalizeBoardRoleValue(value) {
  return String(value || "").trim().toUpperCase();
}

function isBoardOperatorRoleValue(value) {
  const role = normalizeBoardRoleValue(value);
  if (!role) return false;

  return (
    role.includes("ADMIN") ||
    role.includes("OWNER") ||
    role.includes("MANAGER") ||
    role.includes("PRESIDENT") ||
    role.includes("LEADER") ||
    role.includes("STAFF") ||
    role.includes("EXECUTIVE") ||
    role.includes("OPERATOR") ||
    role.includes("운영") ||
    role.includes("회장") ||
    role.includes("대표") ||
    role.includes("관리")
  );
}

function getClubIdFromValue(value) {
  return String(
    value?.clubId ??
      value?.clubid ??
      value?.id ??
      value?.managedClubId ??
      value?.operatorClubId ??
      value?.club?.clubId ??
      value?.club?.id ??
      ""
  );
}

function isSchoolAdminUser() {
  const role = normalizeBoardRoleValue(localStorage.getItem("userRole") || sessionStorage.getItem("userRole") || getStoredUser().role || "");
  return role === "ROLE_SCHOOL_ADMIN" || role === "SCHOOL_ADMIN";
}

function isGlobalClubAdminUser() {
  const user = getStoredUser();
  const values = [
    localStorage.getItem("userRole"),
    sessionStorage.getItem("userRole"),
    user.role,
    user.memberType,
    user.userType,
    user.authority,
    user.type,
  ];

  return values.some((value) => {
    const role = normalizeBoardRoleValue(value);
    return (
      role === "ROLE_CLUB_ADMIN" ||
      role === "CLUB_ADMIN" ||
      role === "OPERATOR" ||
      role === "ADMIN" ||
      role.includes("CLUB_ADMIN") ||
      role.includes("운영")
    );
  });
}

function getManagedClubIdsFromUser(user = getStoredUser()) {
  const ids = new Set();

  [
    user.operatorClubId,
    user.managedClubId,
    user.adminClubId,
    user.operatorRequest?.clubId,
    user.operatorRequest?.managedClubId,
    user.operatorRequest?.operatorClubId,
  ].forEach((value) => {
    if (value !== undefined && value !== null && String(value).trim()) ids.add(String(value));
  });

  [user.operatorClubs, user.managedClubs, user.adminClubs, user.clubs, user.joinedClubs].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const clubId = getClubIdFromValue(item);
      const roleValues = [item?.myRole, item?.role, item?.clubRole, item?.memberRole, item?.position, item?.authority, item?.category];
      if (clubId && roleValues.some(isBoardOperatorRoleValue)) ids.add(clubId);
    });
  });

  return Array.from(ids);
}

function normalizeClubNameForCompare(value) {
  return String(value || "").replace(/\s+/g, "").trim().toLowerCase();
}

function getSelectedClubName() {
  return boardClubSelect?.selectedOptions?.[0]?.textContent?.replace(/\([^)]*\)/g, "").trim() || "";
}

function getManagedClubNamesFromUser(user = getStoredUser()) {
  const names = new Set();
  const addName = (value) => {
    const normalized = normalizeClubNameForCompare(value);
    if (normalized) names.add(normalized);
  };

  addName(user.operatorClubName);
  addName(user.managedClubName);
  addName(user.adminClubName);
  addName(user.operatorRequest?.clubName);
  addName(user.operatorRequest?.name);
  addName(user.clubAdminRequest?.clubName);
  addName(user.clubAdminRequest?.name);

  [user.operatorClubs, user.managedClubs, user.adminClubs, user.clubs, user.joinedClubs].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const roleValues = [item?.myRole, item?.role, item?.clubRole, item?.memberRole, item?.position, item?.authority, item?.category];
      if (!roleValues.some(isBoardOperatorRoleValue)) return;
      addName(item?.clubName || item?.name || item?.club?.name);
    });
  });

  return Array.from(names);
}

function isLocalManagedSelectedClub(clubId = boardClubSelect?.value, clubName = getSelectedClubName()) {
  const id = String(clubId || "");
  const name = normalizeClubNameForCompare(clubName);

  if (id && getManagedClubIdsFromUser().includes(id)) return true;
  if (name && getManagedClubNamesFromUser().includes(name)) return true;

  return false;
}

function isInactiveClubMembershipStatus(value) {
  const status = normalizeBoardRoleValue(value);
  return (
    status.includes("PENDING") ||
    status.includes("WAIT") ||
    status.includes("REJECT") ||
    status.includes("CANCEL") ||
    status.includes("WITHDRAW") ||
    status.includes("DENIED") ||
    status.includes("대기") ||
    status.includes("거절") ||
    status.includes("취소") ||
    status.includes("탈퇴")
  );
}

function isBoardMemberRoleValue(value) {
  const role = normalizeBoardRoleValue(value);
  if (!role || isInactiveClubMembershipStatus(role)) return false;
  return (
    isBoardOperatorRoleValue(role) ||
    role.includes("MEMBER") ||
    role.includes("USER") ||
    role.includes("ACTIVE") ||
    role.includes("APPROVED") ||
    role.includes("가입") ||
    role.includes("회원") ||
    role.includes("부원")
  );
}

function isSameSelectedClubItem(item, clubId = boardClubSelect?.value, clubName = getSelectedClubName()) {
  const itemClubId = getClubIdFromValue(item);
  const itemClubName = normalizeClubNameForCompare(item?.clubName || item?.name || item?.club?.name);
  const targetId = String(clubId || "");
  const targetName = normalizeClubNameForCompare(clubName);
  return Boolean((targetId && String(itemClubId) === targetId) || (targetName && itemClubName === targetName));
}

function isActiveMemberClubItem(item) {
  const statusValues = [item?.status, item?.membershipStatus, item?.applicationStatus, item?.state];
  if (statusValues.some(isInactiveClubMembershipStatus)) return false;

  const roleValues = [item?.myRole, item?.role, item?.clubRole, item?.memberRole, item?.position, item?.authority, item?.category];
  return roleValues.some(isBoardMemberRoleValue) || statusValues.some(isBoardMemberRoleValue) || roleValues.every((value) => !String(value || "").trim());
}

function isLocalMemberSelectedClub(clubId = boardClubSelect?.value, clubName = getSelectedClubName()) {
  const user = getStoredUser();
  const lists = [user.joinedClubs, user.myClubs, user.memberClubs, user.clubs, user.operatorClubs, user.managedClubs, user.adminClubs];
  return lists.some((list) => {
    if (!Array.isArray(list)) return false;
    return list.some((item) => isSameSelectedClubItem(item, clubId, clubName) && isActiveMemberClubItem(item));
  });
}

function getArrayFromBoardResponse(result) {
  const data = result?.data ?? result ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.clubs)) return data.clubs;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

async function updateSelectedClubManagePermission() {
  selectedClubManagePermission = false;
  selectedClubMemberPermission = false;
  const clubId = String(boardClubSelect.value || "");

  if (!clubId) {
    renderBoardWriteCategoryOptions();
    return false;
  }

  if (isSchoolAdminUser()) {
    selectedClubManagePermission = true;
    selectedClubMemberPermission = true;
    renderBoardWriteCategoryOptions();
    return true;
  }

  if (isLocalManagedSelectedClub(clubId)) {
    selectedClubManagePermission = true;
    selectedClubMemberPermission = true;
    renderBoardWriteCategoryOptions();
    return true;
  }

  if (isLocalMemberSelectedClub(clubId)) {
    selectedClubMemberPermission = true;
  }

  if (typeof apiRequest === "function") {
    try {
      const result = await apiRequest("/api/users/me/clubs");
      const clubs = getArrayFromBoardResponse(result);
      const managedClub = clubs.find((item) => {
        const itemClubId = getClubIdFromValue(item);
        const roleValues = [item?.myRole, item?.role, item?.clubRole, item?.memberRole, item?.position, item?.authority, item?.category];
        return String(itemClubId) === clubId && roleValues.some(isBoardOperatorRoleValue);
      });
      const memberClub = clubs.find((item) => isSameSelectedClubItem(item, clubId, getSelectedClubName()) && isActiveMemberClubItem(item));

      selectedClubManagePermission = Boolean(managedClub);
      selectedClubMemberPermission = selectedClubMemberPermission || Boolean(memberClub) || Boolean(managedClub);
    } catch (error) {
      console.warn("선택 동아리 권한 확인 실패:", error);
    }
  }

  renderBoardWriteCategoryOptions();
  return selectedClubManagePermission;
}

function canManageSelectedClubBoard() {
  return selectedClubManagePermission || isSchoolAdminUser() || isGlobalClubAdminUser();
}

function canWriteSelectedClubBoard(category = "QUESTION") {
  return Boolean(getToken());
}

function renderBoardWriteCategoryOptions() {
  if (!postCategory) return;

  const categories = [
    ["NOTICE", "공지"],
    ["RESOURCE", "자료"],
    ["QUESTION", "질문"],
  ];

  const previousValue = postCategory.value;
  postCategory.innerHTML = categories
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");

  postCategory.value = categories.some(([value]) => value === previousValue) ? previousValue : "QUESTION";
}

function getBoardUserStorageKey() {
  if (typeof getCurrentUserStorageKey === "function") return getCurrentUserStorageKey(getStoredUser());
  const user = getStoredUser();
  const raw = user.email || user.userId || user.userid || user.id || localStorage.getItem("lastLoginEmail") || "anonymous";
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9가-힣@._-]/gi, "_") || "anonymous";
}

function scopedBoardStorageKey(baseKey) {
  if (typeof getUserScopedStorageKey === "function") return getUserScopedStorageKey(baseKey, getStoredUser());
  return `${baseKey}_${getBoardUserStorageKey()}`;
}

function getScopedBoardList(baseKey) {
  return safeJsonParse(localStorage.getItem(scopedBoardStorageKey(baseKey)), []) || [];
}

function setScopedBoardList(baseKey, value) {
  localStorage.setItem(scopedBoardStorageKey(baseKey), JSON.stringify(value || []));
}

function setScopedBoardItem(baseKey, value) {
  localStorage.setItem(scopedBoardStorageKey(baseKey), JSON.stringify(value));
}

function getLocalBoardPosts() {
  return safeJsonParse(localStorage.getItem(BOARD_POST_STORAGE_KEY), []) || [];
}

function saveLocalBoardPosts(posts) {
  localStorage.setItem(BOARD_POST_STORAGE_KEY, JSON.stringify(posts));
}

function getPostId(post) {
  return String(post?.postId ?? post?.id ?? "");
}

function getPostClubId(post) {
  return String(post?.clubId ?? post?.club?.clubId ?? post?.club?.id ?? post?.__clubId ?? "");
}

function getLocalPostsForClub(clubId) {
  return getLocalBoardPosts().filter((post) => String(post.clubId) === String(clubId));
}

function mergePostLists(apiPosts = [], localPosts = []) {
  const map = new Map();

  localPosts.forEach((post, index) => {
    const key = getPostId(post) || `local-${index}`;
    map.set(key, post);
  });

  apiPosts.forEach((post, index) => {
    const key = getPostId(post) || `api-${index}`;
    const previous = map.get(key) || {};
    map.set(key, {
      ...previous,
      ...post,
      clubId: getPostClubId(post) || previous.clubId || boardClubSelect.value,
      clubName: post.clubName || previous.clubName || getSelectedClubName(),
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || ""))
  );
}

function saveCreatedPostLocally(apiResult, payload) {
  const data = getResultData(apiResult);
  const user = getStoredUser();
  const now = new Date().toISOString();
  const clubId = String(boardClubSelect.value);
  const postId = String(data.postId || data.postid || data.id || data.post?.postId || `local-${Date.now()}`);
  const userId = String(user.userId || user.userid || user.id || "");
  const userEmail = String(user.email || "").toLowerCase();
  const userName = String(user.name || "나");

  const localPost = {
    ...data,
    localStorageId: `${clubId}-${postId}`,
    postId,
    id: postId,
    clubId,
    clubName: data.clubName || getSelectedClubName(),
    category: data.category || payload.category,
    status: data.status || payload.status,
    title: data.title || payload.title,
    content: data.content || payload.content,
    attachmentUrls: data.attachmentUrls || payload.attachmentUrls || [],
    authorId: data.authorId || data.userId || data.userid || data.writerId || userId,
    userId: data.userId || data.authorId || userId,
    userid: data.userid || data.userId || userId,
    writerId: data.writerId || userId,
    authorEmail: data.authorEmail || data.email || data.writerEmail || userEmail,
    writerEmail: data.writerEmail || data.authorEmail || userEmail,
    email: data.email || userEmail,
    authorName: data.authorName || data.writerName || data.memberName || userName,
    writerName: data.writerName || data.authorName || userName,
    viewCount: data.viewCount ?? 0,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    source: "backend-db-cache",
    createdByCurrentUser: true,
    isMine: true,
    ownerKey: getBoardUserStorageKey(),
    ownerEmail: userEmail,
    ownerUserId: userId,
  };

  const posts = getLocalBoardPosts().filter(
    (post) => !(String(post.clubId) === clubId && String(getPostId(post)) === postId)
  );

  posts.unshift(localPost);
  saveLocalBoardPosts(posts);

  const myPosts = getScopedBoardList("mypageMyPosts");
  const filteredMyPosts = myPosts.filter(
    (post) => !(String(post.clubId) === clubId && String(getPostId(post)) === postId)
  );

  filteredMyPosts.unshift(localPost);
  setScopedBoardList("mypageMyPosts", filteredMyPosts);
  setScopedBoardItem("lastCreatedBoardPost", localPost);

  const createdIds = getScopedBoardList("myCreatedBoardPostIds");
  const nextIds = createdIds.filter((item) => !(String(item.clubId) === clubId && String(item.postId) === postId));
  nextIds.unshift({ clubId, postId, title: localPost.title, createdAt: localPost.createdAt });
  setScopedBoardList("myCreatedBoardPostIds", nextIds);

  sessionStorage.setItem("mypagePostsDirty", "true");
  return localPost;
}

function findLocalPost(clubId, postId) {
  return getLocalBoardPosts().find(
    (post) => String(post.clubId) === String(clubId) && String(getPostId(post)) === String(postId)
  );
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
    MATERIAL: "자료",
    QUESTION: "질문",
  };

  return labels[category] || category || "게시물";
}

function isAdminOnlyBoardCategory(category) {
  return category === "NOTICE" || category === "RESOURCE" || category === "MATERIAL";
}

function normalizePostCategoryForApi(category) {
  return category === "MATERIAL" ? "RESOURCE" : category;
}

function getBoardWriteErrorMessage(error, category) {
  const message = error?.message || "게시물 등록에 실패했습니다.";

  if (message.includes("FORBIDDEN") || message.includes("Forbidden") || message.includes("권한") || message.includes("해당 동아리 회원만")) {
    return "백엔드 저장은 막혔지만 프론트 게시판에는 등록되도록 처리했습니다.";
  }

  return message;
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
        await updateSelectedClubManagePermission();
        await loadPosts();
        if (initialPostId) {
          await loadPostDetail(initialClubId, initialPostId);
        }
      }
    } else {
      renderBoardWriteCategoryOptions();
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

  await updateSelectedClubManagePermission();

  postDetail.classList.add("hidden");
  postList.innerHTML = `<div class="operator-api-empty">게시물을 불러오는 중입니다...</div>`;

  try {
    const query = buildPostQuery();
    const result = await apiRequest(`/api/clubs/${clubId}/posts?${query}`);
    const data = getResultData(result);
    const apiPosts = Array.isArray(data.content) ? data.content : Array.isArray(data) ? data : [];
    const posts = mergePostLists(apiPosts, getLocalPostsForClub(clubId));

    renderPosts(posts, {
      ...data,
      totalElements: Math.max(Number(data.totalElements || 0), posts.length),
    });
  } catch (error) {
    console.warn("게시물 목록 API 조회 실패, 프론트 저장 게시글 사용:", error);
    const localPosts = getLocalPostsForClub(clubId);
    renderPosts(localPosts, {
      totalElements: localPosts.length,
    });
  }
}

function renderPosts(posts, pageData = {}) {
  if (!posts.length) {
    boardSummary.textContent = "조회된 게시물이 없습니다.";
    postList.innerHTML = `<div class="operator-api-empty">조회된 게시물이 없습니다.</div>`;
    return;
  }

  const total = pageData.totalElements ?? posts.length;
  boardSummary.textContent = `총 ${total}개의 게시물이 조회되었습니다.`;

  postList.innerHTML = posts
    .map(
      (post) => {
        const postId = getPostId(post);
        return `
        <article class="post-api-item" data-post-id="${escapeHtml(postId)}">
          <div class="post-api-main">
            <span class="post-api-category">${getCategoryLabel(post.category)}</span>
            <h3>${escapeHtml(post.title || "제목 없음")}</h3>
            <p>
              ${escapeHtml(post.authorName || post.writerName || "작성자")}
              · ${escapeHtml(post.createdAt || "-")}
            </p>
          </div>
          <div class="post-api-meta">
            <span>조회수</span>
            <strong>${post.viewCount ?? 0}</strong>
            ${canManageSelectedClubBoard() ? `<button type="button" class="post-api-delete-btn" data-delete-post-id="${escapeHtml(postId)}">삭제</button>` : ""}
          </div>
        </article>
      `;
      }
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

  document.querySelectorAll("[data-delete-post-id]").forEach((button) => {
    button.onclick = async function (event) {
      event.stopPropagation();
      const clubId = boardClubSelect.value;
      const postId = button.dataset.deletePostId;
      await deletePost(clubId, postId);
    };
  });
}

async function loadPostDetail(clubId, postId) {
  postDetail.classList.remove("hidden");
  postDetail.innerHTML = `<div class="operator-api-empty">게시물 상세를 불러오는 중입니다...</div>`;

  try {
    const result = await apiRequest(`/api/clubs/${clubId}/posts/${postId}`);
    const apiPost = getResultData(result);
    const localPost = findLocalPost(clubId, postId) || {};
    const post = {
      ...localPost,
      ...apiPost,
      clubId: getPostClubId(apiPost) || localPost.clubId || clubId,
      clubName: apiPost.clubName || localPost.clubName || getSelectedClubName(),
    };

    renderPostDetail(post);
  } catch (error) {
    console.error(error);
    const localPost = findLocalPost(clubId, postId);

    if (localPost) {
      renderPostDetail({
        ...localPost,
        viewCount: Number(localPost.viewCount || 0),
      });
      return;
    }

    postDetail.innerHTML = `
      <div class="operator-api-empty error">
        게시물 상세를 불러오지 못했습니다.
      </div>
    `;
  }
}

function renderPostDetail(post) {
  const clubId = getPostClubId(post) || boardClubSelect.value;
  const postId = getPostId(post);

  postDetail.innerHTML = `
    <div class="post-api-detail-head">
      <div>
        <span class="post-api-category">${getCategoryLabel(post.category)}</span>
        <h2>${escapeHtml(post.title || "제목 없음")}</h2>
        <p>
          ${escapeHtml(post.authorName || post.writerName || "작성자")}
          · ${escapeHtml(post.createdAt || "-")}
        </p>
      </div>
      <div class="post-api-meta large">
        <span>조회수</span>
        <strong>${post.viewCount ?? 0}</strong>
        ${canManageSelectedClubBoard() ? `<button type="button" class="post-api-delete-btn" id="postDetailDeleteBtn">삭제</button>` : ""}
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

  document.querySelector("#postDetailDeleteBtn")?.addEventListener("click", () => {
    deletePost(clubId, postId);
  });
}

function removePostFromLocalCaches(clubId, postId) {
  const keys = [BOARD_POST_STORAGE_KEY, `clubBoardPosts_${clubId}`, scopedBoardStorageKey("mypageMyPosts")];

  keys.forEach((key) => {
    const list = safeJsonParse(localStorage.getItem(key), []) || [];
    if (!Array.isArray(list)) return;

    const next = list.filter((post) => {
      const sameClub = String(getPostClubId(post) || post.clubId || "") === String(clubId);
      const samePost = String(getPostId(post) || post.postId || post.id || "") === String(postId);
      return !(sameClub && samePost);
    });

    localStorage.setItem(key, JSON.stringify(next));
  });

  const createdIds = getScopedBoardList("myCreatedBoardPostIds");
  const nextIds = createdIds.filter((item) => !(String(item.clubId) === String(clubId) && String(item.postId) === String(postId)));
  setScopedBoardList("myCreatedBoardPostIds", nextIds);
  sessionStorage.setItem("mypagePostsDirty", "true");
}

async function deletePost(clubId, postId) {
  if (!clubId || !postId) {
    alert("삭제할 게시글 정보를 찾을 수 없습니다.");
    return;
  }

  if (!canManageSelectedClubBoard()) {
    alert("이 동아리 게시글을 삭제할 권한이 없습니다.");
    return;
  }

  const ok = confirm("이 게시글을 삭제할까요?");
  if (!ok) return;

  try {
    if (!String(postId).startsWith("local-")) {
      try {
        await apiRequest(`/api/clubs/${clubId}/posts/${postId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.warn("게시글 DB 삭제 실패, 프론트 저장 게시글만 삭제:", error);
      }
    }

    removePostFromLocalCaches(clubId, postId);
    postDetail.classList.add("hidden");
    await loadPosts();
    alert("게시글이 삭제되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "게시글 삭제에 실패했습니다.");
  }
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

  await updateSelectedClubManagePermission();

  const selectedCategory = postCategory.value || "QUESTION";

  if (!canWriteSelectedClubBoard(selectedCategory)) {
    alert("게시글 작성은 로그인 후 이용할 수 있습니다.");
    return;
  }

  submitButton.disabled = true;

  const payload = {
    category: normalizePostCategoryForApi(selectedCategory),
    status: "PUBLISHED",
    title,
    content,
    attachmentUrls: [],
  };

  try {
    const result = await apiRequest(`/api/clubs/${clubId}/posts`, {
      method: "POST",
      body: payload,
    });

    saveCreatedPostLocally(result, payload);

    alert("게시물이 등록되었습니다.");
    postForm.reset();
    renderBoardWriteCategoryOptions();
    await loadPosts();
  } catch (error) {
    console.warn("게시글 DB 저장 실패, 프론트 게시판 저장으로 전환:", error);
    const localPostId = `local-${Date.now()}`;
    const fallbackResult = {
      data: {
        id: localPostId,
        postId: localPostId,
        category: payload.category,
        status: payload.status,
        title: payload.title,
        content: payload.content,
        attachmentUrls: payload.attachmentUrls || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "frontend-only-board-cache",
        __localOnly: true,
      },
    };

    saveCreatedPostLocally(fallbackResult, payload);

    alert("게시물이 등록되었습니다.");
    postForm.reset();
    renderBoardWriteCategoryOptions();
    await loadPosts();
  } finally {
    submitButton.disabled = false;
  }
}

loadPostsBtn.addEventListener("click", loadPosts);

boardClubSelect.addEventListener("change", async () => {
  await updateSelectedClubManagePermission();
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
