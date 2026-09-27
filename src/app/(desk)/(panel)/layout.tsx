import { PanelFrame } from "@/components/shell/PanelFrame";

/** History, Settings and Legal: closable panels, not main tabs. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelFrame>{children}</PanelFrame>;
}
