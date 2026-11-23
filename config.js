// Hier kommen die Zugangsdaten deines Supabase-Projekts hinein (siehe ANLEITUNG-SUPABASE.md, Schritt 5).
// Du findest beides in Supabase unter: Project Settings -> API (bzw. API Keys).
// Der anon- bzw. Publishable-Key darf im Frontend stehen, weil die Zugriffsregeln (RLS) die Daten schützen.
// NIEMALS den service_role- bzw. Secret-Key hier eintragen!
window.UNITOPIA_CONFIG = {
  SUPABASE_URL: "https://nkvrrouwuvjarcrctrlr.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Zv_dmPBQnahjEmmiX9Nj_g_BofJyBPz",
  // Nach dem Bauen der Android-App (APK) hier die Download-Adresse eintragen, z. B. "https://deine-domain.de/download/Unitopia.apk"
  // Adresse deiner echten Website OHNE Schrägstrich am Ende, z. B. "https://deine-domain.de". Wird für Einladungs- und Passwort-Links benutzt (nie localhost).
  SITE_URL: "https://unitopia-it-service.github.io/Homepage",
  // reCAPTCHA v3 – der Site-Key darf im Frontend stehen. Der Secret-Key kommt NUR in die Supabase-Secrets (RECAPTCHA_SECRET)!
  RECAPTCHA_SITE_KEY: "6Le3ii4uAAAAACOws_o4LllnEcFe5YQZjgj--T71",
  ANDROID_APP_URL: ""
};
