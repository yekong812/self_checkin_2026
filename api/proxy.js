/**
 * Vercel 서버리스 프록시
 * - 브라우저 → /api/proxy → Apps Script (서버에서 호출이라 CORS 없음)
 * - corsproxy.io 는 localhost만 무료 허용이라 배포용으로 이걸 씁니다.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).json({ success: false, error: "Missing url parameter" });
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return res.status(400).json({ success: false, error: "Invalid url" });
  }

  // Apps Script 웹 앱만 허용
  if (
    parsed.hostname !== "script.google.com" &&
    parsed.hostname !== "script.googleusercontent.com"
  ) {
    return res.status(403).json({ success: false, error: "URL not allowed" });
  }

  try {
    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const text = await upstream.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: "Upstream fetch failed: " + (err && err.message ? err.message : String(err)),
    });
  }
}
