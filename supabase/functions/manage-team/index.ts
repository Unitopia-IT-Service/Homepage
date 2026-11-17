// Edge Function "manage-team": Zugänge einladen, ändern und entfernen (nur Administratoren).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Nicht angemeldet" }, 401);

  const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await db.from("profiles").select("role,active").eq("id", user.id).single();
  if (!me?.active || me.role !== "admin") return json({ error: "Nur Administratoren dürfen das" }, 403);

  let b: any;
  try { b = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }

  if (b.action === "invite") {
    const email = clean(b.email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Ungültige E-Mail-Adresse" }, 400);
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: clean(b.redirect_to, 300) || undefined });
    if (error || !data?.user) return json({ error: error?.message ?? "Einladung fehlgeschlagen" }, 400);
    const { error: pe } = await db.from("profiles").upsert({
      id: data.user.id, email, role: "staff", active: true,
      first_name: clean(b.first_name, 60), last_name: clean(b.last_name, 60),
      phone: clean(b.phone, 40) || null, job_title: clean(b.job_title, 60) || null,
    });
    return pe ? json({ error: "Profil konnte nicht angelegt werden" }, 500) : json({ ok: true });
  }

  const uid = String(b.user_id ?? "");
  if (!uid) return json({ error: "Person fehlt" }, 400);

  if (b.action === "update") {
    const email = clean(b.email, 200).toLowerCase();
    const { data: cur } = await db.from("profiles").select("email").eq("id", uid).single();
    if (cur && email && email !== cur.email) {
      const { error } = await db.auth.admin.updateUserById(uid, { email, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
    }
    const { error } = await db.from("profiles").update({
      email: email || cur?.email, first_name: clean(b.first_name, 60), last_name: clean(b.last_name, 60),
      phone: clean(b.phone, 40) || null, job_title: clean(b.job_title, 60) || null,
    }).eq("id", uid);
    return error ? json({ error: "Speichern fehlgeschlagen" }, 500) : json({ ok: true });
  }

  if (b.action === "remove") {
    if (uid === user.id) return json({ error: "Du kannst dich nicht selbst entfernen" }, 400);
    const { error } = await db.auth.admin.deleteUser(uid);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  return json({ error: "Unbekannte Aktion" }, 400);
});
