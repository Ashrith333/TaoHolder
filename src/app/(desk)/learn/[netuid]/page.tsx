import { notFound } from "next/navigation";
import { loadConfig } from "@/adapters/content/load";
import { PageSections } from "@/sections/PageSections";

type Props = { params: Promise<{ netuid: string }> };

export async function generateMetadata({ params }: Props) {
  const n = Number((await params).netuid);
  const s = (await loadConfig()).subnets.find((x) => x.netuid === n);
  return { title: s ? `${s.name} SN${n}` : "Subnet", description: s?.product ?? undefined };
}

export default async function SubnetPage({ params }: Props) {
  const n = Number((await params).netuid);
  if (!Number.isInteger(n) || n < 0) notFound();
  return <PageSections page="subnet" context={{ netuid: n }} />;
}
