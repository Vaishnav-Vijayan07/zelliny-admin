// Tracking scripts (Meta, Google, TikTok, LinkedIn, custom) — kept in this browser. Swap for API calls later.
import { useSyncExternalStore } from "react";

export type Place = "head" | "bodyStart" | "bodyEnd";
export interface Version {
  v: string;
  by: string;
  when: string;
  note: string;
  code: string;
}
export interface Script {
  id: string;
  name: string;
  type: string;
  place: Place;
  pages: string;
  consent: boolean;
  on: boolean;
  code: string;
  versions: Version[];
}

export const TYPES: Record<string, [string, string]> = {
  "Meta Pixel": ["#1877F2", "f"],
  "Google Tag Manager": ["#246FDB", "GTM"],
  "Google Analytics 4": ["#E37400", "GA"],
  "TikTok Pixel": ["#111111", "TT"],
  "LinkedIn Insight Tag": ["#0A66C2", "in"],
  "Custom script": ["#767676", "</>"],
};
export const PLACES: { key: Place; label: string; hint: string }[] = [
  { key: "head", label: "In <head>", hint: "Loads first. Most pixels and Tag Manager go here." },
  {
    key: "bodyStart",
    label: "Start of <body>",
    hint: "Right after the page opens. Tag Manager's second part.",
  },
  { key: "bodyEnd", label: "Before </body>", hint: "Loads last. Chat widgets and slower scripts." },
];
export const PAGES = [
  "All pages",
  "Home page only",
  "Product pages",
  "Bag & checkout",
  "Order confirmation only",
];
export const placeLabel = (k: Place) => PLACES.find((p) => p.key === k)?.label ?? "";

export const SNIPPETS: Record<string, string> = {
  "Meta Pixel":
    "<!-- Meta Pixel -->\n<script>\n!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\n/* … Meta's code … */}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '1234567890123456');\nfbq('track', 'PageView');\n</script>",
  "Google Tag Manager":
    "<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});/* … Google's code … */\n})(window,document,'script','dataLayer','GTM-ABC1234');</script>",
  "Google Analytics 4":
    "<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXX');\n</script>",
  "TikTok Pixel":
    "<!-- TikTok Pixel -->\n<script>\n!function (w, d, t) { w.TiktokAnalyticsObject=t; /* … TikTok's code … */\n  ttq.load('CXXXXXXXXXXXXX'); ttq.page();\n}(window, document, 'ttq');\n</script>",
  "LinkedIn Insight Tag":
    '<script type="text/javascript">\n_linkedin_partner_id = "1234567";\n/* … LinkedIn\'s code … */\n</script>',
  "Custom script": "<script>\n  // Paste the code you were given here\n</script>",
};

const ver = (v: string, when: string, note: string, code: string): Version => ({
  v,
  by: "Ramy Bakr",
  when,
  note,
  code,
});
let scripts: Script[] = [
  {
    id: "s1",
    name: "Meta Pixel — Zelliny Egypt",
    type: "Meta Pixel",
    place: "head",
    pages: "All pages",
    consent: true,
    on: true,
    code: SNIPPETS["Meta Pixel"]!,
    versions: [
      ver("v3", "24 Sep 2026, 11:20", "Added the Purchase event", SNIPPETS["Meta Pixel"]!),
      ver("v2", "2 Sep 2026, 16:05", "New pixel ID", SNIPPETS["Meta Pixel"]!),
      ver("v1", "14 Aug 2026, 10:00", "First added", SNIPPETS["Meta Pixel"]!),
    ],
  },
  {
    id: "s2",
    name: "Google Tag Manager",
    type: "Google Tag Manager",
    place: "head",
    pages: "All pages",
    consent: true,
    on: true,
    code: SNIPPETS["Google Tag Manager"]!,
    versions: [ver("v1", "14 Aug 2026, 10:12", "First added", SNIPPETS["Google Tag Manager"]!)],
  },
  {
    id: "s3",
    name: "Google Analytics 4",
    type: "Google Analytics 4",
    place: "head",
    pages: "All pages",
    consent: true,
    on: false,
    code: SNIPPETS["Google Analytics 4"]!,
    versions: [
      ver(
        "v1",
        "14 Aug 2026, 10:15",
        "Added — switched off, runs through Tag Manager instead",
        SNIPPETS["Google Analytics 4"]!,
      ),
    ],
  },
  {
    id: "s4",
    name: "TikTok Pixel",
    type: "TikTok Pixel",
    place: "head",
    pages: "All pages",
    consent: true,
    on: false,
    code: SNIPPETS["TikTok Pixel"]!,
    versions: [
      ver("v1", "20 Sep 2026, 13:40", "Ready for the TikTok launch", SNIPPETS["TikTok Pixel"]!),
    ],
  },
  {
    id: "s5",
    name: "LinkedIn Insight — corporate gifting",
    type: "LinkedIn Insight Tag",
    place: "bodyEnd",
    pages: "All pages",
    consent: true,
    on: false,
    code: SNIPPETS["LinkedIn Insight Tag"]!,
    versions: [ver("v1", "20 Sep 2026, 13:45", "Added", SNIPPETS["LinkedIn Insight Tag"]!)],
  },
  {
    id: "s6",
    name: "Purchase conversion — order confirmation",
    type: "Custom script",
    place: "bodyEnd",
    pages: "Order confirmation only",
    consent: true,
    on: true,
    code: "<script>\n  fbq('track', 'Purchase', {value: {{order_total}}, currency: 'EGP'});\n  ttq.track('CompletePayment', {value: {{order_total}}, currency: 'EGP'});\n</script>",
    versions: [
      ver("v2", "24 Sep 2026, 11:25", "Added TikTok", ""),
      ver("v1", "14 Aug 2026, 10:30", "First added", ""),
    ],
  },
];
scripts[5]!.versions.forEach((v) => {
  v.code = scripts[5]!.code;
});

const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
export const useScripts = () =>
  useSyncExternalStore(
    sub,
    () => scripts,
    () => scripts,
  );

const stamp = () => {
  const d = new Date();
  return `Today, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
/** A script must look like real markup before it goes on the site. */
export const looksLikeScript = (code: string) => /^\s*<(script|noscript|!--)/i.test(code);

export function toggleScript(id: string) {
  scripts = scripts.map((s) => (s.id === id ? { ...s, on: !s.on } : s));
  emit();
}
export function addScript(s: Omit<Script, "id" | "versions">, by: string): Script {
  const n: Script = {
    ...s,
    id: `s${Date.now()}`,
    versions: [{ v: "v1", by, when: stamp(), note: "First added", code: s.code }],
  };
  scripts = [...scripts, n];
  emit();
  return n;
}
export function saveScript(
  id: string,
  patch: Omit<Script, "id" | "versions" | "on">,
  by: string,
  note = "Edited",
) {
  scripts = scripts.map((s) =>
    s.id === id
      ? {
          ...s,
          ...patch,
          versions: [
            { v: `v${s.versions.length + 1}`, by, when: stamp(), note, code: patch.code },
            ...s.versions,
          ],
        }
      : s,
  );
  emit();
}
export function restoreVersion(id: string, k: number, by: string) {
  const s = scripts.find((x) => x.id === id);
  const old = s?.versions[k];
  if (!s || !old) return;
  saveScript(
    id,
    {
      name: s.name,
      type: s.type,
      place: s.place,
      pages: s.pages,
      consent: s.consent,
      code: old.code,
    },
    by,
    `Restored ${old.v}`,
  );
}
export function deleteScript(id: string) {
  scripts = scripts.filter((s) => s.id !== id);
  emit();
}
