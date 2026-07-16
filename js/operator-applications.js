const clubSelect = document.getElementById("clubSelect");
const statusSelect = document.getElementById("statusSelect");
const loadApplicationsBtn = document.getElementById("loadApplicationsBtn");
const applicationsList = document.getElementById("applicationsList");
const applicationSummary = document.getElementById("applicationSummary");

const urlParams = new URLSearchParams(location.search);
const initialClubId = urlParams.get("clubId");
const APPLICATION_CACHE_KEY = "clubApplicationCache";

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

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getResultData(result) {
  return result?.data ?? result ?? [];
}

function getListFromResult(result) {
  const data = getResultData(result);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.applications)) return data.applications;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const text = String(value);
  return text.includes("T") ? text.split("T")[0] : text.split(" ")[0];
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "대기",
    APPROVED: "승인",
    REJECTED: "거절",
    CANCELLED: "취소",
  };

  return labels[status] || status || "대기";
}

function getStatusClass(status) {
  const classes = {
    PENDING: "status-pending",
    APPROVED: "status-approved",
    REJECTED: "status-rejected",
    CANCELLED: "status-cancelled",
  };

  return classes[status] || "status-pending";
}

function getApplicationId(application) {
  return String(application.applicationId ?? application.applicationid ?? application.id ?? "");
}

function getApplicationClubId(application) {
  return String(application.clubId ?? application.club?.clubId ?? application.club?.id ?? "");
}

function getApplicationCache() {
  return safeJsonParse(localStorage.getItem(APPLICATION_CACHE_KEY), []) || [];
}

function saveApplicationCache(applications) {
  localStorage.setItem(APPLICATION_CACHE_KEY, JSON.stringify(applications || []));
}

function getLocalApplicationsForClub(clubId, status = "") {
  return getApplicationCache()
    .filter((item) => String(getApplicationClubId(item)) === String(clubId))
    .filter((item) => (status ? String(item.status || "PENDING") === status : true));
}

function normalizeApplication(application, fallbackClubId = "") {
  const answers = Array.isArray(application.answers) ? application.answers : [];
  const answerText = answers
    .map((answer) => {
      const label = answer.label || answer.questionTitle || answer.question || `문항 ${answer.questionId || ""}`.trim();
      const value = Array.isArray(answer.values) ? answer.values.join(", ") : answer.value || answer.answer || "";
      return value ? `${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    ...application,
    applicationId: getApplicationId(application),
    clubId: getApplicationClubId(application) || fallbackClubId,
    clubName: application.clubName || application.club?.name || application.name || "동아리",
    studentName: application.studentName || application.name || application.memberName || application.userName || "이름 없음",
    studentId: application.studentId || application.studentid || application.memberStudentId || "-",
    department: application.department || application.memberDepartment || "-",
    email: application.email || application.memberEmail || "-",
    status: application.status || "PENDING",
    content: application.content || application.answer || application.answersText || answerText || "지원 내용이 저장되어 있습니다.",
    createdAt: application.createdAt || application.appliedAt || application.createdDate || "",
  };
}

function mergeApplications(apiApplications = [], localApplications = [], clubId = "") {
  const map = new Map();

  localApplications.map((item) => normalizeApplication(item, clubId)).forEach((item, index) => {
    const key = item.applicationId || `${item.clubId}-${item.studentId}-${item.createdAt || index}`;
    map.set(key, item);
  });

  apiApplications.map((item) => normalizeApplication(item, clubId)).forEach((item, index) => {
    const key = item.applicationId || `${item.clubId}-${item.studentId}-${item.createdAt || index}`;
    const previous = map.get(key) || {};
    map.set(key, {
      ...previous,
      ...item,
      clubId: item.clubId || previous.clubId || clubId,
      source: item.source || "api",
    });
  });

  return Array.from(map.values()).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function updateLocalApplicationStatus(applicationId, nextStatus) {
  const applications = getApplicationCache().map((item) => {
    if (String(getApplicationId(item)) === String(applicationId)) {
      return { ...item, status: nextStatus };
    }
    return item;
  });
  saveApplicationCache(applications);
}

async function loadClubs() {
  try {
    const result = await apiRequest("/api/clubs");
    const clubs = getListFromResult(result);

    clubSelect.innerHTML = `
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
      clubSelect.value = initialClubId;
      if (clubSelect.value) {
        await loadApplications();
      }
    }
  } catch (error) {
    console.error(error);
    clubSelect.innerHTML = `<option value="">동아리 조회 실패</option>`;
    applicationSummary.textContent = "동아리 목록을 불러오지 못했습니다.";
  }
}

async function loadApplications() {
  if (!requireLogin()) return;

  const clubId = clubSelect.value;
  const status = statusSelect.value;

  if (!clubId) {
    alert("동아리를 선택해주세요.");
    return;
  }

  applicationsList.innerHTML = `<div class="operator-api-empty">지원자 목록을 불러오는 중입니다...</div>`;

  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const result = await apiRequest(`/api/clubs/${clubId}/applications${query}`);
    const apiApplications = getListFromResult(result);
    const localApplications = getLocalApplicationsForClub(clubId, status);
    const applications = mergeApplications(apiApplications, localApplications, clubId);

    renderApplications(applications);
  } catch (error) {
    console.error(error);

    const localApplications = getLocalApplicationsForClub(clubId, status);
    if (localApplications.length > 0) {
      renderApplications(mergeApplications([], localApplications, clubId));
      applicationSummary.textContent = `서버 조회는 실패했지만, 이 브라우저에서 제출된 지원자 ${localApplications.length}명을 표시합니다.`;
      return;
    }

    applicationsList.innerHTML = `
      <div class="operator-api-empty error">
        지원자 목록을 불러오지 못했습니다.<br />
        운영진 권한이 없거나 해당 동아리 운영자가 아닐 수 있습니다.
      </div>
    `;
  }
}

function renderApplications(applications) {
  if (!applications.length) {
    applicationSummary.textContent = "조회된 지원자가 없습니다.";
    applicationsList.innerHTML = `<div class="operator-api-empty">조회된 지원자가 없습니다.</div>`;
    return;
  }

  applicationSummary.textContent = `총 ${applications.length}명의 지원자가 조회되었습니다.`;

  applicationsList.innerHTML = applications
    .map((application) => {
      const status = application.status || "PENDING";
      const applicationId = getApplicationId(application);
      const isLocalOnly = String(applicationId).startsWith("local-");

      return `
        <article class="application-api-card" data-application-id="${escapeHtml(applicationId)}">
          <div class="application-api-head">
            <div>
              <h3>${escapeHtml(application.studentName || "이름 없음")}</h3>
              <p>
                ${escapeHtml(application.studentId || application.studentid || "-")}
                · ${escapeHtml(application.department || "-")}
              </p>
            </div>
            <span class="operator-api-status ${getStatusClass(status)}">
              ${getStatusLabel(status)}
            </span>
          </div>

          <div class="application-api-info">
            <p><strong>이메일</strong> ${escapeHtml(application.email || "-")}</p>
            <p><strong>지원일</strong> ${escapeHtml(formatDate(application.createdAt))}</p>
            ${isLocalOnly ? `<p><strong>상태</strong> 서버 ID가 아직 없어서 로컬 확인용으로 표시 중</p>` : ""}
          </div>

          <div class="application-api-content">
            <strong>지원 내용</strong>
            <p>${escapeHtml(application.content || "지원 내용이 없습니다.").replaceAll("\n", "<br />")}</p>
          </div>

          ${
            status === "PENDING" && applicationId
              ? `
                <div class="application-api-actions">
                  <button type="button" class="operator-api-btn approve" data-action="APPROVED">
                    승인
                  </button>
                  <button type="button" class="operator-api-btn reject" data-action="REJECTED">
                    거절
                  </button>
                </div>
              `
              : ""
          }
        </article>
      `;
    })
    .join("");

  bindApplicationActionButtons();
}

function bindApplicationActionButtons() {
  document.querySelectorAll(".application-api-actions button").forEach((button) => {
    button.onclick = async function () {
      const card = button.closest(".application-api-card");
      const applicationId = card?.dataset.applicationId;
      const nextStatus = button.dataset.action;

      if (!applicationId || !nextStatus) return;

      const confirmMessage =
        nextStatus === "APPROVED"
          ? "이 지원자를 승인할까요?"
          : "이 지원자를 거절할까요?";

      if (!confirm(confirmMessage)) return;

      button.disabled = true;

      try {
        if (String(applicationId).startsWith("local-")) {
          updateLocalApplicationStatus(applicationId, nextStatus);
        } else {
          await apiRequest(`/api/applications/${applicationId}/status`, {
            method: "PATCH",
            body: {
              status: nextStatus,
            },
          });
          updateLocalApplicationStatus(applicationId, nextStatus);
        }

        alert(nextStatus === "APPROVED" ? "승인 처리되었습니다." : "거절 처리되었습니다.");
        await loadApplications();
      } catch (error) {
        console.error(error);
        alert(error.message || "처리에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    };
  });
}

loadApplicationsBtn.addEventListener("click", loadApplications);

statusSelect.addEventListener("change", () => {
  if (clubSelect.value) {
    loadApplications();
  }
});

clubSelect.addEventListener("change", () => {
  if (clubSelect.value) {
    loadApplications();
  }
});

async function initOperatorApplicationsPage() {
  if (!requireLogin()) return;

  if (typeof apiRequest !== "function") {
    applicationSummary.textContent = "api.js가 연결되지 않았습니다.";
    return;
  }

  await loadClubs();
}

initOperatorApplicationsPage();
