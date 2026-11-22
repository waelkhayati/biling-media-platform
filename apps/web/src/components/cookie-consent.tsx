"use client";

import { useEffect, useState } from "react";

type Choice = "all" | "necessary";
const name = "biling-cookie-preferences";
function read() { return document.cookie.split("; ").find((item) => item.startsWith(name + "=")); }
function save(choice: Choice) {
  const value = encodeURIComponent(JSON.stringify({ version: 1, necessary: true, preferences: choice === "all", analytics: false }));
  document.cookie = `${name}=${value}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(!read()), []);
  if (!open) return null;
  return <aside className="cookie-consent" aria-label="Cookie choices" role="dialog"><div><strong>Cookies, with a reason.</strong><p>We use essential cookies to keep you signed in and protect forms. We do not load advertising or analytics cookies. Your choice is saved so we do not ask every visit.</p><a href="/cookies">Read the cookie notice</a></div><div className="cookie-actions"><button onClick={() => { save("necessary"); setOpen(false); }}>Essential only</button><button className="cookie-accept" onClick={() => { save("all"); setOpen(false); }}>Save preferences</button></div></aside>;
}
