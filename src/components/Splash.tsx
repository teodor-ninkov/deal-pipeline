import type { ReactNode } from "react";

export default function Splash({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <main className="splash">
      <div className="splash-card">
        <h1>Deal Pipeline</h1>
        <p>{text}</p>
        {children}
      </div>
    </main>
  );
}
