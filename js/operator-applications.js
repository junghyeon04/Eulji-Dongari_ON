const clubSelect = document.getElementById("clubSelect");
const statusSelect = document.getElementById("statusSelect");
const loadApplicationsBtn = document.getElementById("loadApplicationsBtn");
const applicationsList = document.getElementById("applicationsList");
const applicationSummary = document.getElementById("applicationSummary");

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
  return result?.data ?? result ?? [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "대기",
    APPROVED: "승인",
    REJECTED: "거절",
  };

  return labels[status] || status || "대기";
}

function getStatusClass(status) {
  const classes = {
    PENDING: "status-pending",
    APPROVED: "status-approved",
    REJECTED: "status-rejected",
  };

  return classes[status] || "status-pending";
}

function getApplicationId(application) {
  return application.applicationId ?? application.applicationid ?? application.id ?? "";
}

async function loadClubs() {
  try {
    const result = await apiRequest("/api/clubs");
    const clubs = getResultData(result);

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
    const applications = getResultData(result);

    renderApplications(Array.isArray(applications) ? applications : []);
  } catch (error) {
    console.error(error);

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

      return `
        <article class="application-api-card" data-application-id="${applicationId}">
          <div class="application-api-head">
            <div>
              <h3>${escapeHtml(application.studentName || application.name || "이름 없음")}</h3>
              <p>
                ${escapeHtml(application.studentid || application.studentId || "-")}
                · ${escapeHtml(application.department || "-")}
              </p>
            </div>
            <span class="operator-api-status ${getStatusClass(status)}">
              ${getStatusLabel(status)}
            </span>
          </div>

          <div class="application-api-info">
            <p><strong>이메일</strong> ${escapeHtml(application.email || "-")}</p>
            <p><strong>지원일</strong> ${escapeHtml(application.createdAt || "-")}</p>
          </div>

          <div class="application-api-content">
            <strong>지원 내용</strong>
            <p>${escapeHtml(application.content || "지원 내용이 없습니다.")}</p>
          </div>

          ${
            status === "PENDING"
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
        await apiRequest(`/api/applications/${applicationId}/status`, {
          method: "PATCH",
          body: {
            status: nextStatus,
          },
        });

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
