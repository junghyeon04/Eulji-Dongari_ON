const clubSelect = document.getElementById("clubSelect");
const loadClubBtn = document.getElementById("loadClubBtn");
const clubEditSummary = document.getElementById("clubEditSummary");
const clubEditForm = document.getElementById("clubEditForm");

const fields = {
  clubName: document.getElementById("clubName"),
  clubStatus: document.getElementById("clubStatus"),
  recruitPeriod: document.getElementById("recruitPeriod"),
  contactUrl: document.getElementById("contactUrl"),
  shortDescription: document.getElementById("shortDescription"),
  fullDescription: document.getElementById("fullDescription"),
  recruitCondition: document.getElementById("recruitCondition"),
  activityInfo: document.getElementById("activityInfo"),
};

function getToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

function requireLogin() {
  if (!getToken()) {
    alert("로그인 후 이용할 수 있습니다.");
    location.href = "./login.html";
    return false;
  }
  return true;
}

function getData(result) {
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

function normalizeStatus(club) {
  return club.status || club.recruitmentStatus || "OPEN";
}

async function loadClubs() {
  try {
    const result = await apiRequest("/api/clubs");
    const clubs = Array.isArray(result.data) ? result.data : [];

    clubSelect.innerHTML = `
      <option value="">동아리를 선택하세요</option>
      ${clubs
        .map(
          (club) => `
            <option value="${club.clubId}">
              ${escapeHtml(club.name)} (${club.type === "CENTRAL" ? "중앙" : "일반"})
            </option>
          `
        )
        .join("")}
    `;
  } catch (error) {
    console.error(error);
    clubSelect.innerHTML = `<option value="">동아리 조회 실패</option>`;
    clubEditSummary.textContent = "동아리 목록을 불러오지 못했습니다.";
  }
}

async function loadClubDetail() {
  if (!requireLogin()) return;

  const clubId = clubSelect.value;

  if (!clubId) {
    alert("동아리를 선택해주세요.");
    return;
  }

  clubEditSummary.textContent = "동아리 정보를 불러오는 중입니다...";

  try {
    const result = await apiRequest(`/api/clubs/${clubId}`);
    const club = getData(result);

    fields.clubName.value = club.name || "";
    fields.clubStatus.value = normalizeStatus(club);
    fields.recruitPeriod.value = club.recruitPeriod || club.recruitmentPeriod || "";
    fields.contactUrl.value = club.contactUrl || club.snsUrl || club.instagramUrl || "";
    fields.shortDescription.value = club.shortDescription || "";
    fields.fullDescription.value = club.fullDescription || club.description || "";
    fields.recruitCondition.value = club.recruitCondition || "";
    fields.activityInfo.value = club.activityInfo || "";

    clubEditForm.classList.remove("hidden");
    clubEditSummary.textContent = `${club.name || "선택한 동아리"} 정보를 수정할 수 있습니다.`;
  } catch (error) {
    console.error(error);
    clubEditForm.classList.add("hidden");
    clubEditSummary.innerHTML = `동아리 정보를 불러오지 못했습니다.<br />운영진 권한이 없거나 해당 동아리 운영자가 아닐 수 있습니다.`;
  }
}

async function saveClubInfo(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const clubId = clubSelect.value;

  if (!clubId) {
    alert("동아리를 선택해주세요.");
    return;
  }

  const submitButton = clubEditForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  const payload = {
    status: fields.clubStatus.value,
    recruitPeriod: fields.recruitPeriod.value.trim(),
    contactUrl: fields.contactUrl.value.trim(),
    shortDescription: fields.shortDescription.value.trim(),
    fullDescription: fields.fullDescription.value.trim(),
    recruitCondition: fields.recruitCondition.value.trim(),
    activityInfo: fields.activityInfo.value.trim(),
  };

  try {
    await apiRequest(`/api/clubs/${clubId}`, {
      method: "PATCH",
      body: payload,
    });

    alert("동아리 정보가 수정되었습니다.");
    await loadClubDetail();
  } catch (error) {
    console.error(error);
    alert(error.message || "동아리 정보 수정에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
}

loadClubBtn.addEventListener("click", loadClubDetail);
clubSelect.addEventListener("change", () => {
  if (clubSelect.value) loadClubDetail();
});
clubEditForm.addEventListener("submit", saveClubInfo);

async function initClubEditPage() {
  if (!requireLogin()) return;
  await loadClubs();
}

initClubEditPage();
