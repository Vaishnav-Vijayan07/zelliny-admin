// Prototype sample team accounts shown on the sign-in page (from the original HTML).
export interface TeamAccount {
  name: string;
  username: string;
  email: string;
  role: string;
}

export const TEAM_ACCOUNTS: TeamAccount[] = [
  { name: "Ramy Bakr", username: "ramy.bakr", email: "ramy.bakr@zelliny.com", role: "Owner" },
  { name: "Zain", username: "zain", email: "zain@zelliny.com", role: "Store manager" },
  { name: "Ahmed", username: "ahmed", email: "ahmed@zelliny.com", role: "Operations" },
  {
    name: "Abdelfattah Mohamed",
    username: "abdelfattah",
    email: "abdelfattah@zelliny.com",
    role: "Order desk",
  },
  {
    name: "Nada Samir",
    username: "nada.samir",
    email: "nada.samir@zelliny.com",
    role: "Content editor",
  },
];

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
