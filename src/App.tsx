import { lazy, Suspense, useState } from "react";
import Pipeline from "./Pipeline";
import Splash from "./components/Splash";
import { sampleDeals } from "./data/sample";
import { loadDeals } from "./lib/storage";
import { cloudEnabled } from "./lib/cloud";

// Team mode (Supabase) is a separate chunk, so the browser-only demo never loads it.
const CloudApp = lazy(() => import("./CloudApp"));

function LocalApp() {
  const [initial] = useState(() => loadDeals() ?? sampleDeals());
  return <Pipeline initialDeals={initial} mode="local" />;
}

export default function App() {
  if (!cloudEnabled) return <LocalApp />;
  return (
    <Suspense fallback={<Splash text="Loading…" />}>
      <CloudApp />
    </Suspense>
  );
}
