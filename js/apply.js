
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

function fillApplicantFromCurrentUser() {
  const user = getCurrentUserForApply();
  if (!user) return;

  const nameInput = document.querySelector("#applicantName");
  const studentIdInput = document.querySelector("#applicantStudentId");
  const departmentInput = document.querySelector("#applicantDepartment");

  if (nameInput) nameInput.value = user.name || "";
  if (studentIdInput) studentIdInput.value = user.studentId || user.studentid || "";
  if (departmentInput) departmentInput.value = user.department || "";
}

const APPLY_STORAGE_KEY = "bookmarkedClubs";

const applyClubs = [
  {
    id: "1",
    name: "멋쟁이사자처럼",
    type: "",
    description: "전국 최대규모 IT창업동아리",
    status: "OPEN",
  },
  {
    id: "2",
    name: "DNG",
    type: "",
    description: "열정 넘치는 사람들이 모인 댄스동아리",
    status: "OPEN",
  },
  {
    id: "3",
    name: "새밝소리",
    type: "",
    description: "깡과 의리로 뭉친 새밝소리",
    status: "OPEN",
  },
  {
    id: "4",
    name: "LUNATIC+",
    type: "",
    description: "무대 위를 빛내는 연극/뮤지컬 동아리",
    status: "OPEN",
  },
  {
    id: "5",
    name: "FLASH",
    type: "GENERAL",
    description: "사진동아리 F.L.A.S.H",
    status: "ALWAYS",
  },
  {
    id: "6",
    name: "야구의 숲",
    type: "GENERAL",
    description: "을지대 유일무이 야구동아리",
    status: "ALWAYS",
  },
];

const APPLY_STATUS_MAP = {
  OPEN: "모집 중",
  ALWAYS: "상시 모집",
  CLOSED: "모집마감",
};

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
  return getSavedClubs().some((club) => club.id === clubId);
}

function getFilteredApplyClubs() {
  const keyword = applyState.keyword.trim().toLowerCase();

  return applyClubs.filter((club) => {
    const matchesType = applyState.type ? club.type === applyState.type : true;
    const matchesKeyword = keyword.length === 0 || club.name.toLowerCase().includes(keyword) || club.description.toLowerCase().includes(keyword);
    const matchesStatus = applyState.status ? club.status === applyState.status : true;
    const matchesScrap = applyState.scrapOnly ? isSavedClub(club.id) : true;

    return matchesType && matchesKeyword && matchesStatus && matchesScrap;
  });
}

function renderApplyClubs() {
  const list = document.querySelector("#applyClubList");
  const filteredClubs = getFilteredApplyClubs();

  list.innerHTML = filteredClubs
    .map((club) => {
      return `
        <button type="button" class="apply-club-card ${applyState.selectedClubId === club.id ? "is-active" : ""}" data-apply-club-id="${club.id}">
          <strong>${club.name}</strong>
          <span>${club.description}</span>
          <em>${APPLY_STATUS_MAP[club.status]}</em>
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
  const club = applyClubs.find((item) => item.id === clubId);
  if (!club) return;

  applyState.selectedClubId = clubId;

  document.querySelector("#applyEmpty").style.display = "none";
  document.querySelector("#clubApplicationForm").style.display = "grid";
  document.querySelector("#applicationClubName").textContent = `${club.name} 지원서`;
  document.querySelector("#applicationClubDesc").textContent = club.description;

  renderApplyClubs();
}

document.querySelectorAll("[data-apply-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextType = button.dataset.applyType;

    // 이미 선택된 중앙/일반 버튼을 한 번 더 누르면 필터 해제
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

document.querySelector("#clubApplicationForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  /*
    나중에 백엔드 연결:
    POST /api/clubs/{clubId}/applications
    {
      name,
      studentId,
      department,
      phone,
      motivation,
      introduction
    }
  */

  alert("지원서 제출 준비 완료");
});

function initApplyPage() {
  if (!isLoggedIn()) {
    document.querySelector(".apply-layout").classList.add("is-locked");
    openLoginRequiredModal("동아리 지원은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const clubId = params.get("clubId");

  renderApplyClubs();
  fillApplicantFromCurrentUser();

  if (clubId) {
    const targetClub = applyClubs.find((club) => club.id === clubId);
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

document.querySelector("#clubApplicationForm").style.display = "none";
renderApplyClubs();
initApplyPage();
