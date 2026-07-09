const inquiryContent = document.querySelector("#inquiryContent");
const inquiryCount = document.querySelector("#inquiryCount");

inquiryContent?.addEventListener("input", () => {
  inquiryCount.textContent = `${inquiryContent.value.length}/1000 자`;
});

document.querySelector("#inquiryForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  /*
    나중에 백엔드 연결:
    POST /api/inquiries
    {
      type,
      subject,
      content,
      attachment
    }
  */

  alert("문의가 접수될 준비가 완료되었습니다.");
});
