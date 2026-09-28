export const pageHead = (title: string, description: string) => ({
  meta: [
    { title: `${title} — Zelliny Admin` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Zelliny Admin` },
    { property: "og:description", content: description },
  ],
});
