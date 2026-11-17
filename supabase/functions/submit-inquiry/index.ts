// Edge Function "submit-inquiry": nimmt Anfragen aus dem Website-Formular entgegen.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SERVICES = [
  "Erstellung von Webseiten",
  "Konfiguration von Computern",
  "Fehlerdiagnose",
  "Austausch von Standardkomponenten",
  "Installation von Betriebssystemen und Software",
];
const TYPES = ["Privatkunde", "Geschäftskunde"];
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Optionaler Mailversand über Resend (nur wenn RESEND_API_KEY gesetzt ist)
async function sendMail(to: string, subject: string, text: string): Promise<"sent" | "failed" | "none"> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to) return "none";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("MAIL_FROM") ?? "Unitopia IT-Service <onboarding@resend.dev>",
        to: [to], subject, text,
      }),
    });
    return r.ok ? "sent" : "failed";
  } catch (_) {
    return "failed";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt" }, 405);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }

  const row = {
    full_name: clean(b.full_name, 120),
    email: clean(b.email, 200).toLowerCase(),
    phone: clean(b.phone, 60),
    customer_type: clean(b.customer_type, 40),
    device_type: clean(b.device_type, 120),
    location: clean(b.location, 120),
    device_count: Number.isInteger(Number(b.device_count)) && Number(b.device_count) >= 1 && Number(b.device_count) <= 999 ? Number(b.device_count) : null,
    message: clean(b.message, 4000) || null,
    preferred_date: /^\d{4}-\d{2}-\d{2}$/.test(String(b.preferred_date ?? "")) ? String(b.preferred_date) : null,
    services: Array.isArray(b.services)
      ? [...new Set(b.services.map((s: unknown) => clean(s, 100)).filter((s: string) => SERVICES.includes(s)))]
      : [],
  };

  if (!row.full_name || !row.phone || !row.device_type || !row.location) return json({ error: "Pflichtfelder fehlen" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return json({ error: "Ungültige E-Mail-Adresse" }, 400);
  if (!TYPES.includes(row.customer_type)) return json({ error: "Ungültige Kundenart" }, 400);
  if (!row.services.length) return json({ error: "Bitte mindestens eine Leistung wählen" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // einfacher Spam-Schutz: höchstens 3 Anfragen pro E-Mail in 10 Minuten
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from("inquiries").select("id", { count: "exact", head: true })
    .eq("email", row.email).gte("created_at", since);
  if ((count ?? 0) >= 3) return json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, 429);

  const { data, error } = await db.from("inquiries").insert(row).select("id").single();
  if (error) { console.error(error); return json({ error: "Speichern fehlgeschlagen" }, 500); }

  // Hinweis an dich (nur wenn Mailversand eingerichtet ist)
  const owner = Deno.env.get("OWNER_EMAIL") ?? "";
  const notify = await sendMail(
    owner,
    `Neue Anfrage von ${row.full_name}`,
    `Neue Anfrage bei Unitopia IT-Service\n\nName: ${row.full_name}\nTelefon: ${row.phone}\nE-Mail: ${row.email}\n` +
    `Kundenart: ${row.customer_type}\nGerät / Projekt: ${row.device_type}\nAnzahl Geräte: ${row.device_count ?? "-"}\nOrt / PLZ: ${row.location}\n` +
    `Wunschtermin: ${row.preferred_date ?? "-"}\nLeistungen: ${row.services.join(", ")}\n\n${row.message ?? ""}`,
  );
  if (notify !== "none") await db.from("inquiries").update({ notify_mail: notify }).eq("id", data.id);

  return json({ ok: true });
});
