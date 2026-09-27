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
    <article className="max-w-[680px] pr-12">
      <h1 className="text-[22px] font-extrabold">{doc.title}</h1>
      {doc.body.map((p) => <p key={p} className="mt-4 text-[14px] leading-relaxed text-muted">{p}</p>)}
    </article>
  );
}
