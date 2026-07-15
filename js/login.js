function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
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

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "로그인 중...";
    }

    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: {
        email: loginId,
        password: loginPassword,
        rememberMe: keepLogin,
      },
    });

    const user = saveAuthSession(result.data, keepLogin);

    // 백엔드 응답에 email이 없을 수도 있어서 로그인 입력값을 보관
    if (!user.email) {
      const storage = keepLogin ? localStorage : sessionStorage;
      const nextUser = {
        ...user,
        email: loginId,
      };
      storage.setItem("currentUser", JSON.stringify(nextUser));
      localStorage.setItem("registeredUser", JSON.stringify(nextUser));
    }

    window.location.href = `./${getRedirectTarget()}`;
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
