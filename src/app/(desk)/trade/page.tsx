import { Suspense } from "react";
import { PageSections } from "@/sections/PageSections";

export const metadata = { title: "Trade" };
export default function TradePage() {
  return (
    <Suspense>
      <PageSections page="trade" />
    </Suspense>
  );
}
