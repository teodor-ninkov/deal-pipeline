import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Pipeline from "./Pipeline";
import Splash from "./components/Splash";
import { Deal } from "./types";
import { createSupabaseStore, getClient, NotOnTeamError } from "./lib/supabase";

function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await getClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  };

  if (state === "sent") {
    return <Splash text={"Check " + email.trim() + " for a sign-in link. You can close this tab."} />;
  }
  return (
    <Splash text="Sign in to the team board. We email you a link, no password needed.">
      <form className="signin" onSubmit={send}>
        <label>Work email
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a link"}</button>
        {state === "error" ? <p className="error">{error}</p> : null}
      </form>
    </Splash>
  );
}

export default function CloudApp() {
  const db = getClient();
  const store = useMemo(() => createSupabaseStore(db), [db]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [db]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    setDeals(null);
    setError("");
    store.load().then(
      d => { if (live) setDeals(d); },
      e => { if (live) setError(e instanceof NotOnTeamError ? e.message : "Could not load the board: " + (e?.message ?? String(e))); }
    );
    return () => { live = false; };
  }, [userId, store]);

  const signOut = () => { void db.auth.signOut(); };

  if (session === undefined) return <Splash text="Connecting…" />;
  if (!session) return <SignIn />;
  if (error) {
    return (
      <Splash text={error}>
        <p className="hint">Signed in as {session.user.email}. Ask the board owner to add this address to team_members.</p>
        <button type="button" onClick={signOut}>Sign out</button>
      </Splash>
    );
  }
  if (!deals) return <Splash text="Loading deals…" />;
  return <Pipeline key={userId} initialDeals={deals} mode="cloud" store={store} userEmail={session.user.email} onSignOut={signOut} />;
}
