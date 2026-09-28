import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shellQuery } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/$section")({
  head: ({ params }) => {
    const t = params.section.charAt(0).toUpperCase() + params.section.slice(1);
    return {
      meta: [
        { title: `${t} — Zelliny Admin` },
        { name: "description", content: `Manage ${params.section} in the Zelliny admin.` },
        { property: "og:title", content: `${t} — Zelliny Admin` },
        { property: "og:description", content: `Manage ${params.section} in the Zelliny admin.` },
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const { data } = useSuspenseQuery(shellQuery());
  const item = data.nav.flatMap((g) => g.items).find((i) => i.key === section);
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">Coming next</p>
        <h1 className="mt-2 text-[32px]">{item?.label ?? section}</h1>
        <p className="mt-2 text-muted-foreground">This screen will be converted in the next batch.</p>
        <Link to="/" className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-[13px] text-primary-foreground">Back to dashboard</Link>
      </div>
    </div>
  );
}
