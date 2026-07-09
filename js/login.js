function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
}

function getRegisteredUser() {
  try {
    return JSON.parse(localStorage.getItem("registeredUser")) || null;
  } catch {
    return null;
  }
}

function clearLoginState() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userRole");

  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("userRole");
}

document.querySelector("#loginForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const loginId = document.querySelector("#loginId")?.value.trim() || "";
  const loginPassword = document.querySelector("#loginPassword")?.value.trim() || "";
  const keepLogin = document.querySelector("#keepLogin")?.checked || false;

  if (!loginId || !loginPassword) {
    alert("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  const registeredUser = getRegisteredUser();

  if (!registeredUser) {
    alert("가입된 회원 정보가 없습니다. 먼저 회원가입을 진행해주세요.");
    return;
  }

  const savedEmail = registeredUser.email || "";
  const savedPassword = registeredUser.password || "";

  if (loginId !== savedEmail) {
    alert("아이디가 일치하지 않습니다.");
    return;
  }

  if (loginPassword !== savedPassword) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  /*
    나중에 백엔드 연결:
    POST /api/auth/login
    {
      email,
      password
    }

    로그인 유지 체크:
    - 체크함: localStorage에 저장
    - 체크 안 함: sessionStorage에 저장
  */

  const loginUser = {
    email: registeredUser.email || "",
    name: registeredUser.name || "",
    studentId: registeredUser.studentId || "",
    department: registeredUser.department || "",
    role: registeredUser.role || "ROLE_STUDENT",
    signupRole: registeredUser.signupRole || "ROLE_STUDENT",
    operatorStatus: registeredUser.operatorStatus || "NONE",
    operatorRequest: registeredUser.operatorRequest || null,
  };

  clearLoginState();

  const storage = keepLogin ? localStorage : sessionStorage;

  storage.setItem("authToken", "dev-access-token");
  storage.setItem("currentUser", JSON.stringify(loginUser));
  storage.setItem("userRole", loginUser.role || "ROLE_STUDENT");

  window.location.href = `./${getRedirectTarget()}`;
});
