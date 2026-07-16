const CHECKBOX_OFF = "./images/checkbox.svg";
const CHECKBOX_ON = "./images/checkbox-on.svg";
const STORAGE_KEY = "bookmarkedClubs";
let BOARD_STORAGE_KEY = "clubBoardPosts";

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

const CATEGORY_MAP = {
  RELIGION: "종교",
  PERFORMANCE: "문화/예술/공연",
  SOCIAL: "친목",
  VOLUNTEER: "봉사",
  SPORTS: "체육",
  IT: "IT/창업",
  MUSIC: "음악",
  DANCE: "댄스",
  MEDIA: "방송/언론",
  ETC: "기타",
};

const TYPE_MAP = {
  CENTRAL: "중앙동아리",
  GENERAL: "일반동아리",
};

const CLUB_DETAILS = {
  "1": {
    "id": "1",
    "name": "멋쟁이사자처럼",
    "description": "전국 최대규모 IT창업동아리",
    "shortDescription": "코딩으로 세상을 바꾸는 대학생 개발자 커뮤니티",
    "type": "CENTRAL",
    "category": "IT",
    "status": "OPEN",
    "image": "https://www.figma.com/api/mcp/asset/e921dd97-70c7-4765-bb0a-04f289afba3a",
    "founded": "2020년",
    "campus": "성남캠퍼스",
    "president": "김성민",
    "phone": "010-1234-5678",
    "email": "likelion@eulji.ac.kr",
    "intro": "멋쟁이사자처럼은 비전공자도 함께 배우고 성장할 수 있는 대학생 개발자 커뮤니티입니다. 웹/앱 개발, AI, 데이터 등 다양한 분야를 공부하고 프로젝트를 통해 실력을 쌓습니다.",
    "tags": [
      "#앱개발",
      "#웹개발",
      "#AI",
      "#스터디",
      "#디자인",
      "#해커톤"
    ],
    "activities": [
      "정기 스터디 및 세미나",
      "팀 프로젝트 활동",
      "해커톤 참여",
      "IT 컨퍼런스 및 외부 행사",
      "멘토링 및 네트워킹"
    ],
    "recruitTarget": "을지대학교 성남캠퍼스 재학생",
    "recruitPeriod": "D-21 2026.07.06~07.29",
    "activityPeriod": "2026년 8월~2027년 3월",
    "schedule": "매주 목요일, 프로젝트는 팀별 상이"
  },
  "2": {
    "id": "2",
    "name": "DNG",
    "description": "열정 넘치는 사람들이 모인 댄스동아리",
    "shortDescription": "반짝이는 찰나의 순간을 비추다",
    "type": "CENTRAL",
    "category": "PERFORMANCE",
    "status": "CLOSED",
    "image": "https://www.figma.com/api/mcp/asset/53774021-3314-489d-bd50-640ee7e952c9",
    "coverImage": "https://www.figma.com/api/mcp/asset/83e21245-ab59-4cc0-9774-abf37600aa57",
    "logoImage": "https://www.figma.com/api/mcp/asset/94d6e63d-775c-4c58-a086-77d18c7d1f42",
    "posterImage": "https://www.figma.com/api/mcp/asset/44e02b8f-64c8-4dbd-9172-ef774b40b9c3",
    "founded": "2018년",
    "campus": "성남캠퍼스",
    "president": "이도윤",
    "phone": "010-2345-6789",
    "email": "dng@eulji.ac.kr",
    "intro": "춤을 좋아하는 학생들이 함께 모여 다양한 장르의 안무를 연습하고 공연하는 동아리입니다.<br />정기 연습을 통해 실력을 키우고, 학교 축제나 행사 무대에 참여할 수 있습니다.<br />초보자도 함께 배워가며 즐겁게 활동할 수 있습니다.",
    "tags": [
      "#댄스",
      "#공연",
      "#힙합",
      "#케이팝",
      "#축제",
      "#행사"
    ],
    "activities": [
      "정기 안무 연습",
      "학교 축제 및 행사 공연",
      "팀별 커버댄스",
      "댄스 영상 촬영",
      "초보자 대상 기초 연습"
    ],
    "recruitTarget": "을지대학교 성남캠퍼스 재학생",
    "recruitPeriod": "D-15 2026.07.10~07.23",
    "activityPeriod": "2026년 8월~2027년 3월",
    "schedule": "팀별로 상이",
    "recruitContent": "공연",
    "recruitProcess": "서류모집 → 1차 합격자 발표 → 2차 면접 → 최종 합격자 발표 / 최종합격자 발표 2026.08.17"
  },
  "3": {
    "id": "3",
    "name": "새밝소리",
    "description": "깡과 의리로 뭉친 새밝소리",
    "shortDescription": "음악을 사랑하는 학생들이 함께하는 중앙 음악동아리",
    "type": "CENTRAL",
    "category": "MUSIC",
    "status": "CLOSED",
    "image": "https://www.figma.com/api/mcp/asset/44e7b3ad-9b5d-4803-ab23-40f486228699",
    "founded": "2015년",
    "campus": "성남캠퍼스",
    "president": "박하린",
    "phone": "010-3456-7890",
    "email": "newvoice@eulji.ac.kr",
    "intro": "새밝소리는 보컬과 악기 연주를 중심으로 합주와 공연을 진행하는 음악동아리입니다. 음악을 통해 서로 소통하고 무대를 만들어갑니다.",
    "tags": [
      "#음악",
      "#밴드",
      "#합주",
      "#보컬",
      "#공연"
    ],
    "activities": [
      "정기 합주",
      "축제 공연",
      "버스킹",
      "보컬 및 악기 연습"
    ],
    "recruitTarget": "음악 활동에 관심 있는 재학생",
    "recruitPeriod": "모집 마감",
    "activityPeriod": "학기 중 상시 활동",
    "schedule": "매주 정기 합주"
  },
  "4": {
    "id": "4",
    "name": "LUNATIC+",
    "description": "무대 위를 빛내는 연극/뮤지컬 동아리",
    "shortDescription": "연극과 뮤지컬 무대를 함께 만드는 공연 동아리",
    "type": "CENTRAL",
    "category": "PERFORMANCE",
    "status": "CLOSED",
    "image": "https://www.figma.com/api/mcp/asset/bef36369-6cf4-4185-b149-20adc1aac6d0",
    "founded": "2017년",
    "campus": "성남캠퍼스",
    "president": "정민서",
    "phone": "010-4567-8901",
    "email": "lunatic@eulji.ac.kr",
    "intro": "LUNATIC+는 연극과 뮤지컬 공연을 준비하며 연기, 노래, 무대 연출을 함께 경험하는 공연 동아리입니다.",
    "tags": [
      "#연극",
      "#뮤지컬",
      "#공연",
      "#연기",
      "#무대"
    ],
    "activities": [
      "연기 연습",
      "뮤지컬 넘버 연습",
      "정기 공연 준비",
      "무대 연출 회의"
    ],
    "recruitTarget": "공연 예술에 관심 있는 재학생",
    "recruitPeriod": "모집 마감",
    "activityPeriod": "학기 중 상시 활동",
    "schedule": "매주 정기 연습"
  },
  "5": {
    "id": "5",
    "name": "F.L.A.S.H",
    "description": "사진동아리 F.L.A.S.H",
    "shortDescription": "반짝이는 찰나의 순간을 비추다",
    "type": "GENERAL",
    "category": "PERFORMANCE",
    "status": "ALWAYS",
    "image": "https://www.figma.com/api/mcp/asset/9b06a878-6e5b-4341-b7ab-a797c20d9803",
    "coverImage": "https://www.figma.com/api/mcp/asset/3e9576ba-e196-43ba-a908-9d2db8fdfd4e",
    "logoImage": "https://www.figma.com/api/mcp/asset/0e388cd9-91e7-47dd-91b3-eb976306c47a",
    "posterImage": "https://www.figma.com/api/mcp/asset/eb1c4b62-08b6-4ff0-b054-02145d8b10f6",
    "founded": "2025년",
    "campus": "성남캠퍼스",
    "president": "최유진",
    "phone": "010-5678-9012",
    "email": "flash@eulji.ac.kr",
    "intro": "“반짝이는 찰나의 순간을 비추다”<br />안녕하세요! 을지대학교 사진동아리 &lt;FLASH&gt;입니다.<br />단 한 번뿐인 대학 생활의 순간들을 사진으로 담아 소중한 추억으로 함께 기록할 수 있습니다.<br />각자의 이야기와 개성을 담은 다양한 사진 활동을 통해 함께 성장하고 있습니다.<br />DSLR 카메라가 없거나, 사진에 익숙하지 않더라도 오직 사진에 대한 열정만 있다면 누구든 환영합니다.",
    "tags": [
      "#사진",
      "#촬영",
      "#출사",
      "#모델",
      "#디자인",
      "#카메라"
    ],
    "activities": [
      "출사 활동",
      "사진 스터디",
      "사진 촬영 및 편집",
      "포토 프로젝트",
      "사진 전시 및 기록"
    ],
    "recruitTarget": "을지대학교 성남캠퍼스 재학생",
    "recruitPeriod": "D-15 2026.07.10~07.23",
    "activityPeriod": "2026년 8월~2027년 3월",
    "schedule": "미정",
    "recruitContent": "출사 활동 / 사진 스터디",
    "recruitProcess": "서류모집 → 최종합격자 발표"
  },
  "6": {
    "id": "6",
    "name": "야구의 숲",
    "description": "을지대 유일무이 야구동아리",
    "shortDescription": "야구를 좋아하는 학생들이 모인 스포츠 동아리",
    "type": "GENERAL",
    "category": "SPORTS",
    "status": "ALWAYS",
    "image": "https://www.figma.com/api/mcp/asset/cf907e5d-7457-4148-86fd-221629a9e630",
    "founded": "2022년",
    "campus": "성남캠퍼스",
    "president": "강민재",
    "phone": "010-6789-0123",
    "email": "baseballforest@eulji.ac.kr",
    "intro": "야구의 숲은 야구 관람, 캐치볼, 친선 경기 등 야구를 중심으로 활동하는 일반동아리입니다. 초보자도 부담 없이 참여할 수 있습니다.",
    "tags": [
      "#야구",
      "#스포츠",
      "#캐치볼",
      "#친목",
      "#경기"
    ],
    "activities": [
      "캐치볼 모임",
      "야구 경기 관람",
      "친선 경기",
      "야구 규칙 스터디"
    ],
    "recruitTarget": "야구에 관심 있는 재학생",
    "recruitPeriod": "상시 모집",
    "activityPeriod": "학기 중 상시 활동",
    "schedule": "주말 또는 공강 시간 활동"
  },
  "7": {
    "id": "7",
    "name": "00",
    "description": "00",
    "shortDescription": "새롭게 준비 중인 일반동아리",
    "type": "GENERAL",
    "category": "ETC",
    "status": "CLOSED",
    "image": "https://www.figma.com/api/mcp/asset/3149ab4c-f7b2-47c0-81a9-8e79c3c90259",
    "founded": "2026년",
    "campus": "성남캠퍼스",
    "president": "운영진",
    "phone": "010-0000-0000",
    "email": "club00@eulji.ac.kr",
    "intro": "00 동아리의 상세 소개는 운영진이 준비 중입니다. 추후 활동 정보와 모집 정보가 업데이트될 예정입니다.",
    "tags": [
      "#일반동아리",
      "#준비중",
      "#기타"
    ],
    "activities": [
      "동아리 활동 준비",
      "운영진 회의",
      "모집 계획 수립"
    ],
    "recruitTarget": "을지대학교 재학생",
    "recruitPeriod": "모집 마감",
    "activityPeriod": "추후 공지",
    "schedule": "추후 공지"
  },
  "8": {
    "id": "8",
    "name": "11",
    "description": "11",
    "shortDescription": "새롭게 준비 중인 일반동아리",
    "type": "GENERAL",
    "category": "ETC",
    "status": "CLOSED",
    "image": "https://www.figma.com/api/mcp/asset/3149ab4c-f7b2-47c0-81a9-8e79c3c90259",
    "founded": "2026년",
    "campus": "성남캠퍼스",
    "president": "운영진",
    "phone": "010-1111-1111",
    "email": "club11@eulji.ac.kr",
    "intro": "11 동아리의 상세 소개는 운영진이 준비 중입니다. 추후 활동 정보와 모집 정보가 업데이트될 예정입니다.",
    "tags": [
      "#일반동아리",
      "#준비중",
      "#기타"
    ],
    "activities": [
      "동아리 활동 준비",
      "운영진 회의",
      "모집 계획 수립"
    ],
    "recruitTarget": "을지대학교 재학생",
    "recruitPeriod": "모집 마감",
    "activityPeriod": "추후 공지",
    "schedule": "추후 공지"
  }
};

const EXTRA_CLUB_NAMES = {
  "9": ["CAM", "기독교 동아리", "CENTRAL", "RELIGION"],
  "10": ["을지 FC", "축구 동아리", "CENTRAL", "SPORTS"],
  "11": ["호크", "농구 동아리", "CENTRAL", "SPORTS"],
  "12": ["CCC", "기독교 동아리", "CENTRAL", "RELIGION"],
  "13": ["킥오프", "축구 동아리", "CENTRAL", "SPORTS"],
  "14": ["천유", "응원단 동아리", "CENTRAL", "PERFORMANCE"],
  "15": ["오리자", "봉사 동아리", "CENTRAL", "VOLUNTEER"],
  "16": ["EUBS", "방송 동아리", "CENTRAL", "MEDIA"],
  "17": ["찰래말래", "풋살 동아리", "CENTRAL", "SPORTS"],
  "18": ["라이머스", "음악 동아리", "CENTRAL", "MUSIC"],
  "19": ["RCY", "적십자사에서 운영하는 봉사 동아리", "CENTRAL", "VOLUNTEER"],
  "20": ["SHALOM", "기독교 동아리", "CENTRAL", "RELIGION"],
  "21": ["스매싱", "탁구 동아리", "CENTRAL", "SPORTS"],
  "22": ["오션홀릭", "스쿠버다이빙 동아리", "CENTRAL", "SPORTS"],
  "23": ["아굿", "봉사 동아리", "CENTRAL", "VOLUNTEER"],
};

Object.entries(EXTRA_CLUB_NAMES).forEach(([id, [name, description, type, category]]) => {
  CLUB_DETAILS[id] = {
    id,
    name,
    description,
    shortDescription: description,
    type,
    category,
    status: "CLOSED",
    image: "",
    founded: "2020년",
    campus: "성남캠퍼스",
    president: "운영진",
    phone: "010-0000-0000",
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "club"}@eulji.ac.kr`,
    intro: `${name}은 ${description}입니다. 자세한 활동 정보는 운영진이 업데이트할 예정입니다.`,
    tags: [`#${CATEGORY_MAP[category] || "동아리"}`, "#동아리", "#을지대학교"],
    activities: ["정기 모임", "동아리 활동", "친목 및 교류"],
    recruitTarget: "을지대학교 재학생",
    recruitPeriod: "모집 마감",
    activityPeriod: "학기 중 상시 활동",
    schedule: "동아리별 상이",
  };
});

const queryParams = new URLSearchParams(window.location.search);
const selectedClubId = queryParams.get("clubId") || "1";
let club = CLUB_DETAILS[selectedClubId] || CLUB_DETAILS["1"];
BOARD_STORAGE_KEY = `clubBoardPosts_${club.id}`;

const LOCAL_CLUB_IMAGES = {
  "멋쟁이사자처럼": "https://www.figma.com/api/mcp/asset/e921dd97-70c7-4765-bb0a-04f289afba3a",
  DNG: "https://www.figma.com/api/mcp/asset/53774021-3314-489d-bd50-640ee7e952c9",
  "새밝소리": "https://www.figma.com/api/mcp/asset/44e7b3ad-9b5d-4803-ab23-40f486228699",
  "LUNATIC+": "https://www.figma.com/api/mcp/asset/bef36369-6cf4-4185-b149-20adc1aac6d0",
  "F.L.A.S.H": "https://www.figma.com/api/mcp/asset/9b06a878-6e5b-4341-b7ab-a797c20d9803",
  FLASH: "https://www.figma.com/api/mcp/asset/9b06a878-6e5b-4341-b7ab-a797c20d9803",
  "야구의 숲": "https://www.figma.com/api/mcp/asset/cf907e5d-7457-4148-86fd-221629a9e630",
};

function mapApiClubToDetail(apiClub) {
  const fallback = CLUB_DETAILS[String(apiClub.clubId)] || {};
  const recruitmentStatus = apiClub.recruitmentStatus || apiClub.status || fallback.status || "UNKNOWN";
  const image = apiClub.imageUrl || LOCAL_CLUB_IMAGES[apiClub.name] || fallback.image || "";

  return {
    ...fallback,
    id: String(apiClub.clubId),
    name: apiClub.name || fallback.name || "",
    description: apiClub.shortDescription || fallback.description || "",
    shortDescription: apiClub.shortDescription || fallback.shortDescription || "",
    type: apiClub.type || fallback.type || "CENTRAL",
    category: apiClub.category || fallback.category || "ETC",
    status: recruitmentStatus,
    image,
    coverImage: fallback.coverImage || "",
    logoImage: fallback.logoImage || image,
    posterImage: fallback.posterImage || image,
    intro: apiClub.fullDescription || fallback.intro || apiClub.shortDescription || "",
    recruitTarget: apiClub.recruitCondition || fallback.recruitTarget || "을지대학교 재학생",
    recruitPeriod: apiClub.recruitPeriod || apiClub.recruitmentStatusLabel || fallback.recruitPeriod || "모집 정보 없음",
    activityPeriod: fallback.activityPeriod || "학기 중 상시 활동",
    schedule: apiClub.activityInfo || fallback.schedule || "동아리별 상이",
    recruitContent: apiClub.activityInfo || fallback.recruitContent || `${apiClub.name}의 주요 활동 진행`,
    recruitProcess: fallback.recruitProcess || "지원서 접수 → 운영진 확인 → 결과 안내",
    phone: fallback.phone || "010-0000-0000",
    email: fallback.email || "club@eulji.ac.kr",
    contactUrl: apiClub.contactUrl || fallback.contactUrl || "",
    isBookmarked: Boolean(apiClub.isBookmarked),
    tags: fallback.tags || [`#${CATEGORY_MAP[apiClub.category] || "동아리"}`, "#을지대학교"],
    activities: fallback.activities || [apiClub.activityInfo || "동아리 활동"],
  };
}

async function loadClubDetailFromApi() {
  if (typeof apiRequest !== "function") return;

  try {
    const result = await apiRequest(`/api/clubs/${selectedClubId}`);
    club = mapApiClubToDetail(result.data);
    BOARD_STORAGE_KEY = `clubBoardPosts_${club.id}`;

    if (club.isBookmarked && !isSaved(club.id)) {
      const saved = getSavedClubs();
      saved.push({
        id: club.id,
        name: club.name,
        description: club.description,
        status: club.status,
        image: club.image,
        category: club.category,
        type: club.type,
      });
      saveClubs(saved);
    }
  } catch (error) {
    console.warn("동아리 상세 API 조회 실패, 기존 더미 데이터 사용:", error);
  }
}


function renderClubDetail() {
  document.title = `${club.name} | 동아리 ON`;

  const typeText = TYPE_MAP[club.type] || "동아리";
  const categoryText = CATEGORY_MAP[club.category] || club.category || "기타";

  const breadcrumbName = document.querySelector("#breadcrumbClubName");
  const detailName = document.querySelector("#detailClubName");
  const detailShort = document.querySelector("#detailShortDescription");
  const applyBtn = document.querySelector(".detail-apply-btn");
  const logoBox = document.querySelector(".detail-logo-box");
  const logoImg = document.querySelector(".detail-logo-box img");
  const cover = document.querySelector(".detail-cover");

  if (breadcrumbName) breadcrumbName.textContent = club.name;
  if (detailName) detailName.textContent = club.name;
  if (detailShort) detailShort.textContent = club.shortDescription || club.description;
  if (applyBtn) applyBtn.href = `./apply.html?clubId=${club.id}`;

  const logoImage = club.logoImage || club.image;
  const posterImage = club.posterImage || club.image;

  if (logoBox && logoImg) {
    if (logoImage) {
      logoImg.src = logoImage;
      logoImg.alt = `${club.name} 대표 이미지`;
      logoImg.style.display = "";
      logoBox.classList.remove("is-empty");
    } else {
      logoImg.removeAttribute("src");
      logoImg.style.display = "none";
      logoBox.classList.add("is-empty");
      logoBox.dataset.initial = club.name.slice(0, 2);
    }
  }

  if (cover) {
    if (club.coverImage) {
      cover.style.backgroundImage = `url("${club.coverImage}")`;
      cover.classList.add("has-cover-image");
    } else {
      cover.style.backgroundImage = "";
      cover.classList.remove("has-cover-image");
    }
    cover.classList.toggle("has-club-image", Boolean(posterImage));
  }

  const summaryItems = document.querySelectorAll(".detail-summary > div");
  const summaryValues = [
    { label: "분야", value: categoryText },
    { label: "설립연도", value: club.founded || "2020년" },
    { label: "활동지역", value: club.campus || "성남캠퍼스" },
    { label: "SNS", value: "instagram" },
  ];

  summaryItems.forEach((item, index) => {
    const dt = item.querySelector("dt");
    const dd = item.querySelector("dd");
    const info = summaryValues[index];

    if (!info || !dt || !dd) return;

    dt.textContent = info.value === "instagram" ? "SNS" : info.value;

    if (info.value === "instagram") {
      dd.classList.add("sns-mark");
      dd.innerHTML = '<img src="./images/instagram.svg" alt="인스타그램" />';
    } else {
      dd.classList.remove("sns-mark");
      dd.textContent = info.label;
    }
  });

  const introParagraph = document.querySelector('.intro-panel .detail-block:first-child p');
  if (introParagraph) {
    introParagraph.innerHTML = String(club.intro || club.description);
  }

  const tags = document.querySelector(".detail-tags");
  if (tags) {
    tags.innerHTML = (club.tags || [`#${categoryText}`, "#동아리"]).map((tag) => `<span>${tag}</span>`).join("");
  }

  const recruitItems = document.querySelectorAll(".recruit-info dl > div");
  const recruitValues = [
    club.recruitTarget || "을지대학교 재학생",
    club.recruitPeriod || "추후 공지",
    club.activityPeriod || "학기 중 상시 활동",
    club.schedule || "동아리별 상이",
    club.recruitContent || `${club.name}의 주요 활동 진행`,
    club.recruitProcess || "지원서 접수 → 운영진 확인 → 결과 안내",
  ];

  recruitItems.forEach((item, index) => {
    const dd = item.querySelector("dd");
    if (!dd) return;

    if (index === 1 && String(recruitValues[index]).startsWith("D-")) {
      const [dDay, ...rest] = String(recruitValues[index]).split(" ");
      dd.innerHTML = `<strong class="d-day">${dDay}</strong> ${rest.join(" ")}`;
    } else {
      dd.textContent = recruitValues[index];
    }
  });

  const posterLarge = document.querySelector(".poster-large");
  const posterImg = document.querySelector(".poster-large img");
  const posterText = document.querySelector(".poster-large p");

  if (posterImg && posterLarge) {
    if (posterImage) {
      posterImg.src = posterImage;
      posterImg.alt = `${club.name} 모집 포스터`;
      posterImg.style.display = "";
      posterLarge.classList.remove("is-empty");
      if (posterText) posterText.textContent = `${club.name} 모집 포스터입니다.`;
    } else {
      posterImg.removeAttribute("src");
      posterImg.style.display = "none";
      posterLarge.classList.add("is-empty");
      if (posterText) posterText.textContent = `${club.name} 포스터 이미지는 추후 등록될 예정입니다.`;
    }
  }

  const activityList = document.querySelector(".activity-list");
  if (activityList) {
    activityList.innerHTML = (club.activities || ["정기 모임", "동아리 활동", "친목 및 교류"])
      .map((activity) => `<li>${activity}</li>`)
      .join("");
  }

  const memberTitle = document.querySelector(".member-contact-panel h2");
  const memberRows = document.querySelectorAll(".member-contact-list div");

  if (memberTitle) memberTitle.textContent = club.name;

  const memberValues = [
    ["회장", club.president || "운영진"],
    ["전화번호", club.phone || "010-0000-0000"],
    ["이메일", club.email || "club@eulji.ac.kr"],
  ];

  memberRows.forEach((row, index) => {
    const dt = row.querySelector("dt");
    const dd = row.querySelector("dd");
    if (!dt || !dd || !memberValues[index]) return;
    dt.textContent = memberValues[index][0];
    dd.textContent = memberValues[index][1];
  });

  const boardDesc = document.querySelector(".board-desc");
  if (boardDesc) boardDesc.textContent = `${club.name}의 공지, 자료, 질문을 확인할 수 있습니다.`;
}

const CATEGORY_LABELS = {
  NOTICE: "공지",
  MATERIAL: "자료",
  RESOURCE: "자료",
  QUESTION: "질문",
};


const DEFAULT_BOARD_SEED_TITLES = [
  "2026년 2학기 아기사자 모집",
  "비전공자도 지원 가능한가요?",
  "스터디는 온라인으로 참여 가능할까요?",
  "해커톤 참가 팀 모집 안내",
  "7~8월 정기 스터디 일정 안내",
  "2학기 아기사자 모집은 언제 하나요?",
  "6~9주차 기초 스터디 자료",
  "멋사 미니프로젝트 최종 자료",
  "1~5주차 기초 스터디 자료",
  "2026년 1학기 아기사자 모집",
];

function isDefaultBoardSeedPost(post) {
  const title = String(post?.title || "").trim();
  const author = String(post?.author || post?.authorName || post?.writerName || "").trim();

  if (!title) return false;
  if (DEFAULT_BOARD_SEED_TITLES.includes(title)) return true;

  const currentClubName = String(club?.name || "").trim();
  const generatedTitles = currentClubName
    ? [
        `${currentClubName} 모집 안내`,
        `${currentClubName} 활동은 어떻게 진행되나요?`,
        `${currentClubName} 소개 자료`,
      ]
    : [];

  if (generatedTitles.includes(title)) return true;

  const seedAuthor = author === "운영진" || author === "이*현" || author === "작성자";
  if (seedAuthor && /모집 안내$/.test(title)) return true;
  if (seedAuthor && /활동은 어떻게 진행되나요\?$/.test(title)) return true;
  if (seedAuthor && /소개 자료$/.test(title)) return true;

  return false;
}

function removeDefaultBoardSeedPosts(posts = []) {
  return posts.filter((post) => !isDefaultBoardSeedPost(post));
}

const DEFAULT_BOARD_POSTS = [];

let boardFilter = "ALL";
let boardKeyword = "";
let currentBoardPostId = null;

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

function safeBoardJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getBoardUserStorageKey() {
  if (typeof getCurrentUserStorageKey === "function") return getCurrentUserStorageKey(getCurrentUser() || {});
  const user = getCurrentUser() || {};
  const raw = user.email || user.userId || user.userid || user.id || localStorage.getItem("lastLoginEmail") || "anonymous";
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9가-힣@._-]/gi, "_") || "anonymous";
}

function scopedBoardStorageKey(baseKey) {
  if (typeof getUserScopedStorageKey === "function") return getUserScopedStorageKey(baseKey, getCurrentUser() || {});
  return `${baseKey}_${getBoardUserStorageKey()}`;
}

function getScopedBoardList(baseKey) {
  return safeBoardJsonParse(localStorage.getItem(scopedBoardStorageKey(baseKey)), []) || [];
}

function setScopedBoardList(baseKey, value) {
  localStorage.setItem(scopedBoardStorageKey(baseKey), JSON.stringify(value || []));
}

function getScopedBoardItem(baseKey, fallback = null) {
  return safeBoardJsonParse(localStorage.getItem(scopedBoardStorageKey(baseKey)), fallback);
}

function setScopedBoardItem(baseKey, value) {
  localStorage.setItem(scopedBoardStorageKey(baseKey), JSON.stringify(value));
}

function removeScopedBoardItem(baseKey) {
  localStorage.removeItem(scopedBoardStorageKey(baseKey));
}

function getGlobalBoardPosts() {
  return safeBoardJsonParse(localStorage.getItem("clubBoardPosts"), []) || [];
}

function saveGlobalBoardPosts(posts) {
  localStorage.setItem("clubBoardPosts", JSON.stringify(posts || []));
}

function getBoardPostId(post) {
  return String(post?.postId ?? post?.postid ?? post?.id ?? "");
}

function mapBoardCategoryForApi(category) {
  return category === "MATERIAL" ? "RESOURCE" : category;
}

function mapBoardCategoryForView(category) {
  return category === "RESOURCE" ? "MATERIAL" : category;
}

function rememberBoardPostForMypage(post) {
  const clubId = String(post.clubId || club.id);
  const postId = String(getBoardPostId(post) || `local-${Date.now()}`);
  const currentUser = getCurrentUser() || {};
  const record = {
    ...post,
    id: postId,
    postId,
    clubId,
    clubName: post.clubName || club.name,
    category: mapBoardCategoryForApi(post.category || "QUESTION"),
    detailCategory: post.category || "QUESTION",
    title: post.title || "제목 없음",
    content: post.content || "",
    author: post.author || currentUser.name || "나",
    authorName: post.authorName || post.writerName || post.author || currentUser.name || "나",
    writerName: post.writerName || post.authorName || post.author || currentUser.name || "나",
    authorId: post.authorId || post.userId || currentUser.userId || currentUser.userid || currentUser.id || "",
    userId: post.userId || post.authorId || currentUser.userId || currentUser.userid || currentUser.id || "",
    userid: post.userid || currentUser.userid || currentUser.userId || currentUser.id || "",
    authorEmail: post.authorEmail || post.writerEmail || currentUser.email || "",
    writerEmail: post.writerEmail || post.authorEmail || currentUser.email || "",
    email: post.email || currentUser.email || "",
    viewCount: post.viewCount ?? post.views ?? 0,
    views: post.views ?? post.viewCount ?? 0,
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: post.updatedAt || new Date().toISOString(),
    source: post.source || "club-detail-board-cache",
    createdByCurrentUser: true,
    isMine: true,
    ownerKey: getBoardUserStorageKey(),
    ownerEmail: String(currentUser.email || "").toLowerCase(),
    ownerUserId: String(currentUser.userId || currentUser.userid || currentUser.id || ""),
  };

  const globalPosts = getGlobalBoardPosts().filter(
    (item) => !(String(item.clubId) === clubId && String(getBoardPostId(item)) === postId)
  );
  globalPosts.unshift(record);
  saveGlobalBoardPosts(globalPosts);

  const myPosts = getScopedBoardList("mypageMyPosts");
  const filteredMyPosts = myPosts.filter(
    (item) => !(String(item.clubId) === clubId && String(getBoardPostId(item)) === postId)
  );
  filteredMyPosts.unshift(record);
  setScopedBoardList("mypageMyPosts", filteredMyPosts);
  setScopedBoardItem("lastCreatedBoardPost", record);

  const createdIds = getScopedBoardList("myCreatedBoardPostIds");
  const nextIds = createdIds.filter(
    (item) => !(String(item.clubId) === clubId && String(item.postId) === postId)
  );
  nextIds.unshift({ clubId, postId, title: record.title, createdAt: record.createdAt });
  setScopedBoardList("myCreatedBoardPostIds", nextIds);
  sessionStorage.setItem("mypagePostsDirty", "true");

  return record;
}


function getBoardPostById(postId) {
  return getBoardPosts().find((post) => {
    return (
      String(post.id || "") === String(postId) ||
      String(post.postId || "") === String(postId) ||
      String(post.postid || "") === String(postId)
    );
  });
}

function removePostFromStorageList(storageKey, clubId, postId) {
  const list = safeBoardJsonParse(localStorage.getItem(storageKey), []);
  if (!Array.isArray(list)) return;

  const nextList = list.filter((post) => {
    const sameClub = String(post.clubId || "") === String(clubId || "");
    const samePost = String(getBoardPostId(post)) === String(postId || "");
    return !(sameClub && samePost);
  });

  localStorage.setItem(storageKey, JSON.stringify(nextList));
}

function removePostFromAllLocalCaches(post) {
  if (!post) return;

  const clubId = String(post.clubId || club.id);
  const postId = String(getBoardPostId(post));

  removePostFromStorageList(`clubBoardPosts_${clubId}`, clubId, postId);
  removePostFromStorageList("clubBoardPosts", clubId, postId);
  removePostFromStorageList("mypageMyPosts", clubId, postId);
  removePostFromStorageList(scopedBoardStorageKey("mypageMyPosts"), clubId, postId);

  const lastPost = getScopedBoardItem("lastCreatedBoardPost", null);
  if (lastPost && String(lastPost.clubId || "") === clubId && String(getBoardPostId(lastPost)) === postId) {
    removeScopedBoardItem("lastCreatedBoardPost");
  }

  const createdIds = getScopedBoardList("myCreatedBoardPostIds");
  if (Array.isArray(createdIds)) {
    const nextIds = createdIds.filter((item) => {
      return !(String(item.clubId || "") === clubId && String(item.postId || "") === postId);
    });
    setScopedBoardList("myCreatedBoardPostIds", nextIds);
  }

  sessionStorage.setItem("mypagePostsDirty", "true");
}

async function deleteCurrentPost() {
  if (!currentBoardPostId) {
    alert("삭제할 게시글을 찾을 수 없습니다.");
    return;
  }

  const post = getBoardPostById(currentBoardPostId);
  if (!post) {
    alert("삭제할 게시글을 찾을 수 없습니다.");
    showBoardList();
    return;
  }

  if (!confirm("이 게시글을 삭제할까요?")) return;

  const deleteButton = document.querySelector("#deletePostBtn");
  const postId = String(post.postId || post.postid || post.id || currentBoardPostId);

  try {
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.textContent = "삭제 중...";
    }

    if (typeof apiRequest === "function" && postId && !postId.startsWith("local-")) {
      await apiRequest(`/api/clubs/${club.id}/posts/${postId}`, {
        method: "DELETE",
      });
    }

    removePostFromAllLocalCaches(post);
    currentBoardPostId = null;
    alert("게시글이 삭제되었습니다.");
    await loadClubBoardPostsFromApi();
    showBoardList();
  } catch (error) {
    console.error(error);
    alert(error.message || "게시글 삭제에 실패했습니다.");
  } finally {
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.textContent = "게시글 삭제";
    }
  }
}

function normalizeApiBoardPost(post) {
  const viewCategory = mapBoardCategoryForView(post.category || "QUESTION");
  return {
    ...post,
    id: String(post.postId || post.postid || post.id || `api-${Date.now()}`),
    postId: String(post.postId || post.postid || post.id || ""),
    clubId: String(post.clubId || post.club?.clubId || club.id),
    clubName: post.clubName || post.club?.name || club.name,
    category: viewCategory,
    apiCategory: post.category || mapBoardCategoryForApi(viewCategory),
    author: post.authorName || post.writerName || post.author || "작성자",
    date: post.createdAt ? String(post.createdAt).split("T")[0].replaceAll("-", ".") : post.date || todayText(),
    views: post.viewCount ?? post.views ?? 0,
    content: post.content || "",
  };
}

function mergeBoardPosts(apiPosts = [], localPosts = []) {
  const map = new Map();

  localPosts.forEach((post, index) => {
    const key = String(getBoardPostId(post) || `local-${index}`);
    map.set(key, post);
  });

  apiPosts.forEach((post, index) => {
    const key = String(getBoardPostId(post) || `api-${index}`);
    const previous = map.get(key) || {};
    map.set(key, { ...previous, ...post });
  });

  return removeDefaultBoardSeedPosts(Array.from(map.values())).sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
}

function getListFromBoardResult(result) {
  const data = result?.data ?? result ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.posts)) return data.posts;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

async function loadClubBoardPostsFromApi() {
  if (typeof apiRequest !== "function" || !club?.id) return;

  try {
    const result = await apiRequest(`/api/clubs/${club.id}/posts?page=0&size=100`);
    const apiPosts = removeDefaultBoardSeedPosts(getListFromBoardResult(result).map(normalizeApiBoardPost));
    const localPosts = getBoardPosts();

    if (apiPosts.length > 0) {
      saveBoardPosts(mergeBoardPosts(apiPosts, localPosts));
    }
  } catch (error) {
    console.warn("동아리 게시판 API 조회 실패, 로컬 게시글 사용:", error);
  }
}

function createDefaultBoardPosts() {
  return [];
}
function getBoardPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY));
    if (Array.isArray(saved)) {
      const cleanedPosts = removeDefaultBoardSeedPosts(saved);
      if (cleanedPosts.length !== saved.length) {
        localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(cleanedPosts));
      }
      return cleanedPosts;
    }
  } catch {
    // 저장된 게시글이 없거나 깨진 경우 빈 목록으로 처리
  }

  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify([]));
  return [];
}
function saveBoardPosts(posts) {
  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(removeDefaultBoardSeedPosts(posts)));
}

function createBoardPost({ category, title, author, content, apiPost = {} }) {
  const posts = getBoardPosts();
  const maxId = posts.reduce((max, post) => Math.max(max, Number(post.id) || 0), 0);
  const currentUser = getCurrentUser() || {};
  const postId = String(apiPost.postId || apiPost.postid || apiPost.id || maxId + 1);
  const createdAt = apiPost.createdAt || new Date().toISOString();

  const nextPost = {
    ...apiPost,
    id: postId,
    postId,
    clubId: String(club.id),
    clubName: club.name,
    category,
    apiCategory: mapBoardCategoryForApi(category),
    title,
    author,
    authorName: apiPost.authorName || apiPost.writerName || author,
    writerName: apiPost.writerName || apiPost.authorName || author,
    authorId: apiPost.authorId || apiPost.userId || currentUser.userId || currentUser.userid || currentUser.id || "",
    userId: apiPost.userId || apiPost.authorId || currentUser.userId || currentUser.userid || currentUser.id || "",
    userid: apiPost.userid || currentUser.userid || currentUser.userId || currentUser.id || "",
    authorEmail: apiPost.authorEmail || apiPost.writerEmail || currentUser.email || "",
    writerEmail: apiPost.writerEmail || apiPost.authorEmail || currentUser.email || "",
    email: apiPost.email || currentUser.email || "",
    date: apiPost.createdAt ? String(apiPost.createdAt).split("T")[0].replaceAll("-", ".") : todayText(),
    createdAt,
    updatedAt: apiPost.updatedAt || createdAt,
    views: apiPost.viewCount ?? apiPost.views ?? 0,
    viewCount: apiPost.viewCount ?? apiPost.views ?? 0,
    content,
    source: apiPost.source || "club-detail-board-cache",
    createdByCurrentUser: true,
    isMine: true,
    ownerKey: getBoardUserStorageKey(),
    ownerEmail: String(currentUser.email || "").toLowerCase(),
    ownerUserId: String(currentUser.userId || currentUser.userid || currentUser.id || ""),
  };

  const filteredPosts = posts.filter((post) => String(getBoardPostId(post)) !== postId);
  filteredPosts.unshift(nextPost);
  saveBoardPosts(filteredPosts);
  rememberBoardPostForMypage(nextPost);
  return nextPost;
}

function increasePostViews(postId) {
  const posts = getBoardPosts();
  const target = posts.find((post) => {
    return (
      String(post.id || "") === String(postId) ||
      String(post.postId || "") === String(postId) ||
      String(post.postid || "") === String(postId)
    );
  });

  if (!target) return null;

  target.views = (Number(target.views ?? target.viewCount) || 0) + 1;
  target.viewCount = target.views;
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

async function toggleScrap() {
  if (!isLoggedIn()) {
    if (requireLogin("스크랩은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?")) return;
    return;
  }

  const shouldSave = !isSaved(club.id);

  try {
    const bookmarkClub = {
      id: club.id,
      clubId: club.id,
      name: club.name,
      description: club.description,
      status: club.status,
      image: club.image,
      category: club.category,
      type: club.type,
    };

    if (typeof setBookmarkOnServer === "function") {
      await setBookmarkOnServer(bookmarkClub, shouldSave);
    } else {
      await apiRequest(`/api/clubs/${club.id}/bookmarks`, {
        method: shouldSave ? "POST" : "DELETE",
      });

      let savedClubs = getSavedClubs();
      if (shouldSave) {
        savedClubs.push(bookmarkClub);
      } else {
        savedClubs = savedClubs.filter(
          (savedClub) => String(savedClub.id) !== String(club.id)
        );
      }
      saveClubs(savedClubs);
    }

    updateDetailScrapButton();
  } catch (error) {
    console.error(error);
    alert(error.message || "스크랩 처리에 실패했습니다.");
  }
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
    loadClubBoardPostsFromApi().then(() => renderBoardPosts());
  }
}

function getFilteredBoardPosts() {
  const keyword = boardKeyword.trim().toLowerCase();

  return getBoardPosts().filter((post) => {
    const postCategoryForFilter = mapBoardCategoryForView(post.category);
    const matchesCategory = boardFilter === "ALL" ? true : postCategoryForFilter === boardFilter;
    const matchesKeyword =
      keyword.length === 0 ||
      post.title.toLowerCase().includes(keyword) ||
      post.author.toLowerCase().includes(keyword) ||
      (CATEGORY_LABELS[mapBoardCategoryForView(post.category)] || post.category || "").toLowerCase().includes(keyword);

    return matchesCategory && matchesKeyword;
  });
}

function renderBoardPosts() {
  const tbody = document.querySelector("#boardTableBody");
  if (!tbody) return;

  const filteredPosts = removeDefaultBoardSeedPosts(getFilteredBoardPosts());

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
          <td>${CATEGORY_LABELS[mapBoardCategoryForView(post.category)] || post.category}</td>
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
  currentBoardPostId = null;
  const deleteButton = document.querySelector("#deletePostBtn");
  if (deleteButton) deleteButton.style.display = "none";

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

  currentBoardPostId = String(post.id || post.postId || post.postid || postId);
  const deleteButton = document.querySelector("#deletePostBtn");
  if (deleteButton) {
    deleteButton.style.display = "inline-flex";
    deleteButton.disabled = false;
    deleteButton.textContent = "게시글 삭제";
  }

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
          <img src="${club.posterImage || club.image || './images/likelion-poster.png'}" alt="모집 공지 이미지" onerror="this.style.display='none'; this.parentElement.classList.add('is-empty');" />
          <p>공지 이미지를 images/likelion-poster.png로 넣으면 여기에 표시됩니다.</p>
        </div>
      `;
    }
  }

  document.querySelector("#boardListPanel").style.display = "none";
  document.querySelector("#boardWritePanel").style.display = "none";
  document.querySelector("#boardPostPanel").style.display = "block";
}


function activateBoardTabFromLink() {
  document.querySelectorAll("[data-detail-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.detailTab === "board");
  });

  document.querySelectorAll("[data-detail-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.detailPanel === "board");
  });

  showBoardList();
}

async function openInitialBoardPostFromUrl() {
  const requestedTab = queryParams.get("tab");
  const requestedPostId = queryParams.get("postId");
  const requestedMode = queryParams.get("mode") || queryParams.get("action");

  if (requestedTab !== "board" && !requestedPostId && requestedMode !== "write") {
    return false;
  }

  activateBoardTabFromLink();
  await loadClubBoardPostsFromApi();
  renderBoardPosts();

  if (requestedMode === "write") {
    showWriteForm();
    return true;
  }

  if (requestedPostId) {
    const targetPost = getBoardPosts().find((post) => {
      return (
        String(post.id || "") === String(requestedPostId) ||
        String(post.postId || "") === String(requestedPostId) ||
        String(post.postid || "") === String(requestedPostId)
      );
    });

    if (targetPost) {
      openPostDetail(targetPost.id || targetPost.postId || targetPost.postid || requestedPostId);
    }
  }

  return true;
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
document.querySelector("#deletePostBtn")?.addEventListener("click", deleteCurrentPost);
document.querySelector("#detailScrapBtn")?.addEventListener("click", toggleScrap);

document.querySelector("#postContent")?.addEventListener("input", (event) => {
  document.querySelector("#postCount").textContent = `${event.target.value.length}/2000자`;
});

document.querySelector(".board-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const activeCategory = document.querySelector("[data-write-category].is-active")?.dataset.writeCategory || "QUESTION";
  const apiCategory = mapBoardCategoryForApi(activeCategory);
  const title = document.querySelector("#postTitle").value.trim();
  const content = document.querySelector("#postContent").value.trim();
  const author = document.querySelector("#postAuthor").value.trim() || "익명";

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  const submitButton = event.submitter || document.querySelector(".board-form button[type='submit']");
  let apiPost = {};
  let savedOnServer = false;

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "등록 중...";
    }

    if (typeof apiRequest === "function") {
      const result = await apiRequest(`/api/clubs/${club.id}/posts`, {
        method: "POST",
        body: {
          category: apiCategory,
          status: "PUBLISHED",
          title,
          content,
          attachmentUrls: [],
        },
      });

      apiPost = result?.data || {};
      savedOnServer = true;
    }
  } catch (error) {
    console.warn("게시글 서버 저장 실패, 로컬에 우선 저장합니다:", error);
    alert(error.message || "서버 저장은 실패했지만, 이 브라우저에는 게시물이 저장됩니다.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "등록하기";
    }
  }

  createBoardPost({
    category: activeCategory,
    title,
    author,
    content,
    apiPost,
  });

  clearBoardForm();
  boardFilter = "ALL";

  document.querySelectorAll("[data-board-filter]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.boardFilter === "ALL");
  });

  alert(savedOnServer ? "게시글이 등록되었습니다." : "게시글이 로컬에 저장되었습니다.");
  showBoardList();
});

const detailApplyBtnGuard = document.querySelector(".detail-apply-btn");
detailApplyBtnGuard?.addEventListener("click", (event) => {
  if (!requireLogin("지원하기는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?")) {
    event.preventDefault();
  }
});

async function initClubDetailPage() {
  await loadClubDetailFromApi();

  try {
    if (typeof syncBookmarksFromServer === "function") {
      await syncBookmarksFromServer();
    }
  } catch (error) {
    console.warn("상세 스크랩 동기화 실패:", error);
  }

  renderClubDetail();
  updateDetailScrapButton();
  initAdminTools();
  await loadClubBoardPostsFromApi();
  renderBoardPosts();
  renderPostCategoryTabs();

  const openedFromUrl = await openInitialBoardPostFromUrl();
  if (!openedFromUrl) {
    showBoardList();
  }
}

initClubDetailPage();
