const inquiryContent = document.querySelector("#inquiryContent");
const inquiryCount = document.querySelector("#inquiryCount");

inquiryContent?.addEventListener("input", () => {
  inquiryCount.textContent = `${inquiryContent.value.length}/1000 자`;
});

const INQUIRY_TYPE_MAP = {
  account: "ACCOUNT",
  club: "CLUB",
  application: "APPLICATION",
  system: "SYSTEM",
  etc: "ETC",
  ACCOUNT: "ACCOUNT",
  CLUB: "CLUB",
  APPLICATION: "APPLICATION",
  SYSTEM: "SYSTEM",
  ETC: "ETC",
};

document.querySelector("#inquiryForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isLoggedIn()) {
    openLoginRequiredModal("문의 등록은 로그인 후 이용할 수 있습니다.<br />로그인 페이지로 이동하시겠습니까?");
    return;
  }

  const typeValue = document.querySelector("#inquiryType")?.value || "";
  const title = document.querySelector("#inquirySubject")?.value.trim() || "";
  const content = document.querySelector("#inquiryContent")?.value.trim() || "";

  if (!typeValue || !title || !content) {
    alert("문의 유형, 제목, 내용을 모두 입력해주세요.");
    return;
  }

  const submitButton = event.submitter || document.querySelector("#inquiryForm button[type='submit']");

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "접수 중...";
    }

    const result = await apiRequest("/api/inquiries", {
      method: "POST",
      body: {
        type: INQUIRY_TYPE_MAP[typeValue] || typeValue,
        title,
        content,
        attachmentUrl: null,
      },
    });

    alert(result.message || "문의가 정상적으로 등록되었습니다.");
    document.querySelector("#inquiryForm").reset();
    if (inquiryCount) inquiryCount.textContent = "0/1000 자";
  } catch (error) {
    console.error(error);
    alert(error.message || "문의 등록에 실패했습니다.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "문의 보내기";
    }
  }
});
