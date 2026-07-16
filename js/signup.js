let currentStep = 1;
let selectedRole = "ROLE_STUDENT";

function isOperatorSignup() {
  return selectedRole === "ROLE_CLUB_ADMIN" || selectedRole === "ROLE_CLUB_ADMIN_PENDING";
}

function getOperatorRoleOverrides() {
  try {
    return JSON.parse(localStorage.getItem("operatorRoleOverrides")) || {};
  } catch {
    return {};
  }
}

function saveOperatorRoleOverride(user) {
  if (!user?.email) return;

  const normalizedEmail =
    typeof normalizeOperatorEmail === "function"
      ? normalizeOperatorEmail(user.email)
      : String(user.email || "").trim().toLowerCase();

  if (typeof saveAccountRoleForEmail === "function") {
    saveAccountRoleForEmail(normalizedEmail, "ROLE_CLUB_ADMIN");
  }

  const overrides = getOperatorRoleOverrides();
  overrides[normalizedEmail] = {
    ...overrides[normalizedEmail],
    ...user,
    email: normalizedEmail,
    role: "ROLE_CLUB_ADMIN",
    signupRole: "ROLE_CLUB_ADMIN",
    operatorStatus: "APPROVED",
  };

  localStorage.setItem("operatorRoleOverrides", JSON.stringify(overrides));
  localStorage.setItem("lastOperatorSignupEmail", normalizedEmail);
  localStorage.setItem("lastOperatorSignupUser", JSON.stringify(overrides[normalizedEmail]));
}

let emailVerified = false;
let availableClubs = [];
let selectedOperatorClubId = null;

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

  signupCard.classList.toggle("is-operator-form", step === 4 && isOperatorSignup());
  signupCard.classList.toggle("is-complete", step === 5);
  signupCard.classList.toggle("is-student-complete", step === 5 && selectedRole === "ROLE_STUDENT");
  signupCard.classList.toggle("is-operator-complete", step === 5 && isOperatorSignup());
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
    role: isOperatorSignup() ? "ROLE_CLUB_ADMIN" : (responseData?.role || "ROLE_STUDENT"),
    signupRole: isOperatorSignup() ? "ROLE_CLUB_ADMIN" : selectedRole,
    operatorStatus: responseData?.clubAdminRequestStatus || (isOperatorSignup() ? "APPROVED" : "NONE"),
    createdAt: responseData?.createdAt || "",
  };

  if (isOperatorSignup()) {
    user.operatorRequest = {
      clubId: responseData?.clubId || responseData?.clubAdminRequest?.clubId || selectedOperatorClubId || null,
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

  const signupRole = isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT";

  if (typeof saveSignupAccountForEmail === "function") {
    saveSignupAccountForEmail(user.email, user, signupRole);
  } else if (typeof saveAccountRoleForEmail === "function") {
    saveAccountRoleForEmail(user.email, signupRole);
  }

  if (isOperatorSignup()) {
    saveOperatorRoleOverride(user);
  }

  return user;
}

function saveStoredOperatorUser(user) {
  localStorage.setItem("registeredUser", JSON.stringify(user));
  if (typeof saveSignupAccountForEmail === "function") {
    saveSignupAccountForEmail(user.email, user, "ROLE_CLUB_ADMIN");
  } else if (typeof saveAccountRoleForEmail === "function") {
    saveAccountRoleForEmail(user.email, "ROLE_CLUB_ADMIN");
  }
  saveOperatorRoleOverride(user);
  return user;
}

function isDuplicateEmailError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("이미") ||
    message.includes("가입") ||
    message.includes("duplicate") ||
    message.includes("exist") ||
    message.includes("중복")
  ) && (
    message.includes("이메일") ||
    message.includes("email") ||
    message.includes("회원") ||
    message.includes("user")
  );
}

async function restoreDeletedAccountSignup(values, completeTitle, completeMessage) {
  const normalizedEmail =
    typeof normalizeOperatorEmail === "function"
      ? normalizeOperatorEmail(values.email)
      : String(values.email || "").trim().toLowerCase();

  if (!normalizedEmail || typeof isAccountDeleted !== "function" || !isAccountDeleted(normalizedEmail)) {
    return false;
  }

  // 백엔드 탈퇴 API가 아직 없어 DB에는 계정이 남아 있는 경우가 있습니다.
  // 이때 같은 이메일 회원가입은 백엔드에서 중복 처리되므로, 입력한 비밀번호로 기존 계정 로그인을 확인한 뒤
  // 프론트의 탈퇴 표시를 해제해서 다시 이용할 수 있게 합니다.
  let loginResult;
  try {
    loginResult = await apiRequest("/api/auth/login", {
      method: "POST",
      body: {
        email: values.email,
        password: values.password,
        rememberMe: false,
      },
    });
  } catch (loginError) {
    console.error(loginError);
    alert(
      "백엔드 DB에 기존 계정이 남아 있어서 같은 이메일로 새 회원가입을 할 수 없습니다.\n" +
      "기존 비밀번호가 맞으면 계정 복구로 처리할 수 있는데, 지금 입력한 비밀번호로는 기존 계정 로그인이 실패했습니다.\n\n" +
      "해결 방법: 기존 비밀번호로 로그인하거나, 백엔드 팀에 실제 회원 삭제 API/DB 삭제를 요청해야 합니다."
    );
    return true;
  }

  if (typeof unmarkAccountDeletedForEmail === "function") {
    unmarkAccountDeletedForEmail(normalizedEmail);
  }

  const loginData = {
    ...(loginResult.data || {}),
    email: loginResult.data?.email || normalizedEmail,
  };

  let user = buildRegisteredUser(loginData);
  user.email = normalizedEmail;
  user.role = isOperatorSignup() ? "ROLE_CLUB_ADMIN" : (user.role || "ROLE_STUDENT");
  user.signupRole = isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT";
  user.memberType = isOperatorSignup() ? "CLUB_ADMIN" : "STUDENT";
  user.operatorStatus = isOperatorSignup() ? "APPROVED" : (user.operatorStatus || "NONE");

  if (typeof saveSignupAccountForEmail === "function") {
    saveSignupAccountForEmail(normalizedEmail, user, isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT");
  } else if (typeof saveAccountRoleForEmail === "function") {
    saveAccountRoleForEmail(normalizedEmail, isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT");
  }

  if (isOperatorSignup()) {
    saveStoredOperatorUser(user);
    saveOperatorRoleOverride(user);
  } else {
    localStorage.setItem("registeredUser", JSON.stringify(user));
  }

  localStorage.setItem("signupRole", isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT");
  localStorage.setItem("signupStatus", isOperatorSignup() ? "OPERATOR_COMPLETED" : "STUDENT_COMPLETED");

  completeTitle.textContent = isOperatorSignup()
    ? "운영자 계정이 다시 활성화되었습니다!"
    : "계정이 다시 활성화되었습니다!";
  completeMessage.textContent = "백엔드에 남아 있던 기존 계정을 다시 사용할 수 있게 처리했습니다. 로그인해서 이용해주세요.";

  showStep(5);
  return true;
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

  if (currentStep === 4 && isOperatorSignup()) {
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
    memberType: isOperatorSignup() ? "CLUB_ADMIN" : "STUDENT",
  };

  if (isOperatorSignup()) {
    let clubId = findOperatorClubId();

    if (!clubId) {
      await loadAvailableClubs();
      clubId = findOperatorClubId();
    }

    if (!clubId) {
      alert("운영자로 신청할 동아리를 찾을 수 없습니다. 동아리 이름 대신 clubId 숫자를 입력해보세요.");
      return;
    }

    selectedOperatorClubId = clubId;

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

    if (typeof saveSignupAccountForEmail === "function") {
      saveSignupAccountForEmail(values.email, buildRegisteredUser(result.data || {}), isOperatorSignup() ? "ROLE_CLUB_ADMIN" : "ROLE_STUDENT");
    }

    if (isOperatorSignup()) {
      const savedUser = getSignupValues();
      const operatorUser = buildRegisteredUser(result.data || {});
      operatorUser.operatorRequest = {
        ...(operatorUser.operatorRequest || {}),
        clubId: selectedOperatorClubId,
        clubType: savedUser.operatorClubType,
        clubName: savedUser.operatorClubName,
        clubRole: savedUser.operatorRole,
      };
      saveStoredOperatorUser(operatorUser);
      saveOperatorRoleOverride(operatorUser);

      localStorage.setItem("signupStatus", "OPERATOR_COMPLETED");
      operatorPendingNotice.style.display = "none";

      completeTitle.textContent = "운영자 회원가입이 완료되었습니다!";
      completeMessage.textContent = "로그인 후 마이페이지에서 운영진 메뉴를 바로 사용할 수 있습니다.";
    } else {
      localStorage.setItem("signupStatus", "STUDENT_COMPLETED");
      operatorPendingNotice.style.display = "none";

      completeTitle.textContent = "회원가입이 완료되었습니다!";
      completeMessage.textContent = "가입을 환영합니다. 동아리 ON에서 동아리 활동을 함께 즐겨요!";
    }

    showStep(5);
  } catch (error) {
    console.error(error);

    const completeTitle = document.querySelector("#completeTitle");
    const completeMessage = document.querySelector("#completeMessage");

    if (isDuplicateEmailError(error)) {
      const handled = await restoreDeletedAccountSignup(values, completeTitle, completeMessage);
      if (handled) return;
    }

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

    operatorBox.classList.toggle("is-open", isOperatorSignup());
    signupCard.classList.toggle("is-operator-form", isOperatorSignup());
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
