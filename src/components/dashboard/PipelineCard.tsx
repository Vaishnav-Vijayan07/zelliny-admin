import { Link } from "@tanstack/react-router";
import type { PipelineStage } from "@/lib/api/types";
import { Panel, SectionLink } from "@/components/admin/primitives";

const colorClass: Record<PipelineStage["color"], string> = {
  primary: "bg-primary",
  info: "bg-info",
  quoted: "bg-quoted",
  warn: "bg-warn",
  good: "bg-good",
  bad: "bg-bad",
};

interface Props {
  open: number;
  notContacted: number;
  stages: PipelineStage[];
}

export function PipelineCard({ open, notContacted, stages }: Props) {
  const max = Math.max(...stages.map((s) => s.count), 1) * 2.5;
  return (
    <Panel
      title="Corporate pipeline"
      action={<SectionLink to="enquiries">Open enquiries</SectionLink>}
    >
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="md:w-28 md:border-r md:border-border">
          <b className="block font-head text-[28px] font-normal">{open}</b>
          <span className="text-[12px] text-muted-foreground">open enquiries</span>
        </div>
        <div className="flex-1">
          {stages.map((s) => (
            <div key={s.label} className="flex items-center gap-4 py-1.5 text-[13px]">
              <span className="flex w-24 items-center gap-2">
                <i className={`size-1.5 rounded-full ${colorClass[s.color]}`} />
                {s.label}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${colorClass[s.color]}`}
                  style={{ width: `${(s.count / max) * 100}%` }}
                />
              </div>
              <b className="w-4 text-right font-medium">{s.count}</b>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-line-soft pt-3 text-[12.5px]">
            <span>
              <b className="font-medium">{notContacted}</b> not yet contacted
            </span>
            <Link
              to="/$section"
              params={{ section: "enquiries" }}
              className="underline underline-offset-[3px]"
            >
              Show them →
            </Link>
          </div>
        </div>
      </div>
    </Panel>
  );
}
