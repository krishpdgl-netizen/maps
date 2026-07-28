// HOW TO INSTALL THIS:
// 1. Open your Google Sheet.
// 2. Extensions -> Apps Script.
// 3. Delete anything in the editor, paste this whole file in.
// 4. Click the disk icon (or Ctrl+S) to save.
// 5. Change SHARED_SECRET below to any random string you make up.
// 6. Deploy -> New deployment -> type: Web app.
//      Execute as: Me
//      Who has access: Anyone
// 7. Click Deploy, authorize it when prompted, then copy the Web App URL —
//    that's your APPS_SCRIPT_URL for Vercel's environment variables.

// Change this to any random string of your choosing — it's a shared
// password between Vercel and this script so random people who guess your
// Web App URL can't read/write your sheet.
const SHARED_SECRET = "CHANGE-THIS-TO-SOMETHING-RANDOM";

function doGet(e) {
  if (e.parameter.secret !== SHARED_SECRET) {
    return jsonResponse({ success: false, message: "Unauthorized" }, 401);
  }

  const action = e.parameter.action;

  if (action === "credentials") {
    return jsonResponse({ success: true, rows: readSheetAsObjects("Credentials") });
  }

  if (action === "customers") {
    return jsonResponse({ success: true, rows: readSheetAsObjects("Customers") });
  }

  return jsonResponse({ success: false, message: "Unknown action" }, 400);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");

  if (body.secret !== SHARED_SECRET) {
    return jsonResponse({ success: false, message: "Unauthorized" }, 401);
  }

  if (body.action === "updateStatus") {
    updateCell("Customers", body.rowNumber, "Status", body.status);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ success: false, message: "Unknown action" }, 400);
}

// ---------- Helpers ----------

function readSheetAsObjects(tabName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(tabName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  const [header, ...rows] = data;

  return rows.map((row, i) => {
    const obj = { _rowNumber: i + 2 }; // +2: header row + 1-indexing
    header.forEach((key, idx) => {
      obj[String(key).trim()] = row[idx] !== undefined ? row[idx] : "";
    });
    return obj;
  });
}

function updateCell(tabName, rowNumber, columnName, value) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(tabName);
  const header = sheet.getDataRange().getValues()[0];
  const colIndex = header.findIndex((h) => String(h).trim() === columnName);
  if (colIndex === -1) throw new Error(`Column "${columnName}" not found in ${tabName}`);
  sheet.getRange(rowNumber, colIndex + 1).setValue(value);
}

function jsonResponse(obj, statusCode) {
  // Apps Script's ContentService doesn't support custom HTTP status codes —
  // the status is encoded in the JSON body itself, and the caller (Vercel)
  // checks obj.success rather than the HTTP status.
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
