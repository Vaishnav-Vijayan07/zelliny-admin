// Site content (pages, sections, announcement bar, top menu, footer) kept in this browser.
// Swap for API calls later. Edits change the shared objects in place and call `touch`, which marks
// the page as a draft and re-renders; "Publish" is what would push drafts live.
import { useSyncExternalStore } from "react";

export type Bi = [string, string];
export type Pos = "above" | "below";
/** An uploaded image: "" = none, "seed:N" = sample picture, otherwise an object URL. */
export interface Img {
  d: string;
  m: string;
}
export interface Sched {
  from: string;
  to: string;
}
interface Base extends Sched {
  id: string;
  name: string;
  hint: string;
  on: boolean;
}
export interface HeroMedia extends Sched {
  id: string;
  on: boolean;
  name: string;
  video: boolean;
  secs: number;
  src: string;
}
export interface Panel {
  id: string;
  t: Bi;
  l: Bi;
  link: string;
  img: Img;
}
export interface Chapter {
  id: string;
  tab: Bi;
  t: Bi;
  x: Bi;
  img: Img;
}
export interface CtaBtn {
  t: Bi;
  link: string;
  on: boolean;
}
interface Head {
  h: Bi;
  s: Bi;
  pos: Pos;
}
export type Section = Base &
  (
    | (Head & {
        kind: "hero";
        p?: Bi | undefined;
        b: Bi;
        bOn: boolean;
        link: string;
        media: HeroMedia[];
      })
    | (Head & { kind: "cats"; items: string[] })
    | (Head & { kind: "banner"; b: Bi; bOn: boolean; link: string; img: Img })
    | { kind: "prods"; h: Bi; items: string[] }
    | (Head & { kind: "maisons"; items: string[] })
    | (Head & { kind: "panels"; panels: Panel[] })
    | (Head & { kind: "intro"; h2: Bi; c1: Bi; c2: Bi })
    | (Head & { kind: "chapters"; ch: Chapter[] })
    | { kind: "split"; h: Bi; st: Bi; st2: Bi; x: Bi; side: "left" | "right"; img: Img }
    | { kind: "cta"; h: Bi; p: Bi; btns: CtaBtn[] }
    | { kind: "text"; h: Bi; body: Bi }
  );
export type SectionKind = Section["kind"];

export interface Seo {
  t: Bi;
  d: Bi;
}
export interface FaqItem {
  id: string;
  q: Bi;
  a: Bi;
}
export interface SitePage {
  id: string;
  name: Bi;
  address: string;
  type: "Sections" | "Text" | "FAQ";
  /** "Today · 21:40" */
  upd: string;
  arOn: boolean;
  seo: Seo;
  secs: Section[];
  body: Bi;
  qa: FaqItem[];
}

export interface Announcement extends Sched {
  on: boolean;
  msgs: { id: string; t: Bi; link: string }[];
  speed: string;
}

export interface MenuLink {
  id: string;
  n: Bi;
  link: string;
  img: string;
  desc: Bi | null;
}
export interface MenuGroup {
  id: string;
  t: Bi;
  desc: boolean;
  links: MenuLink[];
}
export interface MenuItem {
  id: string;
  on: boolean;
  n: Bi;
  link: string;
  main: string;
  sp: Bi;
  btn: Bi;
  more: { on: boolean; t: Bi; link: string } | null;
  groups: MenuGroup[];
}

export interface Footer {
  news: Bi;
  nph: Bi;
  nbtn: Bi;
  nthx: Bi;
  phone: string;
  wa: string;
  email: string;
  addr: Bi;
  hours: Bi;
  soc: [string, string][];
  cols: { id: string; t: Bi; l: { id: string; n: Bi; link: string }[] }[];
  legal: Bi;
  cr: string;
  tax: string;
  copy: Bi;
  seo: Seo;
}

/* ---------- helpers ---------- */
let uid = 0;
export const nid = (p = "n") => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
export const reorder = <T>(list: T[], from: number, to: number) => {
  const n = [...list];
  const [x] = n.splice(from, 1);
  if (x !== undefined) n.splice(to, 0, x);
  return n;
};
const bi = (a = "", b = ""): Bi => [a, b];
const img = (d = ""): Img => ({ d, m: "" });
const sc = (): Sched => ({ from: "", to: "" });
const nowLabel = () => {
  const d = new Date();
  return `Today · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();

/** Where links can point to ("Choose page"). */
export const PAGE_LINKS: [string, string][] = [
  ["/", "Homepage"],
  ["/about-us", "About Us"],
  ["/corporate-gifting", "Corporate Gifting"],
  ["/corporate-gifting/client-appreciation", "Corporate · Client Appreciation"],
  ["/corporate-gifting/employee-recognition", "Corporate · Employee Recognition"],
  ["/corporate-gifting/executive-vip-gifts", "Corporate · Executive & VIP Gifts"],
  ["/corporate-gifting/enquiry", "Corporate · Enquiry form"],
  ["/maisons", "The Maisons"],
  ["/category/fragrance", "Category · Fragrance"],
  ["/gift-services", "Gift services"],
  ["/contact", "Contact"],
  ["whatsapp", "WhatsApp chat"],
];

/* ---------- seed data ---------- */
const sec = (x: object) => x as unknown as Section;
const banner = (
  id: string,
  name: string,
  hint: string,
  h: Bi,
  s: Bi,
  b: Bi,
  link: string,
  im: Img,
): Section =>
  sec({
    id,
    kind: "banner",
    name,
    hint,
    on: true,
    h,
    s,
    pos: "above",
    b,
    bOn: true,
    link,
    img: im,
    ...sc(),
  });
const panel = (t: Bi, l: Bi, link: string, im: Img): Panel => ({
  id: nid("p"),
  t,
  l,
  link,
  img: im,
});
const SEED = img("seed:1");

const HOME: Section[] = [
  sec({
    id: "hero",
    kind: "hero",
    name: "Hero banner",
    hint: "Full-width image or video at the top, with the headline",
    on: true,
    h: bi("HOUSE OF ZELLINY", "بيت زيليني"),
    s: bi("A GIFT TO REMEMBER", "هدية لا تُنسى"),
    pos: "above",
    b: bi("", ""),
    bOn: false,
    link: "/category/fragrance",
    media: [
      {
        id: "h1",
        on: true,
        name: "hero-banner.mp4",
        video: true,
        secs: 0,
        src: "",
        ...sc(),
      },
      {
        id: "h2",
        on: true,
        name: "autumn-gifting.jpg",
        video: false,
        secs: 5,
        src: "",
        from: "",
        to: "2026-11-30",
      },
    ],
    ...sc(),
  }),
  sec({
    id: "categories",
    kind: "cats",
    name: "Shop by category",
    hint: "Photo tiles for the categories you list",
    on: true,
    h: bi("Shop by Category", "تسوق حسب الفئة"),
    s: bi("The Collection", "المجموعة"),
    pos: "above",
    items: ["fragrance", "beauty", "jewellery", "watches", "bags", "leather", "writing", "smoking"],
    ...sc(),
  }),
  banner(
    "occasion",
    "One house for every occasion",
    "Wide banner image with a ribbon-and-box photo",
    bi("One house for every occasion", "بيت واحد لكل مناسبة"),
    bi("House of Zelliny", "بيت زيليني"),
    bi("Explore gifting", "اكتشف الهدايا"),
    "/corporate-gifting",
    img("seed:1"),
  ),
  sec({
    id: "curated",
    kind: "prods",
    name: "Curated for You",
    hint: "A scrolling row of the products you pick",
    on: true,
    h: bi("Curated for You", "مختارات لك"),
    items: ["P1014", "P1001", "P1018", "P1013"],
    ...sc(),
  }),
  banner(
    "lifestyle",
    "Luxury, thoughtfully selected",
    "Wide lifestyle photo with a line of text",
    bi("Luxury, thoughtfully selected", "فخامة مختارة بعناية"),
    bi("Our promise", "وعدنا"),
    bi("About Zelliny", "عن زيليني"),
    "/about-us",
    img("seed:3"),
  ),
  sec({
    id: "maisons",
    kind: "maisons",
    name: "The Maisons — Houses we curate",
    hint: "Logos of the maisons you list",
    on: true,
    h: bi("Houses we curate", "البيوت التي نختارها"),
    s: bi("The Maisons", "الدور"),
    pos: "above",
    items: ["burberry", "clarins", "cerruti", "hugoboss", "guess"],
    ...sc(),
  }),
  sec({
    id: "business",
    kind: "panels",
    name: "Zelliny for Business",
    hint: "Corporate gifting panels",
    on: true,
    h: bi("Luxury gifting for relationships that matter most", "هدايا فاخرة للعلاقات الأهم"),
    s: bi("Zelliny for Business", "زيليني للأعمال"),
    pos: "above",
    panels: [
      panel(
        bi("Client Appreciation", "تقدير العملاء"),
        bi("Thank the clients who matter", "اشكر العملاء الأهم"),
        "/corporate-gifting/client-appreciation",
        img("seed:1"),
      ),
      panel(
        bi("Employee Recognition", "تقدير الموظفين"),
        bi("Reward your team", "كافئ فريقك"),
        "/corporate-gifting/employee-recognition",
        img("seed:3"),
      ),
      panel(
        bi("Executive & VIP Gifts", "هدايا كبار الشخصيات"),
        bi("Considered gifts for leaders", "هدايا مختارة للقادة"),
        "/corporate-gifting/executive-vip-gifts",
        img("seed:5"),
      ),
    ],
    ...sc(),
  }),
  sec({
    id: "packaging",
    kind: "panels",
    name: "Signature Packaging",
    hint: "Ribbon wrapping, embossing and engraving tiles",
    on: true,
    h: bi("Every gift, crafted with intention", "كل هدية صُنعت بعناية"),
    s: bi("Signature Packaging", "التغليف المميز"),
    pos: "above",
    panels: [
      panel(
        bi("Ribbon wrapping", "تغليف بالشريط"),
        bi("Custom ribbon wrapping with your branding", "تغليف بالشريط بعلامتك"),
        "/gift-services",
        img("seed:2"),
      ),
      panel(
        bi("Embossing", "الحفر البارز"),
        bi("Embossed logo with your company name", "شعار بارز باسم شركتك"),
        "/gift-services",
        img("seed:4"),
      ),
      panel(
        bi("Engraving", "النقش"),
        bi("Personalized engraving and bespoke finishing", "نقش شخصي ولمسات خاصة"),
        "/gift-services",
        img("seed:6"),
      ),
    ],
    ...sc(),
  }),
  banner(
    "concierge",
    "The Zelliny Concierge",
    "Closing banner with a button to speak to the team",
    bi("A personal service, start to finish", "خدمة شخصية من البداية للنهاية"),
    bi("The Zelliny Concierge", "كونسيرج زيليني"),
    bi("Speak with our Concierge", "تحدث مع الكونسيرج"),
    "whatsapp",
    img("seed:5"),
  ),
];

const ABOUT: Section[] = [
  sec({
    id: "a1",
    kind: "hero",
    name: "Page banner",
    hint: "Full-width slides with arrows, small line, heading and text",
    on: true,
    s: bi("ABOUT ZELLINY", "عن زيليني"),
    pos: "above",
    h: bi("A new chapter in luxury gifting", "فصل جديد في عالم الهدايا الفاخرة"),
    p: bi("One house for every occasion.", "بيت واحد لكل مناسبة."),
    b: bi("", ""),
    bOn: false,
    link: "",
    media: [
      {
        id: "m1",
        on: true,
        name: "about-ribbon-box.jpg",
        video: false,
        secs: 6,
        src: "",
        ...sc(),
      },
      {
        id: "m2",
        on: true,
        name: "about-gold-emboss.jpg",
        video: false,
        secs: 6,
        src: "",
        ...sc(),
      },
    ],
    ...sc(),
  }),
  sec({
    id: "a2",
    kind: "intro",
    name: "The name is new. The story is not.",
    hint: "Small line, two-line heading and two columns of text",
    on: true,
    s: bi("HOUSE OF ZELLINY", "بيت زيليني"),
    pos: "above",
    h: bi("The name is new.", "الاسم جديد."),
    h2: bi("The story is not.", "لكن القصة ليست كذلك."),
    c1: bi(
      "Zelliny brings two decades of luxury experience across the GCC into one house — sourcing from the world's most respected houses, serving discerning clients, and learning what it truly takes to make something feel exceptional.",
      "تجمع زيليني عقدين من الخبرة في عالم الفخامة في الخليج تحت سقف واحد.",
    ),
    c2: bi(
      "Zelliny is where all of that experience now lives. A destination to discover and acquire luxury across many worlds, and a trusted partner for companies whose gifts must speak as well as they do.",
      "زيليني هي حيث تعيش هذه الخبرة اليوم.",
    ),
    ...sc(),
  }),
  sec({
    id: "a3",
    kind: "chapters",
    name: "Our story — Written in three chapters",
    hint: "Tabs, each with its own image, title and text",
    on: true,
    s: bi("OUR STORY", "قصتنا"),
    pos: "above",
    h: bi("Written in three chapters", "مكتوبة في ثلاثة فصول"),
    ch: [
      {
        id: "c1",
        tab: bi("The Experience", "الخبرة"),
        t: bi("The Experience", "الخبرة"),
        x: bi(
          "Years spent alongside the world's leading houses, and the clients who expect only the exceptional.",
          "سنوات بجانب أرقى البيوت العالمية.",
        ),
        img: img("seed:1"),
      },
      {
        id: "c2",
        tab: bi("The Name", "الاسم"),
        t: bi("The Name", "الاسم"),
        x: bi(
          "From that experience, Zelliny was born — gathering everything we have learned under a single name.",
          "من هذه الخبرة وُلدت زيليني.",
        ),
        img: img("seed:3"),
      },
      {
        id: "c3",
        tab: bi("The Promise", "الوعد"),
        t: bi("The Promise", "الوعد"),
        x: bi(
          "Every piece we offer and every gift we compose is held to the same quiet promise: it should be remembered long after it is opened.",
          "كل قطعة نقدمها تحمل الوعد نفسه.",
        ),
        img: img("seed:5"),
      },
    ],
    ...sc(),
  }),
  sec({
    id: "a4",
    kind: "split",
    name: "Our Mission",
    hint: "Image on one side, heading and statement on the other",
    on: true,
    h: bi("OUR MISSION", "مهمتنا"),
    st: bi("To make every gift", "أن نجعل كل هدية"),
    st2: bi("a gift to remember", "هدية لا تُنسى"),
    x: bi(
      "By curating the world's finest maisons, pairing them with twenty years of understanding, and treating every individual and every organisation we serve with the same considered care.",
      "باختيار أرقى البيوت العالمية مع عشرين عاماً من الخبرة.",
    ),
    side: "left",
    img: img("seed:2"),
    ...sc(),
  }),
  sec({
    id: "a5",
    kind: "split",
    name: "Our Vision",
    hint: "Image on one side, heading and statement on the other",
    on: true,
    h: bi("OUR VISION", "رؤيتنا"),
    st: bi("To become", "أن نصبح"),
    st2: bi("the emblem of luxury gifting", "رمز الهدايا الفاخرة"),
    x: bi(
      "By curating the world's finest maisons, pairing them with twenty years of understanding, and treating every individual and every organisation we serve with the same considered care.",
      "باختيار أرقى البيوت العالمية مع عشرين عاماً من الخبرة.",
    ),
    side: "left",
    img: img("seed:4"),
    ...sc(),
  }),
  sec({
    id: "a6",
    kind: "panels",
    name: "What We Stand For",
    hint: "Three image tiles, each with one word",
    on: true,
    s: bi("", ""),
    pos: "above",
    h: bi("What We Stand For", "ما نؤمن به"),
    panels: [
      panel(bi("CURATED", "مختار بعناية"), bi("", ""), "", img("seed:1")),
      panel(bi("CONSIDERED", "مدروس"), bi("", ""), "", img("seed:3")),
      panel(bi("REMEMBERED", "لا يُنسى"), bi("", ""), "", img("seed:5")),
    ],
    ...sc(),
  }),
  sec({
    id: "a7",
    kind: "cta",
    name: "Step Inside",
    hint: "Closing heading, text and two buttons",
    on: true,
    h: bi("Step Inside", "تفضّل بالدخول"),
    p: bi(
      "Whether for yourself, for someone dear, or for your company, we would be honoured to help.",
      "سواء لنفسك أو لمن تحب أو لشركتك، يسعدنا أن نساعدك.",
    ),
    btns: [
      { t: bi("EXPLORE THE MAISONS", "اكتشف الماركات"), link: "/maisons", on: true },
      { t: bi("CONTINUE SHOPPING", "تابع التسوق"), link: "/category/fragrance", on: true },
    ],
    ...sc(),
  }),
];

const CORP: Section[] = [
  banner(
    "c1",
    "Page banner",
    "Wide image at the top of the page",
    bi("Luxury gifting for relationships that matter most", "هدايا فاخرة للعلاقات الأهم"),
    bi("Zelliny for Business", "زيليني للأعمال"),
    bi("Start an enquiry", "ابدأ طلبك"),
    "/corporate-gifting/enquiry",
    img("seed:3"),
  ),
  sec({
    id: "c2",
    kind: "panels",
    name: "Gifting occasions",
    hint: "Panels that open each corporate page",
    on: true,
    h: bi("Gifting for every occasion", "هدايا لكل مناسبة"),
    s: bi("", ""),
    pos: "above",
    panels: (HOME[6] as Extract<Section, { kind: "panels" }>).panels.map((p) => ({
      ...p,
      id: nid("p"),
    })),
    ...sc(),
  }),
  sec({
    id: "c3",
    kind: "text",
    name: "How it works",
    hint: "Heading and text",
    on: true,
    h: bi("How it works", "كيف نعمل"),
    body: bi(
      "<ol><li>Tell us the occasion and quantity.</li><li>We send a curated selection and quotation.</li><li>We brand, wrap and deliver.</li></ol>",
      "<ol><li>أخبرنا بالمناسبة والكمية.</li><li>نرسل لك اختيارات وعرض سعر.</li><li>نطبع الشعار ونغلف ونوصل.</li></ol>",
    ),
    ...sc(),
  }),
  sec({
    id: "c4",
    kind: "maisons",
    name: "Maisons for business",
    hint: "Logos of the maisons you list",
    on: true,
    h: bi("Maisons we gift", "البيوت التي نهديها"),
    s: bi("", ""),
    pos: "above",
    items: ["hugoboss", "cerruti", "dupont", "swarovski"],
    ...sc(),
  }),
  banner(
    "c5",
    "Enquiry banner",
    "Closing banner with a button to the enquiry form",
    bi("Let us plan your next gift", "دعنا نخطط لهديتك القادمة"),
    bi("", ""),
    bi("Start an enquiry", "ابدأ طلبك"),
    "/corporate-gifting/enquiry",
    img("seed:5"),
  ),
];

const seo = (t: string, d: string, ta = "", da = ""): Seo => ({ t: bi(t, ta), d: bi(d, da) });
const blankPage = (): Pick<SitePage, "secs" | "body" | "qa"> => ({
  secs: [],
  body: bi("", ""),
  qa: [],
});
const text = (
  id: string,
  name: Bi,
  address: string,
  body: Bi,
  upd: string,
  arOn: boolean,
  s: Seo,
): SitePage => ({ ...blankPage(), id, name, address, type: "Text", upd, arOn, seo: s, body });

const PAGES: SitePage[] = [
  {
    ...blankPage(),
    id: "home",
    name: bi("Homepage", "الصفحة الرئيسية"),
    address: "/",
    type: "Sections",
    secs: HOME,
    upd: "Today · 21:40",
    arOn: true,
    seo: seo(
      "Zelliny — House of luxury gifting",
      "Fragrance, beauty, jewellery, watches and leather from the maisons you love, gift-wrapped and delivered across Egypt.",
      "زيليني — بيت الهدايا الفاخرة",
      "عطور ومستحضرات تجميل ومجوهرات وساعات ومنتجات جلدية من أرقى البيوت، مغلفة كهدية وتوصيل لجميع أنحاء مصر.",
    ),
  },
  {
    ...blankPage(),
    id: "about",
    name: bi("About Us", "من نحن"),
    address: "/about-us",
    type: "Sections",
    secs: ABOUT,
    upd: "18 Oct · 14:05",
    arOn: true,
    seo: seo(
      "About Zelliny",
      "The story of Zelliny and the maisons we curate.",
      "عن زيليني",
      "قصة زيليني والبيوت التي نختارها.",
    ),
  },
  {
    ...blankPage(),
    id: "corp",
    name: bi("Corporate Gifting", "هدايا الشركات"),
    address: "/corporate-gifting",
    type: "Sections",
    secs: CORP,
    upd: "Today · 09:12",
    arOn: true,
    seo: seo(
      "Corporate gifting — Zelliny for Business",
      "Luxury gifts for clients, teams and leaders, branded and delivered.",
      "هدايا الشركات — زيليني للأعمال",
      "هدايا فاخرة للعملاء والفرق والقادة، بشعارك ومع التوصيل.",
    ),
  },
  text(
    "contact",
    bi("Contact", "اتصل بنا"),
    "/contact",
    bi(
      "<h2>Contact us</h2><p>Call or WhatsApp the Zelliny team, Sunday to Thursday, 10:00–19:00.</p>",
      "<h2>تواصل معنا</h2><p>اتصل أو راسل فريق زيليني من الأحد إلى الخميس، ١٠:٠٠–١٩:٠٠.</p>",
    ),
    "12 Oct · 16:30",
    true,
    seo(
      "Contact Zelliny",
      "Call, email or WhatsApp the Zelliny team.",
      "اتصل بزيليني",
      "تواصل مع فريق زيليني.",
    ),
  ),
  text(
    "returns",
    bi("Returns & Refunds", "الاسترجاع والاسترداد"),
    "/returns-refunds",
    bi(
      "<h2>Returns &amp; Refunds</h2><p>You can return an unopened item within <b>14 days</b> of delivery.</p><h3>How to return</h3><ul><li>Open <a>My orders</a> and choose the item.</li><li>Pick a reason and a collection date.</li></ul>",
      "<h2>الاسترجاع والاسترداد</h2><p>يمكنك استرجاع المنتج غير المفتوح خلال <b>١٤ يوماً</b> من التوصيل.</p>",
    ),
    "15 Oct · 11:20",
    true,
    seo(
      "Returns & refunds — Zelliny",
      "How to return an item and get your refund.",
      "الاسترجاع والاسترداد — زيليني",
      "كيف تسترجع منتجاً وتسترد المبلغ.",
    ),
  ),
  text(
    "delivery",
    bi("Delivery Information", "معلومات التوصيل"),
    "/delivery-information",
    bi(
      "<h2>Delivery</h2><p>Cairo and Giza in <b>1–2 working days</b>; other cities in 2–4 working days.</p>",
      "",
    ),
    "15 Oct · 11:24",
    false,
    seo("Delivery information — Zelliny", "Delivery times and fees across Egypt."),
  ),
  text(
    "privacy",
    bi("Privacy Policy", "سياسة الخصوصية"),
    "/privacy-policy",
    bi(
      "<h2>Privacy Policy</h2><p>This policy explains what we collect and why.</p>",
      "<h2>سياسة الخصوصية</h2><p>توضح هذه السياسة البيانات التي نجمعها ولماذا.</p>",
    ),
    "2 Oct · 10:00",
    true,
    seo(
      "Privacy policy — Zelliny",
      "How Zelliny handles your data.",
      "سياسة الخصوصية — زيليني",
      "كيف تتعامل زيليني مع بياناتك.",
    ),
  ),
  text(
    "terms",
    bi("Terms & Conditions", "الشروط والأحكام"),
    "/terms-conditions",
    bi(
      "<h2>Terms &amp; Conditions</h2><p>By placing an order you agree to these terms.</p>",
      "<h2>الشروط والأحكام</h2><p>بإتمام الطلب فإنك توافق على هذه الشروط.</p>",
    ),
    "2 Oct · 10:02",
    true,
    seo(
      "Terms & conditions — Zelliny",
      "The terms for shopping on zelliny.com.",
      "الشروط والأحكام — زيليني",
      "شروط التسوق على zelliny.com.",
    ),
  ),
  {
    ...blankPage(),
    id: "faq",
    name: bi("FAQ", "الأسئلة الشائعة"),
    address: "/faq",
    type: "FAQ",
    upd: "9 Oct · 13:45",
    arOn: true,
    seo: seo(
      "FAQ — Zelliny",
      "Answers to common questions.",
      "الأسئلة الشائعة — زيليني",
      "إجابات الأسئلة الشائعة.",
    ),
    qa: [
      {
        id: nid("q"),
        q: bi("Are your products authentic?", "هل منتجاتكم أصلية؟"),
        a: bi(
          "Yes. Every item comes from the maison or its official distributor.",
          "نعم. كل منتج من البيت نفسه أو من وكيله الرسمي.",
        ),
      },
      {
        id: nid("q"),
        q: bi("Can I add a gift message?", "هل يمكنني إضافة رسالة هدية؟"),
        a: bi(
          "Yes, at checkout. The card is handwritten and free.",
          "نعم، عند الدفع. البطاقة مكتوبة يدوياً ومجانية.",
        ),
      },
      {
        id: nid("q"),
        q: bi("How long does delivery take?", "كم يستغرق التوصيل؟"),
        a: bi("1–2 working days in Cairo and Giza.", "يوم إلى يومين عمل في القاهرة والجيزة."),
      },
    ],
  },
  text(
    "404",
    bi("404 — Page not found", ""),
    "/404-page-not-found",
    bi(
      "<h2>This page has moved on</h2><p>The page you were looking for isn't here. <a>Return to the homepage</a>.</p>",
      "",
    ),
    "1 Oct · 09:00",
    false,
    seo("Page not found — Zelliny", ""),
  ),
  text(
    "verify",
    bi("Verify your product", "تحقق من منتجك"),
    "/verify",
    bi(
      "<h2>Verify your product</h2><p>Scan the QR code on the security sticker to check your item is genuine.</p>",
      "<h2>تحقق من منتجك</h2><p>امسح رمز QR على ملصق الأمان للتأكد من أصالة المنتج.</p>",
    ),
    "Today · 08:30",
    true,
    seo(
      "Verify your product — Zelliny",
      "Check that your Zelliny item is genuine.",
      "تحقق من منتجك — زيليني",
      "تأكد من أصالة منتج زيليني.",
    ),
  ),
];

const ANN: Announcement = {
  on: true,
  msgs: [
    {
      id: "am1",
      t: bi("Complimentary gift wrapping on every order", "تغليف هدايا مجاني مع كل طلب"),
      link: "/gift-services",
    },
    {
      id: "am2",
      t: bi(
        "Free delivery in Cairo on orders over 5,000 EGP",
        "توصيل مجاني في القاهرة للطلبات فوق ٥٬٠٠٠ ج.م",
      ),
      link: "/delivery-information",
    },
  ],
  from: "",
  to: "",
  speed: "5",
};

const FOOT: Footer = {
  news: bi("Inspire me with all the latest Zelliny news", "ألهمني بكل أخبار زيليني"),
  nph: bi("Your email address", "بريدك الإلكتروني"),
  nbtn: bi("Subscribe", "اشترك"),
  nthx: bi("Thank you — you're on the list.", "شكراً لك — تم تسجيلك."),
  phone: "+20 10 3848 4841",
  wa: "+20 10 3848 4841",
  email: "info@zelliny.com",
  addr: bi(
    "12 Dr. Zakaria El Bardisi St., Office 3, El Nozha El Gedida, Cairo",
    "١٢ ش د. زكريا البرديسي، مكتب ٣، النزهة الجديدة، القاهرة",
  ),
  hours: bi("Sunday–Thursday, 10:00–19:00", "الأحد–الخميس، ١٠:٠٠–١٩:٠٠"),
  soc: [
    ["Instagram", "https://instagram.com/zelliny"],
    ["Facebook", "https://facebook.com/zelliny"],
    ["TikTok", "https://tiktok.com/@zellinyofficial"],
    ["YouTube", ""],
    ["LinkedIn", ""],
  ],
  cols: [
    {
      id: "f1",
      t: bi("Shop", "تسوق"),
      l: [
        ["Fragrance", "العطور", "/category/fragrance"],
        ["Beauty", "التجميل", "/category/beauty"],
        ["Jewellery", "المجوهرات", "/category/jewellery"],
        ["The Maisons", "الماركات", "/maisons"],
      ].map(([a, b, c]) => ({ id: nid("l"), n: bi(a, b), link: c! })),
    },
    {
      id: "f2",
      t: bi("Zelliny", "زيليني"),
      l: [
        ["About Us", "من نحن", "/about-us"],
        ["Corporate Gifting", "هدايا الشركات", "/corporate-gifting"],
        ["Verify your product", "تحقق من منتجك", "/verify"],
      ].map(([a, b, c]) => ({ id: nid("l"), n: bi(a, b), link: c! })),
    },
    {
      id: "f3",
      t: bi("Help", "المساعدة"),
      l: [
        ["Delivery", "التوصيل", "/delivery-information"],
        ["Returns & Refunds", "الاسترجاع", "/returns-refunds"],
        ["FAQ", "الأسئلة الشائعة", "/faq"],
        ["Contact", "اتصل بنا", "/contact"],
      ].map(([a, b, c]) => ({ id: nid("l"), n: bi(a, b), link: c! })),
    },
    {
      id: "f4",
      t: bi("Legal", "قانوني"),
      l: [
        ["Privacy Policy", "سياسة الخصوصية", "/privacy-policy"],
        ["Terms & Conditions", "الشروط والأحكام", "/terms-conditions"],
      ].map(([a, b, c]) => ({ id: nid("l"), n: bi(a, b), link: c! })),
    },
  ],
  legal: bi("ZELLINY FOR GIFTS AND LUXURY PRODUCTS", "زيليني للهدايا والمنتجات الفاخرة"),
  cr: "299144",
  tax: "769502288",
  copy: bi("© 2026 Zelliny. All rights reserved.", "© ٢٠٢٦ زيليني. جميع الحقوق محفوظة."),
  seo: seo(
    "Zelliny — House of luxury gifting",
    "Luxury fragrance, beauty, jewellery, watches and leather goods, gift-wrapped and delivered across Egypt.",
    "زيليني — بيت الهدايا الفاخرة",
    "عطور ومجوهرات وساعات ومنتجات جلدية فاخرة، مغلفة كهدية مع التوصيل في مصر.",
  ),
};

/* ----- top menu ----- */
const AR_: Record<string, string> = {
  "All Gifts": "كل الهدايا",
  Fragrance: "العطور",
  Makeup: "المكياج",
  Skincare: "العناية بالبشرة",
  "Writing Instruments": "أدوات الكتابة",
  "Leather Goods": "المنتجات الجلدية",
  Watches: "الساعات",
  Jewellery: "المجوهرات",
  Bags: "الحقائب",
  "Smoking Accessories": "مستلزمات التدخين",
  Beauty: "التجميل",
  "The Signature Edit": "مختارات زيليني",
  "New Arrivals": "وصل حديثاً",
  "Gift Sets": "أطقم الهدايا",
  "Corporate Gifting": "هدايا الشركات",
};
let imgN = 0;
const ml = (n: string, pre: string, withImg: boolean, ar?: string, desc?: Bi): MenuLink => ({
  id: nid("k"),
  n: bi(n, ar ?? AR_[n] ?? ""),
  link: pre + slug(n),
  img: withImg ? `seed:${imgN++ % 8}` : "",
  desc: desc ?? null,
});
const discover = (): MenuGroup => ({
  id: nid("g"),
  t: bi("DISCOVER", "اكتشف"),
  desc: false,
  links: [
    ml("The Signature Edit", "/edit/", true),
    ml("New Arrivals", "/", true),
    ml("Gift Sets", "/", false),
    ml("Corporate Gifting", "/", true),
  ],
});
const BRANDS = [
  "Acqua di Parma",
  "Amouroud",
  "Burberry",
  "Calvin Klein",
  "Carolina Herrera",
  "Cerruti 1881",
  "Chloé",
  "Clarins",
  "Davidoff",
  "Dolce & Gabbana",
  "Ferragamo",
  "Festina",
  "Givenchy",
  "Gucci",
  "Guess",
  "Hermès",
  "Hugo Boss",
  "Issey Miyake",
  "Jean Paul Gaultier",
  "Kenzo",
  "Lancaster",
  "Loewe",
  "Maison Francis Kurkdjian",
  "Make Up For Ever",
  "Missoni",
  "Moschino",
  "Narciso Rodriguez",
  "Paco Rabanne",
  "Roberto Cavalli",
  "S.T. Dupont",
  "Skincode",
  "Swarovski",
  "Versace",
  "Zadig & Voltaire",
];
const mk = (
  id: string,
  n: string,
  ar: string,
  link: string,
  sp: string,
  spAr: string,
  btn: string,
  btnAr: string,
  groups: MenuGroup[],
  more: MenuItem["more"] = null,
): MenuItem => ({
  id,
  on: true,
  n: bi(n, ar),
  link,
  main: `seed:${imgN++ % 8}`,
  sp: bi(sp, spAr),
  btn: bi(btn, btnAr),
  more,
  groups,
});
const MENU: MenuItem[] = [
  mk(
    "w",
    "WOMEN",
    "نساء",
    "/women",
    "THE SIGNATURE EDIT",
    "مختارات زيليني",
    "SHOP NOW",
    "تسوق الآن",
    [
      {
        id: nid("g"),
        t: bi("SHOP FOR HER", "تسوقي لها"),
        desc: false,
        links: [
          "All Gifts",
          "Fragrance",
          "Makeup",
          "Skincare",
          "Writing Instruments",
          "Leather Goods",
          "Watches",
          "Jewellery",
          "Bags",
        ].map((n, i) => ml(n, "/women/", i !== 3)),
      },
      discover(),
    ],
  ),
  mk("m", "MEN", "رجال", "/men", "THE SIGNATURE EDIT", "مختارات زيليني", "SHOP NOW", "تسوق الآن", [
    {
      id: nid("g"),
      t: bi("SHOP FOR HIM", "تسوق له"),
      desc: false,
      links: [
        "All Gifts",
        "Fragrance",
        "Writing Instruments",
        "Leather Goods",
        "Smoking Accessories",
        "Watches",
        "Bags",
      ].map((n) => ml(n, "/men/", true)),
    },
    discover(),
  ]),
  mk(
    "b",
    "BRANDS",
    "الماركات",
    "/maisons",
    "THE HOUSE OF ZELLINY",
    "بيت زيليني",
    "DISCOVER",
    "اكتشف",
    [
      {
        id: nid("g"),
        t: bi("MAISONS", "الماركات"),
        desc: false,
        links: BRANDS.map((n, i) => ml(n, "/maisons/", i % 3 !== 1, "")),
      },
    ],
    { on: true, t: bi("DISCOVER MORE", "اكتشف المزيد"), link: "/maisons" },
  ),
  mk(
    "c",
    "CATEGORIES",
    "الفئات",
    "/categories",
    "EIGHT EDITS, ONE HOUSE",
    "ثماني فئات، بيت واحد",
    "EXPLORE",
    "اكتشف",
    [
      {
        id: nid("g"),
        t: bi("CATEGORIES", "الفئات"),
        desc: false,
        links: [
          "Fragrance",
          "Beauty",
          "Writing Instruments",
          "Leather Goods",
          "Smoking Accessories",
          "Watches",
          "Jewellery",
          "Bags",
        ].map((n) => ml(n, "/category/", true)),
      },
    ],
  ),
  mk(
    "g",
    "CORPORATE GIFTING",
    "هدايا الشركات",
    "/corporate-gifting",
    "ZELLINY FOR BUSINESS",
    "زيليني للأعمال",
    "ENQUIRE NOW",
    "استفسر الآن",
    [
      {
        id: nid("g"),
        t: bi("ZELLINY FOR BUSINESS", "زيليني للأعمال"),
        desc: true,
        links: [
          ml(
            "Client Appreciation",
            "/corporate-gifting/",
            true,
            "تقدير العملاء",
            bi(
              "Luxury gifts designed to strengthen lasting business relationships",
              "هدايا فاخرة تقوّي العلاقات طويلة الأمد",
            ),
          ),
          ml(
            "Executive & VIP Gifts",
            "/corporate-gifting/",
            true,
            "هدايا كبار الشخصيات",
            bi(
              "Exceptional gifts for executives, partners and distinguished clients",
              "هدايا استثنائية للمديرين والشركاء",
            ),
          ),
          ml(
            "Events & Corporate Occasions",
            "/corporate-gifting/",
            false,
            "الفعاليات ومناسبات الشركات",
            bi(
              "Tailored gifting experiences for launches, conferences and celebrations",
              "هدايا مخصصة للإطلاقات والمؤتمرات والاحتفالات",
            ),
          ),
          ml(
            "Employee Recognition",
            "/corporate-gifting/",
            true,
            "تقدير الموظفين",
            bi(
              "Celebrate achievements with thoughtfully curated premium gifts",
              "احتفل بالإنجازات بهدايا مختارة بعناية",
            ),
          ),
        ],
      },
    ],
  ),
];

/* ---------- store ---------- */
export const DB = {
  pages: PAGES,
  ann: ANN,
  foot: FOOT,
  menu: MENU,
  /** Pages saved as drafts and waiting to be published. */
  dirty: new Set<string>(),
};
let version = 0;
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** Re-render everything that reads the site content. */
export const bump = () => {
  version++;
  listeners.forEach((l) => l());
};
export const useSiteContent = () =>
  useSyncExternalStore(
    sub,
    () => version,
    () => version,
  );
/** An edit was made on this page: it becomes a draft. */
export const touch = (pageId?: string) => {
  if (pageId) DB.dirty.add(pageId);
  bump();
};
export const getPage = (id: string) => DB.pages.find((p) => p.id === id);
export function publishPages(ids: string[]) {
  ids.forEach((id) => {
    const p = getPage(id);
    if (p) p.upd = nowLabel();
    DB.dirty.delete(id);
  });
  bump();
}
export function savePageDraft(id: string) {
  const p = getPage(id);
  if (p) p.upd = nowLabel();
  DB.dirty.add(id);
  bump();
}

/** The Arabic switch can only be on when the Arabic title and content are filled in. */
export function arReady(p: SitePage) {
  if (!p.name[1].trim()) return false;
  if (p.type === "FAQ") return p.qa.length > 0 && p.qa.every((x) => x.q[1].trim() && x.a[1].trim());
  if (p.type === "Text") return !!stripHtml(p.body[1]);
  return true;
}

export const newSection = (kind: SectionKind, name: string, hint: string): Section => {
  const base = { id: nid("s"), name, hint, on: true, ...sc() };
  const head = { h: bi(), s: bi(), pos: "above" as Pos };
  switch (kind) {
    case "banner":
      return sec({ ...base, ...head, kind, b: bi(), bOn: false, link: "", img: img() });
    case "text":
      return sec({ ...base, kind, h: bi(), body: bi() });
    case "split":
      return sec({
        ...base,
        kind,
        h: bi(),
        st: bi(),
        st2: bi(),
        x: bi(),
        side: "left",
        img: img(),
      });
    case "chapters":
      return sec({ ...base, ...head, kind, ch: [] });
    case "cta":
      return sec({
        ...base,
        kind,
        h: bi(),
        p: bi(),
        btns: [
          { t: bi(), link: "", on: true },
          { t: bi(), link: "", on: false },
        ],
      });
    case "panels":
      return sec({ ...base, ...head, kind, panels: [] });
    case "prods":
      return sec({ ...base, kind, h: bi(), items: [] });
    case "hero":
      return sec({ ...base, ...head, kind, b: bi(), bOn: false, link: "", media: [] });
    case "intro":
      return sec({ ...base, ...head, kind, h2: bi(), c1: bi(), c2: bi() });
    default:
      return sec({ ...base, ...head, kind, items: [] });
  }
};
export const SECTION_CHOICES: [SectionKind, string, string][] = [
  ["banner", "Banner", "Wide image with heading, line and button"],
  ["text", "Text", "Heading and formatted text"],
  ["panels", "Panels", "Photo tiles that each open a page"],
  ["maisons", "Maisons", "Logos of the maisons you pick"],
  ["prods", "Products", "A row of products you pick"],
  ["cats", "Categories", "Photo tiles for categories"],
  ["split", "Image and statement", "Image on one side, heading and statement on the other"],
  ["chapters", "Chapters", "Tabs, each with image, title and text"],
  ["cta", "Closing with buttons", "Heading, text and up to two buttons"],
];

export const blankLink = (desc: boolean): MenuLink => ({
  id: nid("k"),
  n: bi(),
  link: "",
  img: "",
  desc: desc ? bi() : null,
});
export const blankMenuItem = (): MenuItem => ({
  id: nid("m"),
  on: false,
  n: bi(),
  link: "",
  main: "",
  sp: bi(),
  btn: bi(),
  more: null,
  groups: [{ id: nid("g"), t: bi(), desc: false, links: [] }],
});
