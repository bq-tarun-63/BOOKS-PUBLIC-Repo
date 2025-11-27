import SettingsPageClient from "./SettingsPageClient";

type SearchParams = {
  tab?: string;
  github?: string;
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedParams = await searchParams;
  const tabParam = typeof resolvedParams.tab === "string" ? resolvedParams.tab : undefined;
  const githubParam = typeof resolvedParams.github === "string" ? resolvedParams.github : undefined;

  return <SettingsPageClient tab={tabParam} github={githubParam} />;
}


