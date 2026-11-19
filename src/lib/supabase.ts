import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Deal } from "../types";
import { RemoteEvent, RemoteStore } from "./sync";
import { supabaseAnonKey, supabaseUrl } from "./cloud";

// Only imported by CloudApp, which is loaded lazily, so the local demo never downloads this.

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

interface DealRow {
  id: string;
  data: Deal;
}

export class NotOnTeamError extends Error {}

export function createSupabaseStore(db: SupabaseClient): RemoteStore {
  return {
    async load() {
      const member = await db.from("team_members").select("email").limit(1);
      if (member.error) throw member.error;
      if (!member.data.length) throw new NotOnTeamError("This account is not on the team yet.");
      const { data, error } = await db.from("deals").select("id, data").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as DealRow[]).map(r => r.data);
    },

    async apply({ upserts, deletes }) {
      if (upserts.length) {
        const { error } = await db.from("deals").upsert(upserts.map(d => ({ id: d.id, data: d })));
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await db.from("deals").delete().in("id", deletes);
        if (error) throw error;
      }
    },

    subscribe(onEvent: (e: RemoteEvent) => void) {
      const channel = db
        .channel("deals-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, payload => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<DealRow>).id;
            if (id) onEvent({ type: "delete", id });
          } else {
            const row = payload.new as DealRow;
            if (row?.data) onEvent({ type: "upsert", deal: row.data });
          }
        })
        .subscribe();
      return () => {
        void db.removeChannel(channel);
      };
    }
  };
}
