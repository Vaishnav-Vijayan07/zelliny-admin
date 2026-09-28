import { toast } from "sonner";
/** Placeholder for actions that will call your API later. */
export const soon = (what: string) => () => toast(`${what} — connects to your API later`);
