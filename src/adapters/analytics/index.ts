// Analytics events (PRD 17). No balances, amounts tied to address, or addresses.
// Plug PostHog in here when NEXT_PUBLIC_POSTHOG_KEY is set; the call sites stay the same.
type Props = Record<string, string | number | boolean | undefined>;
type Sink = (event: string, props: Props) => void;

let sink: Sink = (event, props) => {
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, props);
};

export function setAnalyticsSink(s: Sink) {
  sink = s;
}

export function track(event: string, props: Props = {}) {
  try {
    sink(event, props);
  } catch {
    /* never break the UI for analytics */
  }
}
