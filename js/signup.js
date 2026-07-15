let currentStep = 1;
let selectedRole = "ROLE_STUDENT";
let emailVerified = false;
let availableClubs = [];

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

function getSignupValues() {
  return {
    email: document.querySelector("#schoolEmail")?.value.trim() || "",
    name: document.querySelector("#signupName")?.value.trim() || "",
    studentId: document.querySelector("#signupStudentId")?.value.trim() || "",
    department: document.querySelector("#signupDepartment")?.value.trim() || "",
    password: document.querySelector("#signupPassword")?.value.trim() || "",
    passwordCheck: document.querySelector("#signupPasswordCheck")?.value.trim() || "",
    operatorClubType: document.querySelector("#operatorClubType")?.value || "",
    operatorClubName: document.querySelector("#operatorClubName")?.value.trim() || "",
    operatorRole: document.querySelector("#operatorRole")?.value || "",
  };
}

function buildRegisteredUser(responseData = null) {
  const values = getSignupValues();

  const user = {
    userId: responseData?.userId || responseData?.userid || "",
    email: responseData?.email || values.email,
    name: responseData?.name || values.name,
    studentId: responseData?.studentId || responseData?.studentid || values.studentId,
    department: responseData?.department || values.department,
    role: responseData?.role || "ROLE_STUDENT",
    signupRole: selectedRole,
    operatorStatus: responseData?.clubAdminRequestStatus || (selectedRole === "ROLE_CLUB_ADMIN_PENDING" ? "PENDING" : "NONE"),
    createdAt: responseData?.createdAt || "",
  };

  if (selectedRole === "ROLE_CLUB_ADMIN_PENDING") {
    user.operatorRequest = {
      clubType: values.operatorClubType,
      clubName: values.operatorClubName,
      clubRole: values.operatorRole,
      clubAdminRequestId: responseData?.clubAdminRequestId || null,
    };
  }

  return user;
}

function saveRegisteredUser(responseData = null) {
  const user = buildRegisteredUser(responseData);
  localStorage.setItem("registeredUser", JSON.stringify(user));
  localStorage.removeItem("currentUser");
  return user;
}

function checkRequiredTerms() {
  return Array.from(document.querySelectorAll(".term-check[data-required='true']")).every((input) => input.checked);
}

async function verifyEmailCode() {
  const email = document.querySelector("#schoolEmail").value.trim();
  const code = document.querySelector("#verificationCode").value.trim();

  if (emailVerified) return true;

  const result = await apiRequest("/api/auth/email-verifications/confirm", {
    method: "POST",
    body: {
      email,
      code,
    },
  });

  emailVerified = Boolean(result.data?.verified ?? true);
  return emailVerified;
}

async function validateCurrentStep() {
  if (currentStep === 1) {
    const email = document.querySelector("#schoolEmail").value.trim();
    const code = document.querySelector("#verificationCode").value.trim();

    if (!email || !code) {
      alert("학교 이메일과 인증번호를 입력해주세요.");
      return false;
    }

    try {
      await verifyEmailCode();
    } catch (error) {
      console.error(error);
      alert(error.message || "이메일 인증번호 확인에 실패했습니다.");
      return false;
    }
  }

  if (currentStep === 2) {
    const { department, studentId, name, password, passwordCheck } = getSignupValues();
    const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/;

    if (!department || !studentId || !name || !password || !passwordCheck) {
      alert("기본 정보를 모두 입력해주세요.");
      return false;
    }

    if (!/^\d{10}$/.test(studentId)) {
      alert("학번은 10자리 숫자로 입력해주세요.");
      return false;
    }

    if (!passwordRule.test(password)) {
      alert("비밀번호는 8~16자, 영문/숫자/특수문자를 모두 포함해야 합니다.");
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
    const { operatorClubName, operatorRole } = getSignupValues();

    if (!operatorClubName || !operatorRole) {
      alert("운영자 신청 정보를 모두 입력해주세요.");
      return false;
    }
  }

  return true;
}

async function loadAvailableClubs() {
  try {
    const result = await apiRequest("/api/clubs");
    availableClubs = result.data || [];
  } catch {
    availableClubs = [];
  }
}

function findOperatorClubId() {
  const { operatorClubName } = getSignupValues();

  if (/^\d+$/.test(operatorClubName)) {
    return Number(operatorClubName);
  }

  const found = availableClubs.find((club) => club.name === operatorClubName);
  return found?.clubId || null;
}

async function completeSignup() {
  if (!(await validateCurrentStep())) return;

  const values = getSignupValues();

  const body = {
    email: values.email,
    password: values.password,
    name: values.name,
    studentId: values.studentId,
    department: values.department,
    memberType: selectedRole === "ROLE_CLUB_ADMIN_PENDING" ? "CLUB_ADMIN" : "STUDENT",
  };

  if (selectedRole === "ROLE_CLUB_ADMIN_PENDING") {
    let clubId = findOperatorClubId();

    if (!clubId) {
      await loadAvailableClubs();
      clubId = findOperatorClubId();
    }

    if (!clubId) {
      alert("운영자로 신청할 동아리를 찾을 수 없습니다. 동아리 이름 대신 clubId 숫자를 입력해보세요.");
      return;
    }

    body.clubAdminRequest = {
      clubId,
      position: values.operatorRole,
    };
  }

  const completeButton = document.querySelector("#completeSignupBtn");

  try {
    if (completeButton) {
      completeButton.disabled = true;
      completeButton.textContent = "가입 처리 중...";
    }

    const result = await apiRequest("/api/auth/signup", {
      method: "POST",
      body,
    });

    const completeTitle = document.querySelector("#completeTitle");
    const completeMessage = document.querySelector("#completeMessage");

    saveRegisteredUser(result.data);

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
  } catch (error) {
    console.error(error);
    alert(error.message || "회원가입에 실패했습니다.");
  } finally {
    if (completeButton) {
      completeButton.disabled = false;
      completeButton.textContent = "가입하기";
    }
  }
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!(await validateCurrentStep())) return;
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

async function sendVerificationCode() {
  const email = document.querySelector("#schoolEmail")?.value.trim() || "";

  if (!email) {
    alert("학교 이메일을 입력해주세요.");
    return;
  }

  const button = document.querySelector("#sendCodeBtn");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "발송 중...";
    }

    const result = await apiRequest("/api/auth/email-verifications/send", {
      method: "POST",
      body: { email },
    });

    emailVerified = false;

    const devCode = result.data?.devCode ? `\n개발용 인증번호: ${result.data.devCode}` : "";
    alert(`${result.message || "인증번호가 발송되었습니다."}${devCode}`);
  } catch (error) {
    console.error(error);
    alert(error.message || "인증번호 발송에 실패했습니다.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "인증번호 발송";
    }
  }
}

document.querySelector("#sendCodeBtn")?.addEventListener("click", sendVerificationCode);
document.querySelector("#resendCodeBtn")?.addEventListener("click", sendVerificationCode);

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

loadAvailableClubs();
showStep(1);
