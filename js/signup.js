let currentStep = 1;
let selectedRole = "ROLE_STUDENT";

const signupCard = document.querySelector("#signupCard");
const operatorBox = document.querySelector("#operatorRequestBox");
const operatorPendingNotice = document.querySelector("#operatorPendingNotice");

function showStep(step) {
  currentStep = step;

  document.querySelectorAll("[data-step]").forEach((section) => {
    section.classList.toggle("is-active", Number(section.dataset.step) === step);
  });

  document.querySelectorAll("[data-step-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.stepDot) === step);
    dot.classList.toggle("is-done", Number(dot.dataset.stepDot) < step);
  });

  signupCard.classList.toggle("is-operator-form", step === 4 && selectedRole === "ROLE_CLUB_ADMIN_PENDING");
  signupCard.classList.toggle("is-complete", step === 5);
  signupCard.classList.toggle("is-student-complete", step === 5 && selectedRole === "ROLE_STUDENT");
  signupCard.classList.toggle("is-operator-complete", step === 5 && selectedRole === "ROLE_CLUB_ADMIN_PENDING");
}


function buildRegisteredUser() {
  const email = document.querySelector("#schoolEmail")?.value.trim() || "";
  const name = document.querySelector("#signupName")?.value.trim() || "";
  const studentId = document.querySelector("#signupStudentId")?.value.trim() || "";
  const department = document.querySelector("#signupDepartment")?.value.trim() || "";

  const password = document.querySelector("#signupPassword")?.value.trim() || "";

  const user = {
    email,
    name,
    studentId,
    department,
    password,
    role: "ROLE_STUDENT",
    signupRole: selectedRole,
    operatorStatus: selectedRole === "ROLE_CLUB_ADMIN_PENDING" ? "PENDING" : "NONE",
  };

  if (selectedRole === "ROLE_CLUB_ADMIN_PENDING") {
    user.operatorRequest = {
      clubType: document.querySelector("#operatorClubType")?.value || "",
      clubName: document.querySelector("#operatorClubName")?.value.trim() || "",
      clubRole: document.querySelector("#operatorRole")?.value || "",
    };
  }

  return user;
}

function saveRegisteredUser() {
  const user = buildRegisteredUser();

  localStorage.setItem("registeredUser", JSON.stringify(user));

  // 로그인 전에는 가입 정보만 저장하고, 실제 서비스 로그인 상태는 login.html에서 authToken을 저장할 때 시작됨.
  localStorage.removeItem("currentUser");

  return user;
}

function checkRequiredTerms() {
  return Array.from(document.querySelectorAll(".term-check[data-required='true']")).every((input) => input.checked);
}

function validateCurrentStep() {
  if (currentStep === 1) {
    const email = document.querySelector("#schoolEmail").value.trim();
    const code = document.querySelector("#verificationCode").value.trim();

    if (!email || !code) {
      alert("학교 이메일과 인증번호를 입력해주세요.");
      return false;
    }
  }

  if (currentStep === 2) {
    const department = document.querySelector("#signupDepartment").value.trim();
    const studentId = document.querySelector("#signupStudentId").value.trim();
    const name = document.querySelector("#signupName").value.trim();
    const password = document.querySelector("#signupPassword").value.trim();
    const passwordCheck = document.querySelector("#signupPasswordCheck").value.trim();

    const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!department || !studentId || !name || !password || !passwordCheck) {
      alert("기본 정보를 모두 입력해주세요.");
      return false;
    }

    if (!passwordRule.test(password)) {
      alert("비밀번호는 8자 이상, 영문/숫자/특수문자를 모두 포함해야 합니다.");
      return false;
    }

    if (password !== passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return false;
    }
  }

  if (currentStep === 3 && !checkRequiredTerms()) {
    alert("필수 약관에 동의해주세요.");
    return false;
  }

  if (currentStep === 4 && selectedRole === "ROLE_CLUB_ADMIN_PENDING") {
    const type = document.querySelector("#operatorClubType").value;
    const clubName = document.querySelector("#operatorClubName").value.trim();
    const role = document.querySelector("#operatorRole").value;

    if (!type || !clubName || !role) {
      alert("운영자 신청 정보를 모두 입력해주세요.");
      return false;
    }
  }

  return true;
}

function completeSignup() {
  if (!validateCurrentStep()) return;

  /*
    나중에 백엔드 연결:
    일반 회원:
    POST /api/auth/signup
    role: ROLE_STUDENT

    동아리 운영자 신청:
    POST /api/auth/signup
    role: ROLE_STUDENT
    operatorRequest: {
      clubType,
      clubName,
      clubRole
    }

    운영자 신청은 회원가입은 완료되지만, 학교관리자 승인 전까지 승인 대기 상태로 처리.
  */

  const completeTitle = document.querySelector("#completeTitle");
  const completeMessage = document.querySelector("#completeMessage");

  const registeredUser = saveRegisteredUser();

  localStorage.setItem("signupRole", selectedRole);

  if (selectedRole === "ROLE_CLUB_ADMIN_PENDING") {
    localStorage.setItem("signupStatus", "OPERATOR_PENDING");
    operatorPendingNotice.style.display = "block";

    completeTitle.textContent = "회원가입이 완료되었습니다!";
    completeMessage.textContent = "운영자 권한은 학교 승인 후 사용할 수 있습니다.";
  } else {
    localStorage.setItem("signupStatus", "STUDENT_COMPLETED");
    operatorPendingNotice.style.display = "none";

    completeTitle.textContent = "회원가입이 완료되었습니다!";
    completeMessage.textContent = "가입을 환영합니다. 동아리 ON에서 동아리 활동을 함께 즐겨요!";
  }

  showStep(5);
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    showStep(currentStep + 1);
  });
});

document.querySelectorAll("[data-prev]").forEach((button) => {
  button.addEventListener("click", () => {
    showStep(currentStep - 1);
  });
});

document.querySelector("#completeSignupBtn")?.addEventListener("click", completeSignup);

document.querySelectorAll("[data-role-select]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRole = button.dataset.roleSelect;

    document.querySelectorAll("[data-role-select]").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.roleSelect === selectedRole);
    });

    operatorBox.classList.toggle("is-open", selectedRole === "ROLE_CLUB_ADMIN_PENDING");
    signupCard.classList.toggle("is-operator-form", selectedRole === "ROLE_CLUB_ADMIN_PENDING");
  });
});

document.querySelector("#sendCodeBtn")?.addEventListener("click", () => {
  /*
    나중에 백엔드 연결:
    POST /api/auth/email/send-code
  */
  alert("인증번호 발송 준비 완료");
});

document.querySelector("#resendCodeBtn")?.addEventListener("click", () => {
  alert("인증번호 재발송 준비 완료");
});

document.querySelector("#termsAll")?.addEventListener("change", (event) => {
  document.querySelectorAll(".term-check").forEach((input) => {
    input.checked = event.target.checked;
  });
});

document.querySelectorAll(".term-check").forEach((input) => {
  input.addEventListener("change", () => {
    const allChecks = Array.from(document.querySelectorAll(".term-check"));
    document.querySelector("#termsAll").checked = allChecks.every((item) => item.checked);
  });
});

document.querySelector("#signupForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

showStep(1);
