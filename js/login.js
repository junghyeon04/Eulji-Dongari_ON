function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
}

function normalizeLoginEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isSavedLoginOperatorEmail(email) {
  const normalizedEmail = normalizeLoginEmail(email);
  if (!normalizedEmail) return false;

  // 로그인 화면 체크박스가 아니라, 회원가입 때 이메일별로 저장한 회원 유형만 봅니다.
  if (typeof getSignupAccountRoleForEmail === "function") {
    const signupRole = getSignupAccountRoleForEmail(normalizedEmail);
    if (signupRole === "ROLE_CLUB_ADMIN") return true;
    if (signupRole === "ROLE_STUDENT") return false;
  }

  const override = typeof getOperatorRoleOverrideByEmail === "function"
    ? getOperatorRoleOverrideByEmail(normalizedEmail)
    : null;
  if (override) return true;

  const hint = typeof getStoredOperatorHintByEmail === "function"
    ? getStoredOperatorHintByEmail(normalizedEmail)
    : null;
  if (hint) return true;

  const savedRole = typeof getAccountRoleForEmail === "function" ? getAccountRoleForEmail(normalizedEmail) : "";
  return savedRole === "ROLE_CLUB_ADMIN";
}

function forceLoginUserAsOperator(user = {}, email = "") {
  const normalizedEmail = normalizeLoginEmail(user.email || email || localStorage.getItem("lastLoginEmail") || "");
  const signupAccount = typeof getSignupAccountByEmail === "function" ? getSignupAccountByEmail(normalizedEmail) : null;
  const override = typeof getOperatorRoleOverrideByEmail === "function" ? getOperatorRoleOverrideByEmail(normalizedEmail) : null;
  const hint = typeof getStoredOperatorHintByEmail === "function" ? getStoredOperatorHintByEmail(normalizedEmail) : null;
  const source = signupAccount || override || hint || {};

  if (typeof saveAccountRoleForEmail === "function") {
    saveAccountRoleForEmail(normalizedEmail, "ROLE_CLUB_ADMIN");
  }

  return {
    ...user,
    ...source,
    email: user.email || source.email || normalizedEmail,
    name: user.name || source.name,
    studentId: user.studentId || user.studentid || source.studentId || source.studentid,
    department: user.department || source.department,
    role: "ROLE_CLUB_ADMIN",
    signupRole: "ROLE_CLUB_ADMIN",
    memberType: "CLUB_ADMIN",
    operatorStatus: "APPROVED",
    operatorRequest: user.operatorRequest || user.clubAdminRequest || source.operatorRequest || source.clubAdminRequest || null,
  };
}

document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const loginId = document.querySelector("#loginId")?.value.trim() || "";
  const loginPassword = document.querySelector("#loginPassword")?.value.trim() || "";
  const keepLogin = document.querySelector("#keepLogin")?.checked || false;

  if (!loginId || !loginPassword) {
    alert("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  const submitButton = event.submitter || document.querySelector("#loginForm button[type='submit']");
  const loginEmail = normalizeLoginEmail(loginId);

  // 백엔드에 실제 탈퇴 API가 없으면 DB에는 계정이 남아 있을 수 있습니다.
  // 그래서 탈퇴 표시가 남아 있어도 로그인 자체를 막지 않고, 성공하면 탈퇴 표시를 해제합니다.
  const wasLocallyDeleted =
    typeof isAccountDeleted === "function" && isAccountDeleted(loginEmail);

  const shouldForceOperatorLogin = isSavedLoginOperatorEmail(loginEmail);

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "로그인 중...";
    }

    localStorage.setItem("lastLoginEmail", loginEmail);

    if (wasLocallyDeleted) {
      console.info("탈퇴 표시가 남아 있는 계정입니다. 서버 로그인이 성공하면 탈퇴 표시를 해제합니다.");
    }

    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: {
        email: loginId,
        password: loginPassword,
        rememberMe: keepLogin,
      },
    });

    if (wasLocallyDeleted && typeof unmarkAccountDeletedForEmail === "function") {
      unmarkAccountDeletedForEmail(loginEmail);
    }

    const loginData = {
      ...(result.data || {}),
      email: result.data?.email || loginEmail,
    };

    let nextUser = saveAuthSession(loginData, keepLogin);

    // 로그인 응답에 role/memberType이 빠져 있으면 현재 사용자 조회 API로 한 번 더 확인합니다.
    // 운영진 계정인데 로그인 응답이 ROLE_STUDENT처럼 내려오는 경우를 막기 위한 처리입니다.
    try {
      const profileResult = await apiRequest("/api/users/me");
      const profile = profileResult.data || profileResult || {};
      const profileRole =
        typeof getRoleFromAuthData === "function"
          ? getRoleFromAuthData(profile)
          : profile.role || profile.memberType || "";

      nextUser = {
        ...nextUser,
        ...profile,
        email: profile.email || nextUser.email || loginEmail,
        role: profileRole || nextUser.role || "ROLE_STUDENT",
        memberType: profile.memberType || profile.membertype || nextUser.memberType || "",
        signupRole: profile.signupRole || nextUser.signupRole || "",
        operatorStatus: profile.operatorStatus || profile.clubAdminRequestStatus || nextUser.operatorStatus || "",
      };
    } catch (profileError) {
      console.warn("내 프로필 조회 실패, 로그인 응답 기준으로 처리:", profileError);
    }

    // 저장된 운영진 가입 기록이 있으면 현재 로그인 이메일에만 운영진 권한을 적용합니다.
    if (typeof applyOperatorRoleOverride === "function") {
      nextUser = applyOperatorRoleOverride({
        ...nextUser,
        email: nextUser.email || loginEmail,
      });
    }

    // 백엔드가 user.role은 STUDENT로 내려줘도, /api/users/me/clubs에서
    // 해당 계정이 동아리 ADMIN/OWNER/MANAGER/회장 등으로 연결되어 있으면 운영진으로 처리합니다.
    if (typeof detectOperatorUserFromMyClubs === "function") {
      nextUser = await detectOperatorUserFromMyClubs({
        ...nextUser,
        email: nextUser.email || loginEmail,
      });
    }

    // 회원가입 때 운영진으로 선택했던 이메일이면 백엔드 응답이 STUDENT여도 운영진으로 처리합니다.
    if (shouldForceOperatorLogin) {
      nextUser = forceLoginUserAsOperator(nextUser, loginEmail);
    }

    const normalizedRole =
      typeof normalizeRoleValue === "function"
        ? normalizeRoleValue(nextUser.role || nextUser.memberType || nextUser.signupRole || "")
        : String(nextUser.role || nextUser.memberType || nextUser.signupRole || "").toUpperCase();

    // 여기서 일반회원으로 저장해 운영진 기록을 덮어쓰지 않습니다.
    // 운영진일 때만 계정별 운영진 기록을 저장합니다.
    if (typeof saveAccountRoleForEmail === "function" && normalizedRole === "ROLE_CLUB_ADMIN") {
      saveAccountRoleForEmail(nextUser.email || loginEmail, "ROLE_CLUB_ADMIN");
    }

    const storage = keepLogin ? localStorage : sessionStorage;
    storage.setItem("currentUser", JSON.stringify(nextUser));
    storage.setItem("userRole", normalizedRole || "ROLE_STUDENT");
    localStorage.setItem("registeredUser", JSON.stringify(nextUser));

    const isOperator = normalizedRole === "ROLE_CLUB_ADMIN";
    const target = getRedirectTarget();

    if (isOperator) {
      window.location.href = "./mypage.html?tab=operator-dashboard";
      return;
    }

    if (target === "mypage.html?tab=operator-dashboard" || target.includes("operator-dashboard")) {
      window.location.href = "./mypage.html";
      return;
    }

    window.location.href = `./${target}`;
  } catch (error) {
    console.error(error);
    alert(error.message || "로그인에 실패했습니다.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "로그인";
    }
  }
});