async function handleLogin() {
    const gi = document.getElementById("gi").value.trim();
    const name = document.getElementById("name").value.trim();
    const errorEl = document.getElementById("error-message");
    const loginBtn = document.getElementById("login-btn");
    const loadingEl = document.getElementById("loading");
  
    errorEl.style.display = "none";
    errorEl.innerText = "";
  
    if (!gi || !name) {
      errorEl.innerText = "기수와 이름을 모두 입력해주세요.";
      errorEl.style.display = "block";
      return;
    }
  
    // 로딩 상태 시작
    loginBtn.disabled = true;
    loginBtn.textContent = "확인 중...";
    loadingEl.style.display = "block";

    const { APPS_SCRIPT_URL } = window.APP_CONFIG;
    const targetUrl = `${APPS_SCRIPT_URL}?action=verifyLoginAndPayment&gi=${encodeURIComponent(gi)}&name=${encodeURIComponent(name)}`;
    const proxyUrl = window.buildAppsScriptRequestUrl(targetUrl);

  
    try {
      const res = await fetch(proxyUrl);
      
      // 응답 상태 확인
      if (!res.ok) {
        const errorText = await res.text();
        console.error("서버 응답 오류:", res.status, errorText);
        errorEl.innerText = `서버 오류 (${res.status}): ${res.status === 403 ? "접근 권한이 없습니다. Google Apps Script 배포 설정을 확인해주세요." : "서버 연결에 실패했습니다."}`;
        errorEl.style.display = "block";
        return;
      }
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const responseText = await res.text();
        console.error("JSON 파싱 오류:", parseError, "응답:", responseText);
        errorEl.innerText = "서버 응답 형식 오류입니다.";
        errorEl.style.display = "block";
        return;
      }

      if (!data.success) {
        errorEl.innerText = data.error || "입력하신 정보가 등록되어 있지 않습니다.";
        errorEl.style.display = "block";
      } else if (data.paid) {
        window.location.href = `final.html?gi=${encodeURIComponent(gi)}&name=${encodeURIComponent(name)}`;
      } else {
        window.location.href = `account.html?gi=${encodeURIComponent(gi)}&name=${encodeURIComponent(name)}`;
      }
    } catch (err) {
      errorEl.innerText = "서버 연결에 실패했습니다.";
      errorEl.style.display = "block";
      console.error("에러 상세:", err);
    } finally {
      // 로딩 상태 종료
      loginBtn.disabled = false;
      loginBtn.textContent = "로그인";
      loadingEl.style.display = "none";
    }
  }
