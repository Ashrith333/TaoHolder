import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL } from "@/content-static/legal";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

/** Static legal pages. Final text comes from legal review before mainnet (D9). */
export default async function LegalPage({ params }: Props) {
  const doc = LEGAL[(await params).slug];
  if (!doc) notFound();
  return (
    <main className="mx-auto max-w-[680px] px-4 py-10">
      <Link href="/account" className="text-[13px] text-muted underline">taoholder</Link>
      <h1 className="mt-4 text-[26px] font-extrabold">{doc.title}</h1>
      {doc.body.map((p) => <p key={p} className="mt-4 text-[14px] leading-relaxed text-muted">{p}</p>)}
    </main>
  );
}
