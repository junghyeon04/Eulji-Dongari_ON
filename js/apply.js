function getCurrentUserForApply() {
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

async function loadCurrentUserForApply() {
  if (!isLoggedIn()) return getCurrentUserForApply();

  try {
    const result = await apiRequest("/api/users/me");
    const user = {
      userId: result.data?.userId || result.data?.userid || "",
      email: result.data?.email || "",
      name: result.data?.name || "",
      studentId: result.data?.studentId || result.data?.studentid || "",
      department: result.data?.department || "",
      role: result.data?.role || "ROLE_STUDENT",
      createdAt: result.data?.createdAt || "",
    };

    const storage = localStorage.getItem("authToken") ? localStorage : sessionStorage;
    storage.setItem("currentUser", JSON.stringify(user));
    storage.setItem("userRole", user.role);
    localStorage.setItem("registeredUser", JSON.stringify(user));

    return user;
  } catch (error) {
    console.warn("내 정보 조회 실패:", error);
    return getCurrentUserForApply();
  }
}

function fillApplicantFromUser(user) {
  if (!user) return;

  const nameInput = document.querySelector("#applicantName");
  const studentIdInput = document.querySelector("#applicantStudentId");
  const departmentInput = document.querySelector("#applicantDepartment");

  if (nameInput) nameInput.value = user.name || "";
  if (studentIdInput) studentIdInput.value = user.studentId || user.studentid || "";
  if (departmentInput) departmentInput.value = user.department || "";
}

const APPLY_STORAGE_KEY = "bookmarkedClubs";

const APPLY_STATUS_MAP = {
  OPEN: "모집 중",
  CLOSED: "모집 종료",
  ALWAYS: "상시 모집",
  ALWAYS_OPEN: "상시 모집",
  UNKNOWN: "모집 정보 없음",
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

let applyClubs = [];

const applyState = {
  type: "",
  keyword: "",
  status: "",
  scrapOnly: false,
  selectedClubId: null,
};

function getSavedClubs() {
  try {
    return JSON.parse(localStorage.getItem(APPLY_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function isSavedClub(clubId) {
  return getSavedClubs().some((club) => String(club.id) === String(clubId));
}

function convertClubFromApi(apiClub) {
  const recruitmentStatus = apiClub.recruitmentStatus || "UNKNOWN";

  return {
    id: String(apiClub.clubId),
    name: apiClub.name || "",
    type: apiClub.type || "",
    description: apiClub.shortDescription || "",
    status: recruitmentStatus,
    statusLabel: apiClub.recruitmentStatusLabel || APPLY_STATUS_MAP[recruitmentStatus] || "모집 정보 없음",
    image: apiClub.imageUrl || LOCAL_CLUB_IMAGES[apiClub.name] || "",
    isRecruiting: Boolean(apiClub.isRecruiting),
  };
}

async function loadApplyClubs() {
  const list = document.querySelector("#applyClubList");

  try {
    if (list) {
      list.innerHTML = `<div class="mypage-empty-line">동아리 목록을 불러오는 중...</div>`;
    }

    const result = await apiRequest("/api/clubs");
    applyClubs = (result.data || []).map(convertClubFromApi);
    renderApplyClubs();
  } catch (error) {
    console.error(error);
    if (list) {
      list.innerHTML = `<div class="mypage-empty-line">동아리 목록을 불러오지 못했습니다.</div>`;
    }
  }
}

function getFilteredApplyClubs() {
  const keyword = applyState.keyword.trim().toLowerCase();

  return applyClubs.filter((club) => {
    const matchesType = applyState.type ? club.type === applyState.type : true;
    const matchesKeyword =
      keyword.length === 0 ||
      club.name.toLowerCase().includes(keyword) ||
      club.description.toLowerCase().includes(keyword);
    const matchesStatus = applyState.status ? club.status === applyState.status : true;
    const matchesScrap = applyState.scrapOnly ? isSavedClub(club.id) : true;

    return matchesType && matchesKeyword && matchesStatus && matchesScrap;
  });
}

function renderApplyClubs() {
  const list = document.querySelector("#applyClubList");
  if (!list) return;

  const filteredClubs = getFilteredApplyClubs();

  if (filteredClubs.length === 0) {
    list.innerHTML = `<div class="mypage-empty-line">조건에 맞는 동아리가 없습니다.</div>`;
    return;
  }

  list.innerHTML = filteredClubs
    .map((club) => {
      return `
        <button type="button" class="apply-club-card ${applyState.selectedClubId === club.id ? "is-active" : ""}" data-apply-club-id="${club.id}">
          <strong>${club.name}</strong>
          <span>${club.description}</span>
          <em>${club.statusLabel || APPLY_STATUS_MAP[club.status] || "모집 정보 없음"}</em>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll("[data-apply-club-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectApplyClub(button.dataset.applyClubId);
    });
  });
}

function selectApplyClub(clubId) {
  const club = applyClubs.find((item) => String(item.id) === String(clubId));
  if (!club) return;

  applyState.selectedClubId = String(clubId);

  document.querySelector("#applyEmpty").style.display = "none";
  document.querySelector("#clubApplicationForm").style.display = "grid";
  document.querySelector("#applicationClubName").textContent = `${club.name} 지원서`;
  document.querySelector("#applicationClubDesc").textContent = club.description;

  renderApplyClubs();
}

document.querySelectorAll("[data-apply-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextType = button.dataset.applyType;

    applyState.type = applyState.type === nextType ? "" : nextType;
    applyState.selectedClubId = null;

    document.querySelectorAll("[data-apply-type]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.applyType === applyState.type);
    });

    document.querySelector("#applyEmpty").style.display = "flex";
    document.querySelector("#clubApplicationForm").style.display = "none";

    renderApplyClubs();
  });
});

document.querySelectorAll("[data-apply-status]").forEach((button) => {
  button.addEventListener("click", () => {
    applyState.status = applyState.status === button.dataset.applyStatus ? "" : button.dataset.applyStatus;

    document.querySelectorAll("[data-apply-status]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.applyStatus === applyState.status);
    });

    renderApplyClubs();
  });
});

document.querySelector("[data-apply-scrap]")?.addEventListener("click", (event) => {
  applyState.scrapOnly = !applyState.scrapOnly;
  event.currentTarget.classList.toggle("is-active", applyState.scrapOnly);
  renderApplyClubs();
});

document.querySelector(".apply-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  applyState.keyword = document.querySelector("#applySearchInput").value;
  renderApplyClubs();
});

document.querySelector("#applySearchInput")?.addEventListener("input", (event) => {
  applyState.keyword = event.target.value;
  renderApplyClubs();
});


const APPLICATION_CACHE_KEY = "clubApplicationCache";

function safeApplyJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getApplicationCache() {
  return safeApplyJsonParse(localStorage.getItem(APPLICATION_CACHE_KEY), []) || [];
}

function saveApplicationCache(applications) {
  localStorage.setItem(APPLICATION_CACHE_KEY, JSON.stringify(applications || []));
}

function getCurrentApplicantSnapshot() {
  const storedUser =
    safeApplyJsonParse(sessionStorage.getItem("currentUser"), null) ||
    safeApplyJsonParse(localStorage.getItem("currentUser"), null) ||
    safeApplyJsonParse(localStorage.getItem("registeredUser"), null) ||
    {};

  return {
    userId: storedUser.userId || storedUser.userid || storedUser.id || "",
    name: document.querySelector("#applicantName")?.value?.trim() || storedUser.name || "",
    studentId:
      document.querySelector("#applicantStudentId")?.value?.trim() ||
      storedUser.studentId ||
      storedUser.studentid ||
      "",
    department:
      document.querySelector("#applicantDepartment")?.value?.trim() ||
      storedUser.department ||
      "",
    email: storedUser.email || "",
    phone: document.querySelector("#applicantPhone")?.value?.trim() || "",
  };
}

function normalizeApplicationResponseId(result) {
  const data = result?.data || result || {};
  return String(
    data.applicationId ||
      data.applicationid ||
      data.id ||
      data.application?.applicationId ||
      data.application?.id ||
      ""
  );
}

function saveSubmittedApplicationLocally(result, club, answers) {
  const applicant = getCurrentApplicantSnapshot();
  const now = new Date().toISOString();
  const applicationId = normalizeApplicationResponseId(result) || `local-${club.id}-${Date.now()}`;
  const record = {
    applicationId,
    id: applicationId,
    clubId: String(club.id),
    clubName: club.name,
    clubType: club.type,
    studentName: applicant.name,
    name: applicant.name,
    studentId: applicant.studentId,
    studentid: applicant.studentId,
    department: applicant.department,
    email: applicant.email,
    phone: applicant.phone,
    status: "PENDING",
    answers,
    content: answers.map((item) => `${item.label}: ${item.value}`).join("\n\n"),
    createdAt: now,
    appliedAt: now,
    source: applicationId.startsWith("local-") ? "apply-local-cache" : "apply-api-cache",
  };

  const applications = getApplicationCache().filter((item) => {
    const sameId = String(item.applicationId || item.id || "") === String(applicationId);
    const sameStudentClub =
      String(item.clubId || item.club?.clubId || "") === String(club.id) &&
      String(item.studentId || item.studentid || "") === String(applicant.studentId || "") &&
      String(item.status || "PENDING") === "PENDING";
    return !sameId && !sameStudentClub;
  });

  applications.unshift(record);
  saveApplicationCache(applications);
  localStorage.setItem("latestSubmittedApplication", JSON.stringify(record));
  sessionStorage.setItem("applicationsDirty", "true");

  return record;
}

document.querySelector("#clubApplicationForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!applyState.selectedClubId) {
    alert("지원할 동아리를 선택해주세요.");
    return;
  }

  const reasonInput = document.querySelector("#applicantReason");
  const introInput = document.querySelector("#applicantIntro");
  const reason = reasonInput?.value.trim() || "";
  const intro = introInput?.value.trim() || "";

  if (!reason || !intro) {
    alert("지원동기와 자기소개를 입력해주세요.");
    return;
  }

  const submitButton = event.submitter || document.querySelector("#clubApplicationForm button[type='submit']");

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "제출 중...";
    }

    const selectedClub = applyClubs.find((club) => String(club.id) === String(applyState.selectedClubId));
    const answers = [
      {
        questionId: 1,
        label: "지원동기",
        value: reason,
        values: [reason],
      },
      {
        questionId: 2,
        label: "자기소개",
        value: intro,
        values: [intro],
      },
    ];

    const result = await apiRequest(`/api/clubs/${applyState.selectedClubId}/applications`, {
      method: "POST",
      body: {
        answers: answers.map((item) => ({
          questionId: item.questionId,
          values: item.values,
        })),
      },
    });

    if (selectedClub) {
      saveSubmittedApplicationLocally(result, selectedClub, answers);
    }

    localStorage.setItem("latestApplicationExtra", JSON.stringify({ reason, intro }));

    alert("지원서가 제출되었습니다. 운영진 지원자 현황에서 확인할 수 있습니다.");
    window.location.href = "./mypage.html?tab=applications";
  } catch (error) {
    console.error(error);
    alert(error.message || "지원서 제출에 실패했습니다. 지원 질문 ID가 백엔드와 다를 수 있으니 API 명세서를 확인해주세요.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "지원서 제출";
    }
  }
});

async function initApplyPage() {
  if (!isLoggedIn()) {
    document.querySelector(".apply-layout").classList.add("is-locked");
    openLoginRequiredModal("동아리 지원은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?");
    return;
  }

  document.querySelector("#clubApplicationForm").style.display = "none";

  const params = new URLSearchParams(window.location.search);
  const clubId = params.get("clubId");

  const user = await loadCurrentUserForApply();
  fillApplicantFromUser(user);

  await loadApplyClubs();

  if (clubId) {
    const targetClub = applyClubs.find((club) => String(club.id) === String(clubId));
    if (targetClub) {
      applyState.type = targetClub.type;

      document.querySelectorAll("[data-apply-type]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.applyType === applyState.type);
      });

      renderApplyClubs();
      selectApplyClub(clubId);
    }
  }
}

initApplyPage();
