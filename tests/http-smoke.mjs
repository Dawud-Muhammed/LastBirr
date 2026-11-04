// Run against an already-running local server. No credentials or financial writes.
import assert from "node:assert/strict";
const base = process.env.LASTBIRR_TEST_URL || "http://127.0.0.1:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("HTTP smoke tests must target localhost.");
for (const path of ["/", "/login", "/register", "/forgot-password"]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok((await response.text()).includes("LastBirr"), path);
  console.log(`PASS public ${path}`);
}
for (const path of [
  "/dashboard",
  "/transactions",
  "/plan",
  "/insights",
  "/settings",
  "/onboarding",
  "/reset-password",
]) {
  const response = await fetch(base + path, { redirect: "manual" });
  const html = await response.text();
  const redirected =
    response.headers.get("location")?.includes("/login") ||
    (html.includes("NEXT_REDIRECT") && html.includes("/login"));
  assert.ok(redirected, `Anonymous route not protected: ${path}`);
  console.log(`PASS protected ${path}`);
}
for (const path of [
  "/auth/callback?next=https://example.com",
  "/auth/confirm?token_hash=invalid&type=unknown",
]) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location"), base);
  assert.equal(destination.origin, new URL(base).origin);
  assert.equal(destination.pathname, "/login");
  console.log(`PASS invalid auth link ${path.split("?")[0]}`);
}
const localized = await fetch(base + "/login", {
  headers: { Cookie: "NEXT_LOCALE=am" },
});
const localizedHtml = await localized.text();
assert.ok(localizedHtml.includes('lang="am"'));
assert.ok(localizedHtml.includes("የኢሜይል አድራሻ"));
console.log("PASS Amharic server rendering");
const missing = await fetch(base + "/missing-lastbirr-page");
assert.equal(missing.status, 404);
console.log("PASS localized 404");
