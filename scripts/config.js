/**
 * 매년 바뀌는 설정만 이 파일에서 수정하세요.
 * (정적 사이트라 .env를 런타임에 읽지 못하므로 config.js를 사용합니다.)
 */
window.APP_CONFIG = {
  // Apps Script 웹 앱 URL (재배포 후 새 URL로 교체)
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbw1mOO0VYX0X4BQBeAH31L8sTVuBQpX8CYF5RD3pVrmjitXxwL3GYH5LFzn_RwYg3HN/exec",

  // 로컬(Go Live)용 CORS 프록시 — 무료 플랜은 localhost만 허용
  CORS_PROXY_URL: "https://corsproxy.io/?",

  // 브랜드 / 페이지 제목
  BRAND_NAME: "압도",
  PAGE_TITLE_LOGIN: "사전 체크인",
  PAGE_TITLE_ACCOUNT: "회비 미납 안내",
  PAGE_TITLE_FINAL: "최종 안내",

  // 회비 납부 안내 (account.html)
  BANK_NAME: "카카오뱅크",
  BANK_ACCOUNT: "3333-33-8896038",
  BANK_HOLDER: "전수호",
  FEE_AMOUNT: "30,000원",
  DEPOSIT_NAME_HINT: "기수+이름 (예: 12황유상)",

  // 티셔츠 사이즈 (final.html 화면·QR 포함 여부)
  // true: 시트 D열 값을 최종 안내/QR에 표시 · false: 숨김
  SHOW_TSHIRT_SIZE: true,
};

/**
 * Apps Script 요청 URL 만들기
 * - localhost / 127.0.0.1 → corsproxy.io (Go Live)
 * - 그 외(Vercel 등) → /api/proxy (서버리스, 403 없음)
 */
window.buildAppsScriptRequestUrl = function buildAppsScriptRequestUrl(targetUrl) {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
  if (isLocal) {
    return `${window.APP_CONFIG.CORS_PROXY_URL}${encodeURIComponent(targetUrl)}`;
  }
  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
};
