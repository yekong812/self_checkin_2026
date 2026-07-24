window.onload = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gi = urlParams.get("gi");
    const name = urlParams.get("name");
    const loadingEl = document.getElementById("loading");
    const infoEl = document.getElementById("info");
    const qrcodeEl = document.getElementById("qrcode");
  
    if (!gi || !name) {
      showError("정보를 불러올 수 없습니다.");
      return;
    }
  
    // 로딩 상태 시작
    loadingEl.style.display = "block";
    infoEl.style.display = "none";
    qrcodeEl.style.display = "none";
  
    try {
      const { APPS_SCRIPT_URL } = window.APP_CONFIG;
      const targetUrl = `${APPS_SCRIPT_URL}?action=getUserInfo&gi=${encodeURIComponent(gi)}&name=${encodeURIComponent(name)}`;
      const proxyUrl = window.buildAppsScriptRequestUrl(targetUrl);
      const res = await fetch(proxyUrl);
  
      // Google Apps Script 응답은 text/plain으로 올 수 있으므로 헤더 체크 제거
      // const contentType = res.headers.get("content-type");
      // if (!contentType || !contentType.includes("application/json")) {
      //   throw new Error("Invalid response type");
      // }
  
            let data;
      try {
        // 응답 텍스트를 먼저 확인
        const responseText = await res.text();
        console.log("서버 응답 텍스트:", responseText);
        
        // JSON 파싱 시도
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON 파싱 오류:", parseError);
        console.error("응답 상태:", res.status);
        console.error("응답 헤더:", res.headers);
        showError("서버 응답 형식 오류입니다.");
        return;
      }

      if (!data.success) {
        const errorMessage = data.error || "정보를 불러올 수 없습니다.";
        showError(errorMessage);
        return;
      }
  
      const showTshirt = !!window.APP_CONFIG.SHOW_TSHIRT_SIZE;
      const tshirtSize = (data.tshirtSize || "").trim();

      // 사용자 정보 표시
      let infoText = `
        <p><strong>기수 :</strong> ${data.gi}</p>
        <p><strong>이름 :</strong> ${data.name}</p>
      `;
      if (showTshirt) {
        infoText += `<p><strong>티셔츠 :</strong> ${tshirtSize || "-"}</p>`;
      }
      document.getElementById("info").innerHTML = infoText;
  
      // 텍스트 형식으로 QR 코드 데이터 생성
      // SHOW_TSHIRT_SIZE === true 이면 반드시 "티셔츠: ..." 포함
      let qrText = `기수: ${data.gi}, 이름: ${data.name}`;
      if (showTshirt) {
        qrText += `, 티셔츠: ${tshirtSize || "-"}`;
      }
      console.log("QR 원문:", qrText);
      
      // 텍스트를 Base64로 인코딩 (스캔 후 DATA: 제거 → Base64 디코드하면 위 원문이 나옴)
      const encodedData = btoa(unescape(encodeURIComponent(qrText)));
      
      // QR 코드 생성
      const qrContent = `DATA:${encodedData}`;
      QRCode.toCanvas(document.getElementById("qrcode"), qrContent, error => {
        if (error) console.error(error);
      });
  
      // 로딩 완료 후 콘텐츠 표시
      loadingEl.style.display = "none";
      infoEl.style.display = "block";
      qrcodeEl.style.display = "block";
  
    } catch (err) {
      console.error(err);
      showError("서버 응답 오류입니다.");
    } finally {
      // 로딩 상태 종료
      loadingEl.style.display = "none";
    }
  };
  
  function showError(message) {
    document.getElementById("info").innerHTML = `<p class="warning">${message}</p>`;
  }
  
  function goHome() {
    window.location.href = "index.html";
  }
