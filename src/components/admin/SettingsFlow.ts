// Store settings (details, status, checkout, payments, alerts, customer emails, connections) kept in
// this browser. Swap for API calls later. Edits change the shared objects in place and call
// `bumpSettings` (through the touch context), which marks the page as unsaved and re-renders.
import { useSyncExternalStore } from "react";

export type Bi = [string, string];
const bi = (a = "", b = ""): Bi => [a, b];

export interface StoreDetails {
  name: string;
  legal: string;
  legalAr: string;
  address: string;
  addressAr: string;
  phone: string;
  email: string;
  tax: string;
  cr: string;
  currency: string;
  priceFormat: "a" | "b";
  tz: string;
  vatIncluded: boolean;
  vatRate: string;
}
export type StoreMode = "open" | "pause" | "maint";
export interface PayMethod {
  key: string;
  name: string;
  desc: string;
  on: boolean;
  connected: boolean;
  /** Account details; null = nothing to set up (cash on delivery). */
  fields: Record<string, string> | null;
}
export interface AlertRow {
  name: string;
  desc: string;
  on: boolean;
  to: string[];
}
export interface CustomerEmail {
  name: string;
  when: string;
  on: boolean;
  subject: Bi;
  body: Bi;
}
export interface Provider {
  key: string;
  name: string;
  fields: string[];
}
export interface Connection {
  key: "wa" | "email" | "sms";
  name: string;
  desc: string;
  usedBy: string;
  providers: Provider[];
  provider: string;
  values: Record<string, string>;
  connected: boolean;
}

const alert = (name: string, desc: string, to: string[]): AlertRow => ({
  name,
  desc,
  on: true,
  to,
});
const email = (
  name: string,
  when: string,
  sE: string,
  sA: string,
  bE: string,
  bA: string,
): CustomerEmail => ({ name, when, on: true, subject: bi(sE, sA), body: bi(bE, bA) });

export const SET = {
  store: {
    name: "Zelliny",
    legal: "ZELLINY FOR GIFTS AND LUXURY PRODUCTS",
    legalAr: "زيليني للهدايا والمنتجات الفاخرة",
    address: "12 Dr. Zakaria El Bardisi St., Office 3, El Nozha El Gedida, Cairo, Egypt",
    addressAr: "١٢ ش د. زكريا البرديسي، مكتب ٣، النزهة الجديدة، القاهرة، مصر",
    phone: "+2 010 3848 4841",
    email: "info@zelliny.com",
    tax: "769502288",
    cr: "299144",
    currency: "EGP",
    priceFormat: "a",
    tz: "Africa/Cairo",
    vatIncluded: true,
    vatRate: "14",
  } as StoreDetails,
  status: {
    mode: "open" as StoreMode,
    back: "",
    msg: bi(
      "Online orders are paused until {date}. You can still browse and save your favourites — we'll be back soon.",
      "الطلبات متوقفة مؤقتاً حتى {date}. يمكنك التصفح وحفظ مفضلاتك — سنعود قريباً.",
    ),
    maintMsg: bi(
      "We are making a few improvements and will be back shortly.",
      "نقوم ببعض التحسينات وسنعود قريباً.",
    ),
  },
  checkout: { guest: true, gift: true, notes: true, otp: true } as Record<string, boolean>,
  payments: [
    {
      key: "paymob",
      name: "Paymob",
      desc: "Card and wallet payments settled through Paymob",
      on: true,
      connected: true,
      fields: {
        "API key": "pk_live_••••••••3a9c",
        "Integration ID": "4128816",
        "Wallet integration ID": "4128820",
      },
    },
    {
      key: "paypal",
      name: "PayPal",
      desc: "International card payments through PayPal",
      on: false,
      connected: false,
      fields: { "Client ID": "", Secret: "" },
    },
    {
      key: "cod",
      name: "Cash on delivery",
      desc: "Pay in cash when the order arrives",
      on: true,
      connected: true,
      fields: null,
    },
    {
      key: "bank",
      name: "Bank transfer",
      desc: "For enquiry-only orders",
      on: false,
      connected: false,
      fields: { "Account name": "", Bank: "", IBAN: "", SWIFT: "" },
    },
  ] as PayMethod[],
  alerts: [
    alert("New order", "Emailed to everyone below the moment an order is placed", [
      "orders@zelliny.com",
      "ramy.bakr@zelliny.com",
    ]),
    alert("New corporate enquiry", "Emailed as soon as a corporate enquiry arrives", [
      "ramy.bakr@zelliny.com",
      "zain@zelliny.com",
    ]),
    alert("Return requested", "Emailed when a customer asks to return something", [
      "returns@zelliny.com",
    ]),
    alert("Refund requested", "Emailed when a refund is waiting to be given", [
      "ramy.bakr@zelliny.com",
    ]),
    alert("Payment failed", "Emailed when a card or wallet payment does not go through", [
      "orders@zelliny.com",
    ]),
    alert(
      "Low stock or sold out",
      "Emailed when a product reaches its low-stock level or sells out",
      ["zain@zelliny.com"],
    ),
  ] as AlertRow[],
  emails: [
    email(
      "Order confirmed",
      "Right after the order is placed",
      "Your Zelliny order {order} is confirmed",
      "تم تأكيد طلبك {order} من زيليني",
      "Hi {first_name}, thank you for your order {order}. We are preparing it with care and will let you know when it is on its way.",
      "مرحباً {first_name}، شكراً لطلبك {order}. نجهّزه بعناية وسنخبرك عند شحنه.",
    ),
    email(
      "Order shipped",
      "When the order is handed to the courier",
      "Your order {order} is on its way",
      "طلبك {order} في الطريق",
      "Hi {first_name}, your order {order} is on its way. Track it here: {tracking_link}",
      "مرحباً {first_name}، طلبك {order} في الطريق. تتبّعه من هنا: {tracking_link}",
    ),
    email(
      "Order delivered",
      "When the courier marks it delivered",
      "Your order {order} has arrived",
      "وصل طلبك {order}",
      "Hi {first_name}, your order {order} has been delivered. We hope you love it.",
      "مرحباً {first_name}، تم توصيل طلبك {order}. نتمنى أن ينال إعجابك.",
    ),
    email(
      "Order cancelled",
      "When an order is cancelled",
      "Your order {order} has been cancelled",
      "تم إلغاء طلبك {order}",
      "Hi {first_name}, your order {order} has been cancelled. If you paid by card, the amount returns within 5–7 working days.",
      "مرحباً {first_name}، تم إلغاء طلبك {order}. إذا دفعت بالبطاقة، يعود المبلغ خلال ٥–٧ أيام عمل.",
    ),
    email(
      "Return approved",
      "When a return request is approved",
      "Your return for {order} is approved",
      "تمت الموافقة على استرجاع {order}",
      "Hi {first_name}, your return for order {order} is approved. Our courier will collect it on the date you chose.",
      "مرحباً {first_name}، تمت الموافقة على استرجاع طلبك {order}. سيستلمه المندوب في الموعد الذي اخترته.",
    ),
    email(
      "Refund sent",
      "When the refund is given",
      "Your refund for {order} is on its way",
      "تم إرسال استرداد {order}",
      "Hi {first_name}, we have refunded {amount} for order {order}.",
      "مرحباً {first_name}، تم استرداد {amount} لطلبك {order}.",
    ),
    email(
      "Password reset",
      "When a customer asks to reset their password",
      "Reset your Zelliny password",
      "إعادة تعيين كلمة المرور",
      "Hi {first_name}, use this link to set a new password: {reset_link}. It works once and expires in 24 hours.",
      "مرحباً {first_name}، استخدم هذا الرابط لتعيين كلمة مرور جديدة: {reset_link}. يعمل مرة واحدة وينتهي خلال ٢٤ ساعة.",
    ),
  ] as CustomerEmail[],
  connections: [
    {
      key: "wa",
      name: "WhatsApp",
      desc: "Sends WhatsApp templates, follow-up offers and owner alerts",
      usedBy: "Message templates · Browsing & follow-up · Corporate enquiries · owner alerts",
      provider: "meta",
      providers: [
        {
          key: "meta",
          name: "Meta WhatsApp Business (direct)",
          fields: [
            "Phone number",
            "Phone number ID",
            "WhatsApp Business account ID",
            "Access token",
          ],
        },
        {
          key: "twilio",
          name: "Twilio",
          fields: ["Account SID", "Auth token", "WhatsApp sender number"],
        },
        { key: "360", name: "360dialog", fields: ["API key", "WhatsApp sender number"] },
        {
          key: "other",
          name: "Other provider",
          fields: ["Provider name", "API URL", "API key", "Sender number"],
        },
      ],
      values: {},
      connected: false,
    },
    {
      key: "email",
      name: "Email",
      desc: "Sends customer emails, team alerts, approvals, invitations and password resets",
      usedBy: "Notifications · Team & permissions · Tracking & scripts alerts",
      provider: "sendgrid",
      providers: [
        {
          key: "sendgrid",
          name: "SendGrid",
          fields: ["API key", "From name", "From email", "Reply-to email"],
        },
        {
          key: "ses",
          name: "Amazon SES",
          fields: [
            "Access key",
            "Secret key",
            "Region",
            "From name",
            "From email",
            "Reply-to email",
          ],
        },
        {
          key: "m365",
          name: "Microsoft 365 (Outlook)",
          fields: ["Mailbox", "App client ID", "Client secret", "Tenant ID"],
        },
        {
          key: "smtp",
          name: "SMTP (any provider)",
          fields: ["Server", "Port", "Username", "Password", "From name", "From email"],
        },
      ],
      values: {
        "From name": "Zelliny",
        "From email": "info@zelliny.com",
        "Reply-to email": "info@zelliny.com",
      },
      connected: false,
    },
    {
      key: "sms",
      name: "SMS",
      desc: "Sends the phone verification code (OTP) for cash on delivery orders",
      usedBy: "Checkout · OTP for cash on delivery",
      provider: "local",
      providers: [
        {
          key: "local",
          name: "Egyptian SMS gateway",
          fields: ["Provider name", "API URL", "API key", "Sender name"],
        },
        { key: "twilio", name: "Twilio", fields: ["Account SID", "Auth token", "Sender number"] },
        {
          key: "other",
          name: "Other provider",
          fields: ["Provider name", "API URL", "API key", "Sender name"],
        },
      ],
      values: { "Sender name": "ZELLINY" },
      connected: false,
    },
  ] as Connection[],
};

let version = 0;
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const bumpSettings = () => {
  version++;
  listeners.forEach((l) => l());
};
export const useSettingsStore = () =>
  useSyncExternalStore(
    sub,
    () => version,
    () => version,
  );
