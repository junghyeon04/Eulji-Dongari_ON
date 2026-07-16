const loadNotificationsBtn = document.getElementById("loadNotificationsBtn");
const readAllBtn = document.getElementById("readAllBtn");
const notificationSummary = document.getElementById("notificationSummary");
const notificationList = document.getElementById("notificationList");

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

function getNotificationsFromData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (Array.isArray(data.notifications)) return data.notifications;
  return [];
}

function normalizeLinkUrl(linkUrl) {
  if (!linkUrl) return "";
  if (linkUrl.startsWith("http")) return linkUrl;

  // 백엔드가 /clubs/1/posts/15 같은 내부 경로를 내려주면 현재 프론트에서 열 수 있는 페이지로 최소한 연결합니다.
  const clubPostMatch = linkUrl.match(/^\/clubs\/(\d+)\/posts\/(\d+)/);
  if (clubPostMatch) {
    return `./board.html?clubId=${clubPostMatch[1]}&postId=${clubPostMatch[2]}`;
  }

  const clubMatch = linkUrl.match(/^\/clubs\/(\d+)/);
  if (clubMatch) {
    return `./club-detail.html?clubId=${clubMatch[1]}`;
  }

  return linkUrl.startsWith("/") ? `.${linkUrl}` : linkUrl;
}

async function loadNotifications() {
  if (!requireLogin()) return;

  notificationList.innerHTML = `<div class="operator-empty">알림을 불러오는 중입니다...</div>`;

  try {
    const result = await apiRequest("/api/notifications?page=0&size=50");
    const data = getData(result);
    const notifications = getNotificationsFromData(data);

    renderNotifications(notifications);
  } catch (error) {
    console.error(error);
    notificationSummary.textContent = "알림 목록을 불러오지 못했습니다.";
    notificationList.innerHTML = `
      <div class="operator-empty error">
        알림 목록을 불러오지 못했습니다.<br />백엔드 notifications 테이블 또는 권한 설정을 확인해주세요.
      </div>
    `;
  }
}

function renderNotifications(notifications) {
  if (!notifications.length) {
    notificationSummary.textContent = "알림이 없습니다.";
    notificationList.innerHTML = `<div class="operator-empty">알림이 없습니다.</div>`;
    return;
  }

  const unreadCount = notifications.filter((item) => item.read === false || item.isRead === false).length;
  notificationSummary.textContent = `총 ${notifications.length}개 알림 / 읽지 않은 알림 ${unreadCount}개`;

  notificationList.innerHTML = notifications
    .map((notification) => {
      const notificationId = notification.notificationId || notification.id;
      const isRead = notification.read === true || notification.isRead === true;
      const linkUrl = normalizeLinkUrl(notification.linkUrl || "");

      return `
        <article class="notification-page-item ${isRead ? "is-read" : "is-unread"}" data-notification-id="${notificationId}">
          <div class="notification-page-icon">${isRead ? "읽음" : "새 알림"}</div>
          <div class="notification-page-main">
            <div class="notification-page-head">
              <strong>${escapeHtml(notification.title || "알림")}</strong>
              <em>${escapeHtml(notification.createdAt || notification.createdDate || "")}</em>
            </div>
            <p>${escapeHtml(notification.content || "")}</p>
            <div class="notification-page-actions">
              ${linkUrl ? `<a href="${escapeHtml(linkUrl)}">관련 화면 열기</a>` : ""}
              ${!isRead ? `<button type="button" data-action="read">읽음 처리</button>` : ""}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  bindNotificationButtons();
}

function bindNotificationButtons() {
  document.querySelectorAll('.notification-page-item button[data-action="read"]').forEach((button) => {
    button.onclick = async function () {
      const item = button.closest(".notification-page-item");
      const notificationId = item?.dataset.notificationId;

      if (!notificationId) return;

      button.disabled = true;

      try {
        await apiRequest(`/api/notifications/${notificationId}/read`, {
          method: "PATCH",
        });
        await loadNotifications();
      } catch (error) {
        console.error(error);
        alert(error.message || "알림 읽음 처리에 실패했습니다.");
      } finally {
        button.disabled = false;
      }
    };
  });
}

async function readAllNotifications() {
  if (!requireLogin()) return;
  if (!confirm("모든 알림을 읽음 처리할까요?")) return;

  readAllBtn.disabled = true;

  try {
    await apiRequest("/api/notifications/read-all", {
      method: "PATCH",
    });
    await loadNotifications();
  } catch (error) {
    console.error(error);
    alert(error.message || "모든 알림 읽음 처리에 실패했습니다.");
  } finally {
    readAllBtn.disabled = false;
  }
}

loadNotificationsBtn.addEventListener("click", loadNotifications);
readAllBtn.addEventListener("click", readAllNotifications);

loadNotifications();
