// Message templates shared by every WhatsApp / email box and Settings › Message templates.
// Each has English and Arabic wording, a channel, and (for WhatsApp) Meta's approval status.
// Local for now — swap the mutators for API calls.
import { useMemo, useSyncExternalStore } from "react";

export type Channel = "WhatsApp" | "Email";
export interface MessageTemplate {
  id: string;
  name: string;
  /** English wording; {offer_code} is already filled in when read through `useMessageTemplates`. */
  text: string;
  textAr: string;
  channel: Channel;
  /** WhatsApp templates must be approved by Meta before they can be sent. */
  approved: boolean;
  /** Code of the promotion in Discounts & offers that fills {offer_code} ("" = none). */
  offer: string;
}

export const WRITE_OWN = "custom";
export const MERGE_FIELDS = ["first_name", "product", "order", "offer_code"] as const;

const tpl = (
  id: string,
  name: string,
  text: string,
  textAr: string,
  channel: Channel = "WhatsApp",
  approved = true,
  offer = "",
): MessageTemplate => ({ id, name, text, textAr, channel, approved, offer });

let templates: MessageTemplate[] = [
  tpl(
    "thanks",
    "Thank you",
    "Hi {first_name}, thank you for shopping with Zelliny. We hope you love your order. — Zelliny",
    "مرحباً {first_name}، شكراً لتسوقك من زيليني. نتمنى أن ينال طلبك إعجابك. — زيليني",
  ),
  tpl(
    "order",
    "Order update",
    "Hi {first_name}, an update on your order {order}: it is on its way. Our courier will call before delivery. — Zelliny",
    "مرحباً {first_name}، تحديث لطلبك {order}: إنه في الطريق. سيتصل بك المندوب قبل التوصيل. — زيليني",
  ),
  tpl(
    "wish",
    "Wishlist offer",
    "Hi {first_name}, the {product} on your wishlist is waiting for you — enjoy it with code {offer_code}. — Zelliny",
    "مرحباً {first_name}، {product} في قائمة أمنياتك بانتظارك — استمتع به مع الكود {offer_code}. — زيليني",
    "WhatsApp",
    true,
    "WELCOME10",
  ),
  tpl(
    "back",
    "Back in stock",
    "Hi {first_name}, good news — {product} is back in stock. Reply to reserve yours. — Zelliny",
    "مرحباً {first_name}، خبر سعيد — {product} متوفر من جديد. ردّ علينا لحجزه. — زيليني",
    "Email",
  ),
  tpl(
    "bday",
    "Birthday",
    "Happy birthday {first_name}! A small gift from us: use code {offer_code} on your next order. — Zelliny",
    "عيد ميلاد سعيد {first_name}! هدية صغيرة منا: استخدم الكود {offer_code} في طلبك القادم. — زيليني",
    "WhatsApp",
    false,
    "GIFTWRAP",
  ),
  tpl(
    "promo",
    "Promotion",
    "Hi {first_name}, new arrivals have just landed at Zelliny. Discover them at zelliny.com — Zelliny",
    "مرحباً {first_name}، وصلت تشكيلة جديدة إلى زيليني. اكتشفها على zelliny.com — زيليني",
    "Email",
  ),
  tpl(WRITE_OWN, "Write your own", "Hi {first_name}, ", "مرحباً {first_name}، "),
];

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const set = (next: MessageTemplate[]) => {
  templates = next;
  listeners.forEach((l) => l());
};

/** Templates as the other boxes (customer, enquiries…) use them: {offer_code} is filled in. */
export const useMessageTemplates = () => {
  const raw = useRawTemplates();
  return useMemo(
    () =>
      raw.map((t) => ({
        ...t,
        text: t.offer ? t.text.replace(/\{offer_code\}/g, t.offer) : t.text,
        textAr: t.offer ? t.textAr.replace(/\{offer_code\}/g, t.offer) : t.textAr,
      })),
    [raw],
  );
};
/** The templates exactly as written, with {offer_code} still in the message — for Settings. */
export const useRawTemplates = () =>
  useSyncExternalStore(
    subscribe,
    () => templates,
    () => templates,
  );

export type TemplateDraft = Omit<MessageTemplate, "id" | "approved"> & { id?: string | undefined };
/**
 * Adds a template, or replaces the one with this id. A WhatsApp template that is new or changed
 * goes to Meta for approval and can be used once approved; Email templates are ready at once.
 */
export function saveTemplate(t: TemplateDraft) {
  const approved = t.channel === "Email";
  if (t.id && templates.some((x) => x.id === t.id)) {
    set(templates.map((x) => (x.id === t.id ? { ...t, id: x.id, approved } : x)));
  } else {
    set([...templates, { ...t, id: `t${Date.now().toString(36)}`, approved }]);
  }
}
export function deleteTemplate(id: string) {
  if (templates.length > 1) set(templates.filter((x) => x.id !== id));
}

/** Fills {first_name}, {product} and {order}. Pass `firstName` to fill the name too. */
export function fillTemplate(
  text: string,
  v: { firstName?: string; product?: string; order?: string },
) {
  return text
    .replace(/\{first[_ ]name\}/g, v.firstName ?? "{first_name}")
    .replace(/\{product\}/g, v.product ?? "{product}")
    .replace(/\{order\}/g, v.order ?? "{order}");
}
