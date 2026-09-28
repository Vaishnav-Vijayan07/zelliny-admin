import { useSuspenseQuery } from "@tanstack/react-query";
import { simplePageQuery, type SimpleKey } from "@/lib/api/sections.functions";
import { PageHeader, SettingsGroups } from "./page";

export function SimpleSectionPage({ sectionKey, title, subtitle }: { sectionKey: SimpleKey; title: string; subtitle: string }) {
  const { data } = useSuspenseQuery(simplePageQuery(sectionKey));
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <SettingsGroups groups={data.groups} />
    </>
  );
}
