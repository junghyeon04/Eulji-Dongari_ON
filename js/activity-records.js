const recordClubSelect = document.getElementById("recordClubSelect");
const loadRecordsBtn = document.getElementById("loadRecordsBtn");
const recordSummary = document.getElementById("recordSummary");
const recordList = document.getElementById("recordList");
const recordDetail = document.getElementById("recordDetail");
const recordForm = document.getElementById("recordForm");
const recordFormTitle = document.getElementById("recordFormTitle");
const resetRecordFormBtn = document.getElementById("resetRecordFormBtn");

const recordFields = {
  id: document.getElementById("recordId"),
  title: document.getElementById("recordTitle"),
  content: document.getElementById("recordContent"),
  imageUrls: document.getElementById("recordImageUrls"),
};

const clubActivityInfoForm = document.getElementById("clubActivityInfoForm");
const majorActivitiesInput = document.getElementById("majorActivitiesInput");
const annualActivitiesInput = document.getElementById("annualActivitiesInput");
const initialClubIdFromUrl = new URLSearchParams(location.search).get("clubId");

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

function getRecordsFromData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.records)) return data.records;
  return [];
}

function parseImageUrls() {
  return recordFields.imageUrls.value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean);
}


function parseActivityInfoForForm(value) {
  const text = String(value || "").trim();
  const result = { major: [], annual: [] };
  if (!text) return result;

  let mode = "major";
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const normalized = line.replaceAll(" ", "");
    if (/^\[?주요활동\]?$/.test(normalized)) {
      mode = "major";
      return;
    }
    if (/^\[?연간활동\]?$/.test(normalized) || /^\[?연간활동정보\]?$/.test(normalized)) {
      mode = "annual";
      return;
    }

    if (mode === "annual") {
      result.annual.push(line);
    } else {
      result.major.push(line.replace(/^[-•]\s*/, ""));
    }
  });

  return result;
}

function buildActivityInfoText() {
  const major = majorActivitiesInput?.value.trim() || "";
  const annual = annualActivitiesInput?.value.trim() || "";
  const blocks = [];

  if (major) {
    blocks.push(`[주요 활동]\n${major}`);
  }

  if (annual) {
    blocks.push(`[연간 활동]\n${annual}`);
  }

  return blocks.join("\n\n");
}

async function loadClubActivityInfo() {
  const clubId = recordClubSelect.value;
  if (!clubId || !majorActivitiesInput || !annualActivitiesInput) return;

  majorActivitiesInput.value = "";
  annualActivitiesInput.value = "";

  try {
    const result = await apiRequest(`/api/clubs/${clubId}`);
    const club = getData(result);
    const parsed = parseActivityInfoForForm(club.activityInfo || "");

    majorActivitiesInput.value = parsed.major.join("\n");
    annualActivitiesInput.value = parsed.annual.join("\n");
  } catch (error) {
    console.warn("활동 정보 조회 실패:", error);
  }
}

async function saveClubActivityInfo(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const clubId = recordClubSelect.value;
  if (!clubId) {
    alert("동아리를 먼저 선택해주세요.");
    return;
  }

  const submitButton = clubActivityInfoForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  try {
    await apiRequest(`/api/clubs/${clubId}`, {
      method: "PATCH",
      body: {
        activityInfo: buildActivityInfoText(),
      },
    });

    alert("활동 정보가 저장되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "활동 정보 저장에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
}

function resetRecordForm() {
  recordFields.id.value = "";
  recordFields.title.value = "";
  recordFields.content.value = "";
  recordFields.imageUrls.value = "";
  recordFormTitle.textContent = "활동 기록 작성";
}

async function loadClubsForRecords() {
  try {
    const result = await apiRequest("/api/clubs");
    const clubs = Array.isArray(result.data) ? result.data : [];

    recordClubSelect.innerHTML = `
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

    if (initialClubIdFromUrl) {
      recordClubSelect.value = initialClubIdFromUrl;
      if (recordClubSelect.value) {
        await loadClubActivityInfo();
        await loadRecords();
      }
    }
  } catch (error) {
    console.error(error);
    recordClubSelect.innerHTML = `<option value="">동아리 조회 실패</option>`;
    recordSummary.textContent = "동아리 목록을 불러오지 못했습니다.";
  }
}

async function loadRecords() {
  const clubId = recordClubSelect.value;

  if (!clubId) {
    alert("동아리를 선택해주세요.");
    return;
  }

  recordDetail.classList.add("hidden");
  recordList.innerHTML = `<div class="operator-empty">활동 기록을 불러오는 중입니다...</div>`;

  try {
    const result = await apiRequest(`/api/clubs/${clubId}/records?page=0&size=50`);
    const data = getData(result);
    const records = getRecordsFromData(data);

    renderRecords(records);
  } catch (error) {
    console.error(error);
    recordList.innerHTML = `<div class="operator-empty error">활동 기록 목록을 불러오지 못했습니다.</div>`;
  }
}

function renderRecords(records) {
  if (!records.length) {
    recordSummary.textContent = "등록된 활동 기록이 없습니다.";
    recordList.innerHTML = `<div class="operator-empty">등록된 활동 기록이 없습니다.</div>`;
    return;
  }

  recordSummary.textContent = `총 ${records.length}개의 활동 기록이 조회되었습니다.`;
  recordList.innerHTML = records
    .map((record) => {
      const recordId = record.recordId || record.id;
      const thumbnail = record.thumbnailUrl || record.imageUrl || record.imageUrls?.[0] || "";

      return `
        <article class="record-item" data-record-id="${recordId}">
          ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="" />` : `<div class="record-thumb-placeholder">활동</div>`}
          <div>
            <h3>${escapeHtml(record.title || "제목 없음")}</h3>
            <p>${escapeHtml(record.createdAt || record.updatedAt || "-")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  bindRecordItems();
}

function bindRecordItems() {
  document.querySelectorAll(".record-item").forEach((item) => {
    item.onclick = async function () {
      const clubId = recordClubSelect.value;
      const recordId = item.dataset.recordId;
      if (!clubId || !recordId) return;
      await loadRecordDetail(clubId, recordId);
    };
  });
}

async function loadRecordDetail(clubId, recordId) {
  recordDetail.classList.remove("hidden");
  recordDetail.innerHTML = `<div class="operator-empty">활동 기록 상세를 불러오는 중입니다...</div>`;

  try {
    const result = await apiRequest(`/api/clubs/${clubId}/records/${recordId}`);
    const record = getData(result);
    renderRecordDetail(record);
    fillRecordForm(record);
  } catch (error) {
    console.error(error);
    recordDetail.innerHTML = `<div class="operator-empty error">활동 기록 상세를 불러오지 못했습니다.</div>`;
  }
}

function fillRecordForm(record) {
  const recordId = record.recordId || record.id || "";
  const imageUrls = record.imageUrls || (record.imageUrl ? [record.imageUrl] : []);

  recordFields.id.value = recordId;
  recordFields.title.value = record.title || "";
  recordFields.content.value = record.content || "";
  recordFields.imageUrls.value = imageUrls.join("\n");
  recordFormTitle.textContent = "활동 기록 수정";
}

function renderRecordDetail(record) {
  const imageUrls = record.imageUrls || (record.imageUrl ? [record.imageUrl] : []);
  const recordId = record.recordId || record.id;

  recordDetail.innerHTML = `
    <div class="post-detail-head">
      <div>
        <span class="post-category">활동 기록</span>
        <h2>${escapeHtml(record.title || "제목 없음")}</h2>
        <p>${escapeHtml(record.createdAt || record.updatedAt || "-")}</p>
      </div>
      <button type="button" class="operator-btn reject" id="deleteRecordBtn" data-record-id="${recordId}">삭제</button>
    </div>

    <div class="post-detail-content">
      ${escapeHtml(record.content || "내용이 없습니다.").replaceAll("\n", "<br />")}
    </div>

    ${
      imageUrls.length
        ? `
          <div class="record-image-grid">
            ${imageUrls.map((url) => `<img src="${escapeHtml(url)}" alt="활동 이미지" />`).join("")}
          </div>
        `
        : ""
    }
  `;

  document.getElementById("deleteRecordBtn")?.addEventListener("click", deleteSelectedRecord);
}

async function saveRecord(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const clubId = recordClubSelect.value;

  if (!clubId) {
    alert("동아리를 먼저 선택해주세요.");
    return;
  }

  const title = recordFields.title.value.trim();
  const content = recordFields.content.value.trim();

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  const recordId = recordFields.id.value;
  const submitButton = recordForm.querySelector("button[type='submit']");
  submitButton.disabled = true;

  const payload = {
    title,
    content,
    imageUrls: parseImageUrls(),
  };

  try {
    if (recordId) {
      await apiRequest(`/api/clubs/${clubId}/records/${recordId}`, {
        method: "PATCH",
        body: payload,
      });
      alert("활동 기록이 수정되었습니다.");
    } else {
      await apiRequest(`/api/clubs/${clubId}/records`, {
        method: "POST",
        body: payload,
      });
      alert("활동 기록이 등록되었습니다.");
    }

    resetRecordForm();
    await loadRecords();
  } catch (error) {
    console.error(error);
    alert(error.message || "활동 기록 저장에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteSelectedRecord() {
  const clubId = recordClubSelect.value;
  const recordId = this.dataset.recordId;

  if (!clubId || !recordId) return;
  if (!confirm("이 활동 기록을 삭제할까요?")) return;

  this.disabled = true;

  try {
    await apiRequest(`/api/clubs/${clubId}/records/${recordId}`, {
      method: "DELETE",
    });

    alert("활동 기록이 삭제되었습니다.");
    recordDetail.classList.add("hidden");
    resetRecordForm();
    await loadRecords();
  } catch (error) {
    console.error(error);
    alert(error.message || "활동 기록 삭제에 실패했습니다.");
  } finally {
    this.disabled = false;
  }
}

loadRecordsBtn.addEventListener("click", loadRecords);
recordClubSelect.addEventListener("change", async () => {
  resetRecordForm();
  if (recordClubSelect.value) {
    await loadClubActivityInfo();
    await loadRecords();
  }
});
recordForm.addEventListener("submit", saveRecord);
clubActivityInfoForm?.addEventListener("submit", saveClubActivityInfo);
resetRecordFormBtn.addEventListener("click", resetRecordForm);

async function initActivityRecordsPage() {
  if (!requireLogin()) return;
  await loadClubsForRecords();
}

initActivityRecordsPage();
