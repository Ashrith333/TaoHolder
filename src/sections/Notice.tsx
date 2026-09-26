import { Alert } from "@/components/ui";

/** Config-only section: show a note from layout props, e.g. { "text": "...", "kind": "red" }. */
export function Notice(props: Record<string, unknown>) {
  const text = typeof props.text === "string" ? props.text : "";
  if (!text) return null;
  return <Alert kind={props.kind === "red" ? "red" : "note"}>{text}</Alert>;
}
