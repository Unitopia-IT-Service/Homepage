// Hier kommen die Zugangsdaten deines Supabase-Projekts hinein (siehe ANLEITUNG-SUPABASE.md, Schritt 5).
// Du findest beides in Supabase unter: Project Settings -> API (bzw. API Keys).
// Der anon- bzw. Publishable-Key darf im Frontend stehen, weil die Zugriffsregeln (RLS) die Daten schützen.
// NIEMALS den service_role- bzw. Secret-Key hier eintragen!
window.UNITOPIA_CONFIG = {
  SUPABASE_URL: "https://DEIN-PROJEKT.supabase.co",
  SUPABASE_ANON_KEY: "DEIN-ANON-ODER-PUBLISHABLE-KEY"
};
