// Message templates shared by every WhatsApp / email / SMS box and Settings › Message templates.
// Local for now — swap the three mutators for API calls.
import { useSyncExternalStore } from "react";

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
}

export const WRITE_OWN = "custom";

let templates: MessageTemplate[] = [
  {
    id: "thanks",
    name: "Thank you",
    text: "Hi {first_name}, thank you for shopping with Zelliny. We hope you love your order. — Zelliny",
  },
  {
    id: "order",
    name: "Order update",
    text: "Hi {first_name}, an update on your order {order}: it is on its way. Our courier will call before delivery. — Zelliny",
  },
  {
    id: "wish",
    name: "Wishlist offer",
    text: "Hi {first_name}, the {product} on your wishlist is waiting for you — enjoy 10% off this week with code ZEL10. — Zelliny",
  },
  {
    id: "back",
    name: "Back in stock",
    text: "Hi {first_name}, good news — {product} is back in stock. Reply to reserve yours. — Zelliny",
  },
  {
    id: "bday",
    name: "Birthday",
    text: "Happy birthday {first_name}! A small gift from us: 15% off your next order with code BDAY15. — Zelliny",
  },
  {
    id: "promo",
    name: "Promotion",
    text: "Hi {first_name}, new arrivals have just landed at Zelliny. Discover them at zelliny.com — Zelliny",
  },
  { id: WRITE_OWN, name: "Write your own", text: "Hi {first_name}, " },
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

export const useMessageTemplates = () =>
  useSyncExternalStore(
    subscribe,
    () => templates,
    () => templates,
  );

/** Adds a template, or replaces the one with this id. */
export function saveTemplate(t: { id?: string | undefined; name: string; text: string }) {
  if (t.id && templates.some((x) => x.id === t.id)) {
    set(templates.map((x) => (x.id === t.id ? { id: x.id, name: t.name, text: t.text } : x)));
  } else {
    set([...templates, { id: `t${Date.now().toString(36)}`, name: t.name, text: t.text }]);
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
