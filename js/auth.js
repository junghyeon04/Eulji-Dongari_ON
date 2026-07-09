/* =========================================================
   Auth Guard
   현재는 백엔드 연결 전이라 localStorage로 로그인 상태를 임시 관리함.

   로그인 상태:
   localStorage.authToken 존재 여부로 판단

   나중에 연결:
   POST /api/auth/login 성공 시 accessToken 저장
   GET /api/users/me로 사용자 정보/권한 확인
========================================================= */

function isLoggedIn() {
  return Boolean(localStorage.getItem("authToken") || sessionStorage.getItem("authToken"));
}

function getLoginRedirectUrl() {
  const current = window.location.pathname.split("/").pop() + window.location.search;
  return `./login.html?redirect=${encodeURIComponent(current || "index.html")}`;
}

function closeLoginRequiredModal() {
  const modal = document.querySelector("#loginRequiredModal");
  if (modal) modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
}

function goToLoginPage() {
  window.location.href = getLoginRedirectUrl();
}

function openLoginRequiredModal(message) {
  let modal = document.querySelector("#loginRequiredModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "loginRequiredModal";
    modal.className = "login-required-overlay";
    modal.innerHTML = `
      <section class="login-required-modal" role="dialog" aria-modal="true" aria-label="로그인 필요">
        <button type="button" class="login-required-close" aria-label="닫기">×</button>
        <div class="login-required-visual" aria-hidden="true">
          <img src="./images/login-character.svg" alt="" />
        </div>
        <h2>로그인이 필요합니다</h2>
        <p data-login-message>로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?</p>
        <button type="button" class="login-required-button">로그인하러 가기</button>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".login-required-close").addEventListener("click", closeLoginRequiredModal);
    modal.querySelector(".login-required-button").addEventListener("click", goToLoginPage);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeLoginRequiredModal();
    });
  }

  const messageBox = modal.querySelector("[data-login-message]");
  if (messageBox && message) {
    messageBox.innerHTML = message;
  }

  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
}

function requireLogin(message) {
  if (isLoggedIn()) return true;
  openLoginRequiredModal(message);
  return false;
}

function initProtectedLinks() {
  document.querySelectorAll('a[href*="apply.html"], a[href*="mypage.html"], [data-require-login]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.closest(".login-page")) return;
      if (isLoggedIn()) return;

      event.preventDefault();

      const href = link.getAttribute("href") || "";
      const message = href.includes("mypage.html")
        ? "마이페이지는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?"
        : "지원하기는 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?";

      openLoginRequiredModal(message);
    });
  });
}

document.addEventListener("DOMContentLoaded", initProtectedLinks);
