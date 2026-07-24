# 사전 체크인 (정적 HTML + Google Apps Script)

기수·이름으로 로그인하면 Google 스프레드시트 명단을 조회하고, 회비 납부 여부에 따라 **미납 안내** 또는 **QR 최종 안내**로 보내는 체크인 페이지입니다.

이 프로젝트는 `.env`를 쓰지 않습니다. 매년(또는 행사마다) 바꿀 값은 아래 **두 파일**만 수정하면 됩니다.

| 역할 | 파일 |
|------|------|
| 프론트(화면·계좌·Apps Script URL·티셔츠 표시 on/off) | `scripts/config.js` |
| 백엔드(시트·열 구조) | `code.gs` 상단 `CONFIG` |

---

## 전체 흐름

1. 사용자가 `index.html`에서 기수·이름 입력 → 로그인
2. 프론트가 Apps Script 웹 앱을 호출해 명단·납부 여부 확인
3. **미납** → `account.html` (계좌·회비 안내)
4. **납부 완료** → `final.html` (환영 + QR 코드, 설정 시 티셔츠 사이즈 포함)

---

## 파일 구성

```
checkin_2026_s/
├── index.html          # 로그인(사전 체크인)
├── account.html        # 회비 미납 안내
├── final.html          # 납부 확인 후 QR 안내
├── styles.css
├── code.gs             # Google Apps Script 백엔드 (배포용)
├── scripts/
│   ├── config.js       # ★ 매년 바꿀 프론트 설정
│   ├── main.js         # 로그인 로직
│   └── final.js        # 최종 안내·QR 로직
└── fonts/
```

로컬에서 HTML을 열어 화면만 확인할 수 있고, **실제 로그인·명단 조회는 Apps Script 배포 + 스프레드시트 연동**이 필요합니다.

---

## 1. 프론트 설정 — `scripts/config.js` (필수)

매년/행사마다 여기만 고치면 UI 문구·계좌·서버 URL·티셔츠 표시 여부가 반영됩니다.

```js
window.APP_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/....../exec",
  CORS_PROXY_URL: "https://corsproxy.io/?",

  BRAND_NAME: "압도",
  PAGE_TITLE_LOGIN: "사전 체크인",
  PAGE_TITLE_ACCOUNT: "회비 미납 안내",
  PAGE_TITLE_FINAL: "최종 안내",

  BANK_NAME: "카카오뱅크",
  BANK_ACCOUNT: "3333-33-8896038",
  BANK_HOLDER: "전수호",
  FEE_AMOUNT: "30,000원",
  DEPOSIT_NAME_HINT: "기수+이름 (예: 12황유상)",

  // 티셔츠 사이즈를 최종 안내 화면·QR에 넣을지
  SHOW_TSHIRT_SIZE: true,
};
```

### 항목 설명

| 키 | 어디에 쓰이나 | 무엇을 넣나 |
|----|----------------|-------------|
| `APPS_SCRIPT_URL` | 로그인·최종 안내 API 호출 | Apps Script **웹 앱 배포** 후 나온 URL (`.../exec`로 끝남). 재배포하면 URL이 바뀔 수 있으니 그때마다 교체 |
| `CORS_PROXY_URL` | 브라우저 → Apps Script CORS 우회 | 기본값 `https://corsproxy.io/?` 유지. 프록시가 막히면 다른 CORS 프록시로 변경 |
| `BRAND_NAME` | 로그인·미납 페이지 로고 글자 | 행사/캠프 이름 (예: `압도`, `I'm G-root`) |
| `PAGE_TITLE_LOGIN` | `index.html` 제목·탭 타이틀 | 예: `사전 체크인` |
| `PAGE_TITLE_ACCOUNT` | `account.html` 제목·탭 타이틀 | 예: `회비 미납 안내` |
| `PAGE_TITLE_FINAL` | `final.html` 탭 타이틀 | 예: `최종 안내` |
| `BANK_NAME` | 미납 페이지 계좌 줄 | 은행명 |
| `BANK_ACCOUNT` | 미납 페이지 계좌 줄 | 계좌번호 |
| `BANK_HOLDER` | 미납 페이지 계좌 줄 | 예금주 |
| `FEE_AMOUNT` | 미납 페이지 회비 줄 | 표시용 문자열 (예: `30,000원`) |
| `DEPOSIT_NAME_HINT` | 미납 페이지 입금자명 안내 | 예: `기수+이름 (예: 12황유상)` |
| `SHOW_TSHIRT_SIZE` | 최종 안내 화면·QR | `true`면 티셔츠 사이즈 표시/QR 포함, `false`면 숨김 |

> HTML에 적힌 기본 문구는 `config.js`가 로드되면 덮어씁니다. **실제 운영 값은 항상 `config.js` 기준**입니다.

---

## 2. 백엔드 설정 — `code.gs` 상단 `CONFIG` (필수)

스프레드시트 구조에 맞게 열·시트 이름을 맞춥니다. 열 인덱스는 **0부터**입니다. (`A=0`, `B=1`, `C=2`, `D=3` …)

```js
const CONFIG = {
  SHEET_NAME: "회비명단",
  COL_GI: 0,
  COL_NAME: 1,
  COL_PAID: 2,
  COL_TSHIRT: 3,
  PAID_VALUES: ["O", "o"],
  HAS_HEADER: false,
};
```

### 항목 설명

| 키 | 의미 | 예시 |
|----|------|------|
| `SHEET_NAME` | 명단이 있는 **시트 탭 이름** (정확히 일치) | `"회비명단"` |
| `COL_GI` | 기수가 있는 열 인덱스 | `0` → A열 |
| `COL_NAME` | 이름이 있는 열 인덱스 | `1` → B열 |
| `COL_PAID` | 납부 여부가 있는 열 인덱스 | `2` → C열 |
| `COL_TSHIRT` | 티셔츠 사이즈 열 인덱스 | `3` → D열 |
| `PAID_VALUES` | “납부 완료”로 인정할 셀 값 목록 | `["O", "o"]` — 대소문자·표기가 다르면 여기에 추가 |
| `HAS_HEADER` | 1행이 헤더인지 | `true`면 1행을 건너뛰고 2행부터 검색, `false`면 1행부터 데이터 |

### 스프레드시트 예시 (기본 설정 기준)

| A (기수) | B (이름) | C (납부) | D (티셔츠 사이즈) |
|----------|----------|----------|-------------------|
| 17 | 홍길동 | O | L |
| 12 | 황유상 |  | M |

- 기수는 `17`, `17기`처럼 숫자만 있으면 매칭됩니다.
- 이름은 공백을 제외한 **완전 일치**입니다.
- C열이 `PAID_VALUES`에 있으면 납부 완료 → `final.html`, 아니면 미납 → `account.html`.
- D열은 `SHOW_TSHIRT_SIZE: true`일 때 최종 안내 화면과 QR에 포함됩니다.

시트 탭 이름·열 순서를 바꾸면 **반드시 `CONFIG`도 같이** 바꾸세요.

---

## 3. Google Apps Script 배포 방법

1. 명단용 **Google 스프레드시트**를 준비합니다. (위 열 구조에 맞게 작성)
2. 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
3. 편집기에 있는 코드를 지우고, 이 저장소의 `code.gs` 내용을 **전부 붙여넣기** 한 뒤 저장합니다.
4. **배포 → 새 배포**  
   - 유형: **웹 앱**  
   - 실행 계정: **나**  
   - 액세스 권한: **모든 사용자** (또는 조직 정책에 맞게 공개)  
5. 배포 후 나온 **웹 앱 URL**을 복사합니다.
6. `scripts/config.js`의 `APPS_SCRIPT_URL`에 붙여넣습니다.

### 코드/`CONFIG`를 바꾼 뒤

Apps Script에서 **새 버전으로 다시 배포**해야 반영됩니다.  
재배포 후 URL이 바뀌면 `APPS_SCRIPT_URL`도 다시 맞춰 주세요.

### 배포 권한 관련

로그인 시 `403`이 나면 Apps Script 웹 앱 **액세스 권한**이 너무 좁은 경우가 많습니다. 배포 설정을 다시 확인하세요.  
`413`이 나고 브라우저에서 URL을 열었을 때 구글 로그인 화면이 보이면, 액세스 권한이 **모든 사용자**가 아닌 것입니다.

---

## 4. 프론트 페이지 호스팅

정적 파일이므로 GitHub Pages, Netlify, Cloudflare Pages, 또는 임의의 정적 서버에 올리면 됩니다.

올릴 때 최소 포함:

- `index.html`, `account.html`, `final.html`
- `styles.css`
- `scripts/` 전체 (`config.js`, `main.js`, `final.js`)
- `fonts/` (폰트 사용 시)

`config.js`의 `APPS_SCRIPT_URL`이 **배포된 Apps Script URL**과 일치하는지 올린 뒤에도 확인하세요.

로컬 확인만 할 때는 폴더를 연 뒤 `index.html`을 브라우저로 열면 됩니다. (CORS·프록시 때문에 실제 API는 배포 환경에서 더 안정적일 수 있습니다.)

---

## 5. 매년(행사마다) 체크리스트

복사해서 쓰면 됩니다.

- [ ] 스프레드시트 명단 갱신 (기수·이름·납부·티셔츠 열)
- [ ] 시트 구조가 바뀌었으면 `code.gs`의 `CONFIG` 수정 후 **재배포**
- [ ] 새 배포 URL을 `scripts/config.js`의 `APPS_SCRIPT_URL`에 반영
- [ ] `BRAND_NAME`, 페이지 제목 문구 수정
- [ ] `BANK_*`, `FEE_AMOUNT`, `DEPOSIT_NAME_HINT` 수정
- [ ] 티셔츠 쓸지 → `SHOW_TSHIRT_SIZE`를 `true`/`false`
- [ ] 프론트 정적 파일 재업로드/배포
- [ ] 테스트: 납부자 1명 → `final.html`, 미납자 1명 → `account.html`, 없는 이름 → 오류 메시지

---

## 6. 자주 하는 실수

| 증상 | 확인 |
|------|------|
| “등록되어 있지 않습니다” | 시트에 기수·이름이 있는지, 이름 오타·공백, `COL_*` 열이 맞는지 |
| 항상 미납으로 감 | 납부 열 값이 `PAID_VALUES`와 정확히 같은지 (`O` vs `○` vs `완료` 등) |
| 시트/데이터 오류 | `SHEET_NAME`이 탭 이름과 동일한지, `HAS_HEADER`가 실제 시트와 맞는지 |
| 티셔츠가 안 보임 | `SHOW_TSHIRT_SIZE`가 `true`인지, `code.gs` 재배포 여부, D열(`COL_TSHIRT`) 값 |
| 서버 연결/CORS 실패 | `APPS_SCRIPT_URL` 오타, 배포 권한, `CORS_PROXY_URL` 동작 여부 |
| 설정 바꿨는데 안 바뀜 | 프론트는 `config.js` 캐시·재업로드, 백엔드는 Apps Script **새 버전 배포** |

---

## 7. 건드리지 않아도 되는 파일

평소 운영·연도 교체만 할 때는 아래를 수정할 필요가 없습니다.

- `scripts/main.js`, `scripts/final.js` — 로직
- `index.html`, `account.html`, `final.html` — 구조 (문구는 `config.js`로 덮어씀)
- `styles.css`, `fonts/` — 디자인

로직이나 UI를 바꿀 때만 수정하세요.