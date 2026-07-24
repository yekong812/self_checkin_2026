/**
 * 매년 / 스프레드시트 구조가 바뀔 때 여기만 수정하세요.
 * 열 인덱스는 0부터 시작합니다. (A=0, B=1, C=2 ...)
 */
const CONFIG = {
  SHEET_NAME: "회비명단",
  COL_GI: 0,
  COL_NAME: 1,
  COL_PAID: 2,
  COL_TSHIRT: 3, // D열 (티셔츠 사이즈)
  PAID_VALUES: ["O", "o"],
  HAS_HEADER: false,
};

function base64Decode(data) {
  const raw = data.replace(/^DATA:/, ''); // 'DATA:' 접두어 제거
  const decoded = Utilities.base64Decode(raw);
  return Utilities.newBlob(decoded).getDataAsString();
}

function doGet(e) {
  try {
    // e가 없거나 parameter가 없는 경우 처리
    if (!e || !e.parameter) {
      return jsonResponse({ 
        success: false, 
        error: "Invalid request parameters" 
      });
    }

    const action = e.parameter.action;
    const gi = normalizeGi(e.parameter.gi);
    const name = e.parameter.name?.trim();

    if (!gi || !name) {
      return jsonResponse({ 
        success: false, 
        error: "Missing parameters" 
      });
    }

    if (action === "verifyLoginAndPayment") {
      return handleVerifyLoginAndPayment(gi, name);
    } else if (action === "getUserInfo") {
      return handleGetUserInfo(gi, name);
    }

    return jsonResponse({ 
      success: false, 
      error: "Invalid action" 
    });
    
  } catch (error) {
    console.error("doGet 오류:", error);
    return jsonResponse({ 
      success: false, 
      error: "서버 오류: " + error.toString() 
    });
  }
}

function normalizeGi(giValue) {
  const numberMatch = giValue?.toString().match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0]) : null;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isPaidStatus(status) {
  return CONFIG.PAID_VALUES.some(
    (v) => String(status).trim() === String(v).trim()
  );
}

function getMinRequiredCols() {
  return Math.max(CONFIG.COL_GI, CONFIG.COL_NAME, CONFIG.COL_PAID) + 1;
}

function getSheetDataRows(sheet) {
  const lastRow = sheet.getLastRow();
  // D열(티셔츠)처럼 일부만 채워진 열도 빠지지 않도록 최소 열 범위 보장
  const lastCol = Math.max(
    sheet.getLastColumn(),
    getMinRequiredCols(),
    (CONFIG.COL_TSHIRT || 0) + 1
  );

  if (lastRow === 0 || lastCol === 0) {
    return null;
  }

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  if (CONFIG.HAS_HEADER && data.length > 0) {
    return data.slice(1);
  }
  return data;
}

// ✅ 1. 로그인 & 명단 확인
function handleVerifyLoginAndPayment(gi, name) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return jsonResponse({ 
        success: false, 
        error: "스프레드시트에 접근할 수 없습니다." 
      });
    }
    
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!paymentSheet) {
      return jsonResponse({ 
        success: false, 
        error: CONFIG.SHEET_NAME + " 시트를 찾을 수 없습니다." 
      });
    }
    
    const data = getSheetDataRows(paymentSheet);
    if (!data) {
      return jsonResponse({ 
        success: false, 
        error: CONFIG.SHEET_NAME + " 시트에 데이터가 없습니다." 
      });
    }

    const minCols = getMinRequiredCols();
    let found = false;
    let paid = false;
    
    for (let row of data) {
      if (!row || row.length < minCols) continue;
      
      const rowGi = normalizeGi(row[CONFIG.COL_GI]);
      const rowName = (row[CONFIG.COL_NAME] + "").trim();
      const status = row[CONFIG.COL_PAID];
      
      if (rowGi === gi && rowName === name) {
        found = true;
        if (isPaidStatus(status)) {
          paid = true;
        }
        break;
      }
    }

    if (!found) {
      return jsonResponse({ success: false });
    }

    return jsonResponse({ success: true, paid });
    
  } catch (error) {
    console.error("handleVerifyLoginAndPayment 오류:", error);
    return jsonResponse({ 
      success: false, 
      error: "서버 오류: " + error.toString() 
    });
  }
}

function checkPaymentStatus(gi, name, ss) {
  try {
    if (!ss) {
      console.error("스프레드시트 객체가 null입니다");
      return false;
    }
    
    // gi를 숫자로 정규화 (타입 일치를 위해)
    const normalizedGi = normalizeGi(gi);
    if (!normalizedGi) {
      console.error("기수 정규화 실패:", gi);
      return false;
    }
    
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!paymentSheet) {
      console.error(CONFIG.SHEET_NAME + " 시트를 찾을 수 없습니다");
      return false;
    }
    
    const data = getSheetDataRows(paymentSheet);
    if (!data) {
      console.error(CONFIG.SHEET_NAME + " 시트에 데이터가 없습니다");
      return false;
    }

    const minCols = getMinRequiredCols();

    for (let row of data) {
      if (!row || row.length < minCols) continue;
      
      const rowGi = normalizeGi(row[CONFIG.COL_GI]);
      const rowName = (row[CONFIG.COL_NAME] + "").trim();
      const status = row[CONFIG.COL_PAID];
      
      // 숫자끼리 비교 (타입 일치)
      if (rowGi === normalizedGi && rowName === name) {
        // null, undefined, 빈 문자열인 경우 false 반환
        if (status === null || status === undefined || status === "") {
          return false;
        }
        return isPaidStatus(status);
      }
    }
    return false;
  } catch (error) {
    console.error("checkPaymentStatus 오류:", error);
    return false;
  }
}

// ✅ 2. 사용자 정보 제공 (기수·이름·티셔츠 사이즈)
function handleGetUserInfo(gi, name) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return jsonResponse({ 
        success: false, 
        error: "스프레드시트에 접근할 수 없습니다." 
      });
    }

    let tshirtSize = "";
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (paymentSheet) {
      const data = getSheetDataRows(paymentSheet);
      if (data) {
        const minCols = Math.max(CONFIG.COL_GI, CONFIG.COL_NAME) + 1;
        for (let row of data) {
          if (!row || row.length < minCols) continue;
          const rowGi = normalizeGi(row[CONFIG.COL_GI]);
          const rowName = (row[CONFIG.COL_NAME] + "").trim();
          if (rowGi === gi && rowName === name) {
            if (row.length > CONFIG.COL_TSHIRT) {
              tshirtSize = String(row[CONFIG.COL_TSHIRT] ?? "").trim();
            }
            break;
          }
        }
      }
    }
    
    return jsonResponse({
      success: true,
      gi: `${gi}기`,
      name: name,
      tshirtSize: tshirtSize
    });
    
  } catch (error) {
    console.error("handleGetUserInfo 오류:", error);
    return jsonResponse({ 
      success: false, 
      error: "서버 오류: " + error.toString() 
    });
  }
}

// 테스트용 함수들
function testSimple() {
  return jsonResponse({
    success: true,
    message: "테스트 성공"
  });
}

function testFindUser() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const responseSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!responseSheet) {
    console.log("시트를 찾을 수 없습니다");
    return;
  }
  
  const data = responseSheet.getDataRange().getValues();
  console.log("전체 데이터:", data);
  
  // 첫 번째 행 확인
  if (data.length > 0) {
    console.log("첫 번째 행:", data[0]);
    console.log("첫 번째 행의 길이:", data[0].length);
  }
}

function testGetUserInfo() {
  const testGi = "19";
  const testName = "이은선";
  
  const result = handleGetUserInfo(testGi, testName);
  console.log("테스트 결과:", result);
  return result;
}

function testCheckPaymentStatus() {
  const testGi = "19";
  const testName = "이은선";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("스프레드시트 객체:", ss ? "존재" : "null");
    
    if (ss) {
      const result = checkPaymentStatus(testGi, testName, ss);
      console.log("명단 확인 결과:", result);
      return result;
    } else {
      console.error("스프레드시트에 접근할 수 없습니다");
      return false;
    }
  } catch (error) {
    console.error("테스트 오류:", error);
    return false;
  }
}

// 더 간단한 테스트 함수
function testCheckPaymentStatusSimple() {
  const testGi = "19";
  const testName = "이은선";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("스프레드시트 객체:", ss ? "존재" : "null");
    
    if (!ss) {
      console.error("스프레드시트에 접근할 수 없습니다");
      return false;
    }
    
    const paymentSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    console.log(CONFIG.SHEET_NAME + " 시트:", paymentSheet ? "존재" : "null");
    
    if (!paymentSheet) {
      console.error(CONFIG.SHEET_NAME + " 시트를 찾을 수 없습니다");
      return false;
    }
    
    const lastRow = paymentSheet.getLastRow();
    const lastCol = paymentSheet.getLastColumn();
    console.log(CONFIG.SHEET_NAME + " 시트 크기:", lastRow, "행 x", lastCol, "열");
    
    const data = getSheetDataRows(paymentSheet);
    if (!data) {
      console.error(CONFIG.SHEET_NAME + " 시트에 데이터가 없습니다");
      return false;
    }
    
    console.log(CONFIG.SHEET_NAME + " 데이터 행 수:", data.length);
    const minCols = getMinRequiredCols();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < minCols) {
        console.log(`행 ${i}: ${minCols}열 미만, 건너뛰기`);
        continue;
      }
      
      const rowGi = normalizeGi(row[CONFIG.COL_GI]);
      const rowName = (row[CONFIG.COL_NAME] + "").trim();
      const status = row[CONFIG.COL_PAID];
      
      console.log(`행 ${i}: 기수=${rowGi}, 이름=${rowName}, 상태=${status}, 찾는값=${testGi}, ${testName}`);
      
      if (rowGi === parseInt(testGi, 10) && rowName === testName) {
        // null, undefined, 빈 문자열인 경우 false 반환
        if (status === null || status === undefined || status === "") {
          console.log("사용자 찾음! 명단 미납부 (null/empty)");
          return false;
        }
        const result = isPaidStatus(status);
        console.log("사용자 찾음! 명단 납부:", result);
        return result;
      }
    }
    
    console.log("사용자를 찾을 수 없습니다");
    return false;
    
  } catch (error) {
    console.error("테스트 오류:", error);
    return false;
  }
}
