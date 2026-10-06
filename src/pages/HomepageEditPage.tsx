import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/admin/page";
import { HomepageEditor } from "@/components/admin/HomepageEditor";

export default function HomepageEditPage() {
  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/content" className="underline underline-offset-[3px]">
            Site content
          </Link>{" "}
          / Homepage
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">Homepage</h1>
            <p className="mt-1 text-muted-foreground">
              Choose which sections appear on zelliny.com, their order, and what each one shows.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast("Opens the homepage in a new tab")}>
              Preview homepage
            </Button>
            <Button primary onClick={() => toast("Homepage published")}>
              Publish homepage
            </Button>
          </div>
        </div>
      </div>
      <HomepageEditor />
    </>
  );
}
