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
  applicationForm: null,
  applicationQuestions: [],
  applicationFormLoading: false,
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

async function selectApplyClub(clubId) {
  const club = applyClubs.find((item) => String(item.id) === String(clubId));
  if (!club) return;

  applyState.selectedClubId = String(clubId);
  applyState.applicationForm = null;
  applyState.applicationQuestions = [];

  document.querySelector("#applyEmpty").style.display = "none";
  document.querySelector("#clubApplicationForm").style.display = "grid";
  document.querySelector("#applicationClubName").textContent = `${club.name} 지원서`;
  document.querySelector("#applicationClubDesc").textContent = club.description;

  renderApplyClubs();
  renderApplicationQuestionsLoading();

  await loadApplicationFormForClub(clubId);
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

function getApiData(result, fallback = null) {
  return result?.data ?? result ?? fallback;
}

function escapeApplyHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureApplicationQuestionsContainer() {
  let container = document.querySelector("#applicationQuestions");

  if (container) return container;

  container = document.createElement("div");
  container.id = "applicationQuestions";
  container.className = "application-questions";

  const phoneRow = document.querySelector("#applicantPhone")?.closest(".application-row");
  const reasonRow = document.querySelector("#applicantReason")?.closest(".application-row");
  const form = document.querySelector("#clubApplicationForm");

  if (phoneRow) {
    phoneRow.insertAdjacentElement("afterend", container);
  } else if (reasonRow) {
    reasonRow.insertAdjacentElement("beforebegin", container);
  } else if (form) {
    form.appendChild(container);
  }

  return container;
}

function setStaticQuestionRowsVisible(visible) {
  const rows = [
    document.querySelector("#applicantReason")?.closest(".application-row"),
    document.querySelector("#applicantIntro")?.closest(".application-row"),
  ];

  rows.forEach((row) => {
    if (row) row.style.display = visible ? "" : "none";
  });
}

function renderApplicationQuestionsLoading() {
  const container = ensureApplicationQuestionsContainer();
  setStaticQuestionRowsVisible(false);
  container.innerHTML = `<div class="mypage-empty-line">지원서 질문을 불러오는 중입니다...</div>`;
}

function normalizeApplicationQuestions(formData) {
  const form = getApiData(formData, {}) || {};
  const questions = Array.isArray(form.questions)
    ? form.questions
    : Array.isArray(form.applicationQuestions)
      ? form.applicationQuestions
      : [];

  return questions
    .map((question, index) => ({
      questionId: question.questionId || question.id || question.applicationQuestionId || question.applicationquestionid,
      label: question.label || question.title || question.question || `문항 ${index + 1}`,
      type: String(question.type || question.questionType || "TEXTAREA").toUpperCase(),
      required: Boolean(question.required),
      sortOrder: Number(question.sortOrder || question.order || index + 1),
      options: Array.isArray(question.options)
        ? question.options
        : Array.isArray(question.choices)
          ? question.choices
          : [],
    }))
    .filter((question) => question.questionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function renderApplicationQuestions(questions) {
  const container = ensureApplicationQuestionsContainer();

  if (!questions.length) {
    setStaticQuestionRowsVisible(false);
    container.innerHTML = `
      <div class="application-row application-textarea-row" data-fallback-application-field="지원동기">
        <label for="fallbackMotivation">지원동기<span>*</span></label>
        <textarea id="fallbackMotivation" required placeholder="지원동기를 작성해주세요."></textarea>
      </div>
      <div class="application-row application-textarea-row" data-fallback-application-field="자기소개">
        <label for="fallbackIntroduction">자기소개<span>*</span></label>
        <textarea id="fallbackIntroduction" required placeholder="자기소개를 작성해주세요."></textarea>
      </div>
    `;
    return;
  }

  setStaticQuestionRowsVisible(false);

  container.innerHTML = questions
    .map((question) => {
      const id = `applicationQuestion_${question.questionId}`;
      const label = `${escapeApplyHtml(question.label)}${question.required ? "<span>*</span>" : ""}`;
      const requiredAttr = question.required ? "required" : "";

      if (question.type === "TEXT") {
        return `
          <div class="application-row" data-application-question-id="${question.questionId}" data-question-type="TEXT">
            <label for="${id}">${label}</label>
            <input type="text" id="${id}" ${requiredAttr} placeholder="답변을 입력해주세요." />
          </div>
        `;
      }

      if (question.type === "SELECT" || question.type === "RADIO") {
        return `
          <div class="application-row" data-application-question-id="${question.questionId}" data-question-type="SELECT">
            <label for="${id}">${label}</label>
            <select id="${id}" ${requiredAttr}>
              <option value="">선택해주세요</option>
              ${(question.options || [])
                .map((option) => `<option value="${escapeApplyHtml(option)}">${escapeApplyHtml(option)}</option>`)
                .join("")}
            </select>
          </div>
        `;
      }

      if (question.type === "CHECKBOX") {
        return `
          <div class="application-row application-checkbox-row" data-application-question-id="${question.questionId}" data-question-type="CHECKBOX">
            <label>${label}</label>
            <div class="application-checkbox-options">
              ${(question.options || [])
                .map(
                  (option, index) => `
                    <label class="application-checkbox-option" for="${id}_${index}">
                      <input type="checkbox" id="${id}_${index}" value="${escapeApplyHtml(option)}" />
                      <span>${escapeApplyHtml(option)}</span>
                    </label>
                  `
                )
                .join("")}
            </div>
          </div>
        `;
      }

      return `
        <div class="application-row application-textarea-row" data-application-question-id="${question.questionId}" data-question-type="TEXTAREA">
          <label for="${id}">${label}</label>
          <textarea id="${id}" ${requiredAttr} placeholder="답변을 작성해주세요."></textarea>
        </div>
      `;
    })
    .join("");
}

function fillApplicantFromApplicationForm(formData) {
  const form = getApiData(formData, {}) || {};
  const applicant = form.applicant || form.user || {};

  if (!applicant) return;

  const user = {
    name: applicant.name || "",
    studentId: applicant.studentId || applicant.studentid || "",
    department: applicant.department || "",
  };

  fillApplicantFromUser(user);
}

async function fetchApplicationFormForClub(clubId) {
  const result = await apiRequest(`/api/clubs/${clubId}/application-form`);
  return {
    result,
    form: getApiData(result, {}),
    questions: normalizeApplicationQuestions(result),
  };
}

async function loadApplicationFormForClub(clubId) {
  applyState.applicationFormLoading = true;

  try {
    const { result, form, questions } = await fetchApplicationFormForClub(clubId);

    applyState.applicationForm = form;
    applyState.applicationQuestions = questions;

    fillApplicantFromApplicationForm(result);
    renderApplicationQuestions(questions);
    return questions;
  } catch (error) {
    console.error("지원서 양식 조회 실패:", error);
    applyState.applicationForm = null;
    applyState.applicationQuestions = [];

    renderApplicationQuestions([]);
    return [];
  } finally {
    applyState.applicationFormLoading = false;
  }
}

function normalizeQuestionLabel(label) {
  return String(label || "")
    .replace(/\s+/g, "")
    .replace(/[＊*]/g, "")
    .trim()
    .toLowerCase();
}

async function getLatestApplicationQuestionsBeforeSubmit(clubId) {
  try {
    const { form, questions } = await fetchApplicationFormForClub(clubId);
    applyState.applicationForm = form;
    applyState.applicationQuestions = questions;
    return questions;
  } catch (error) {
    console.warn("제출 직전 지원서 질문 재조회 실패:", error);
    return applyState.applicationQuestions || [];
  }
}

function remapAnswersToLatestQuestions(currentAnswers, latestQuestions) {
  if (!latestQuestions.length) return [];

  const answersById = new Map(
    (currentAnswers || []).map((answer) => [String(answer.questionId), answer])
  );
  const answersByLabel = new Map(
    (currentAnswers || []).map((answer) => [normalizeQuestionLabel(answer.label), answer])
  );

  const remapped = latestQuestions.map((question) => {
    const current =
      answersById.get(String(question.questionId)) ||
      answersByLabel.get(normalizeQuestionLabel(question.label)) ||
      null;

    const values = Array.isArray(current?.values)
      ? current.values.filter((value) => String(value || "").trim())
      : [];

    return {
      questionId: Number(question.questionId),
      label: question.label,
      value: values.join(", "),
      values,
      required: Boolean(question.required),
    };
  });

  const missing = remapped.find((answer) => answer.required && answer.values.length === 0);
  if (missing) {
    throw new Error(`${missing.label} 항목을 입력해주세요.`);
  }

  return remapped;
}

function getQuestionInputValue(question) {
  const row = document.querySelector(`[data-application-question-id="${question.questionId}"]`);
  if (!row) return { value: "", values: [] };

  const type = row.dataset.questionType || question.type;

  if (type === "CHECKBOX") {
    const values = Array.from(row.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => input.value.trim())
      .filter(Boolean);
    return { value: values.join(", "), values };
  }

  const input = row.querySelector("input, textarea, select");
  const value = input?.value?.trim() || "";
  return { value, values: value ? [value] : [] };
}

function collectFallbackApplicationAnswers() {
  const rows = Array.from(document.querySelectorAll("[data-fallback-application-field]"));

  const answers = rows.map((row, index) => {
    const label = row.dataset.fallbackApplicationField || `기본 문항 ${index + 1}`;
    const value = row.querySelector("textarea, input")?.value?.trim() || "";
    return {
      questionId: null,
      label,
      value,
      values: value ? [value] : [],
      required: true,
      localOnly: true,
    };
  });

  const missing = answers.find((answer) => answer.required && answer.values.length === 0);
  if (missing) {
    throw new Error(`${missing.label} 항목을 입력해주세요.`);
  }

  return answers;
}

function collectApplicationAnswers() {
  const questions = applyState.applicationQuestions || [];

  if (questions.length === 0) {
    return collectFallbackApplicationAnswers();
  }

  const answers = questions.map((question) => {
    const result = getQuestionInputValue(question);
    return {
      questionId: Number(question.questionId),
      label: question.label,
      value: result.value,
      values: result.values,
      required: question.required,
    };
  });

  const missing = answers.find((answer) => answer.required && answer.values.length === 0);
  if (missing) {
    throw new Error(`${missing.label} 항목을 입력해주세요.`);
  }

  return answers;
}


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
  const ownerKey = String(applicant.email || applicant.studentId || applicant.userId || "anonymous").trim().toLowerCase().replace(/[^a-z0-9가-힣@._-]/gi, "_") || "anonymous";
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
    ownerKey,
    ownerEmail: String(applicant.email || "").trim().toLowerCase(),
    ownerUserId: applicant.userId || "",
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

  const submitButton = event.submitter || document.querySelector("#clubApplicationForm button[type='submit']");

  try {
    if (applyState.applicationFormLoading) {
      alert("지원서 질문을 불러오는 중입니다. 잠시 후 다시 제출해주세요.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "제출 중...";
    }

    const selectedClub = applyClubs.find((club) => String(club.id) === String(applyState.selectedClubId));

    // 1) 사용자가 현재 화면에 입력한 답변을 먼저 모은다.
    // 2) 제출 직전에 백엔드에서 최신 질문 목록을 다시 가져온다.
    // 3) 질문 ID가 바뀌었으면 질문 라벨 기준으로 최신 questionId에 답변을 다시 매칭한다.
    // 백엔드 수정 없이도 "해당 동아리의 지원서 질문이 아닙니다" 오류를 최대한 피하기 위한 처리다.
    const currentAnswers = collectApplicationAnswers();
    const latestQuestions = await getLatestApplicationQuestionsBeforeSubmit(applyState.selectedClubId);
    const answers = latestQuestions.length
      ? remapAnswersToLatestQuestions(currentAnswers, latestQuestions)
      : currentAnswers;

    const requestAnswers = answers
      .filter((item) => item.questionId && item.values && item.values.length > 0)
      .map((item) => ({
        questionId: item.questionId,
        values: item.values,
      }));

    const result = await apiRequest(`/api/clubs/${applyState.selectedClubId}/applications`, {
      method: "POST",
      body: {
        answers: requestAnswers,
      },
    });

    if (selectedClub) {
      saveSubmittedApplicationLocally(result, selectedClub, answers);
    }

    localStorage.setItem("latestApplicationExtra", JSON.stringify({ answers }));

    alert("지원서가 제출되었습니다. 운영진 지원자 현황에서 확인할 수 있습니다.");
    window.location.href = "./mypage.html?tab=applications";
  } catch (error) {
    console.error(error);
    const message = String(error.message || "");
    if (message.includes("지원서 질문") || message.includes("질문이 아닙니다")) {
      alert("지원서 질문 정보가 맞지 않습니다. 동아리를 다시 선택하거나 새로고침 후 다시 제출해주세요.");
    } else {
      alert(message || "지원서 제출에 실패했습니다. 지원서 질문을 다시 불러온 뒤 시도해주세요.");
    }
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
