// Edge Function "manage-inquiry": Status ändern und Anfragen löschen (nur angemeldete, aktive Zugänge).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const STATUSES = ["Neu", "Angenommen", "In Bearbeitung", "Abgeschlossen", "Abgelehnt"];

async function sendMail(to: string, subject: string, text: string): Promise<{ r: "sent" | "failed" | "none"; err?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to) return { r: "none" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("MAIL_FROM") ?? "Unitopia IT-Service <onboarding@resend.dev>",
        to: [to], subject, text,
      }),
    });
    return res.ok ? { r: "sent" } : { r: "failed", err: (await res.text()).slice(0, 200) };
  } catch (e) {
    return { r: "failed", err: String(e).slice(0, 200) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prof } = await db.from("profiles").select("active").eq("id", user.id).single();
  if (!prof?.active) return json({ error: "Kein Zugriff" }, 403);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const id = String(b.inquiry_id ?? "");
  if (!id) return json({ error: "Anfrage fehlt" }, 400);

  if (b.action === "delete") {
    const { error } = await db.from("inquiries").delete().eq("id", id);
    return error ? json({ error: "Löschen fehlgeschlagen" }, 500) : json({ ok: true });
  }

  if (b.action === "status") {
    const status = String(b.status ?? "");
    if (!STATUSES.includes(status)) return json({ error: "Ungültiger Status" }, 400);
    const { data: inq, error: e1 } = await db.from("inquiries").select("*").eq("id", id).single();
    if (e1 || !inq) return json({ error: "Anfrage nicht gefunden" }, 404);
    const { error } = await db.from("inquiries").update({ status }).eq("id", id);
    if (error) return json({ error: "Status konnte nicht gespeichert werden" }, 500);

    let mail: "sent" | "failed" | "none" = "none", mail_error: string | undefined;
    if (status === "Angenommen" && !inq.confirm_mail) {
      const m = await sendMail(
        inq.email,
        "Deine Anfrage bei Unitopia IT-Service",
        `Hallo ${inq.full_name},\n\nvielen Dank für deine Anfrage. Wir haben sie angenommen und melden uns zur Terminabstimmung persönlich bei dir.\n\n` +
        `Viele Grüße\nUnitopia IT-Service\nTelefon: 0155 65430828\nE-Mail: Unitopia.itservice@gmx.de`,
      );
      mail = m.r; mail_error = m.err;
      if (m.r !== "none") await db.from("inquiries").update({ confirm_mail: m.r, mail_error: m.err ?? null }).eq("id", id);
    }
    return json({ ok: true, mail, to: inq.email, mail_error });
  }
  return json({ error: "Unbekannte Aktion" }, 400);
});
