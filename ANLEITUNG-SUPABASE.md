# Supabase einrichten – Unitopia IT-Service

Dauer: ca. 30–40 Minuten. Alles ist kostenlos nutzbar (Free-Plan reicht für den Start).

## Schritt 1 – Projekt anlegen
1. Auf https://supabase.com registrieren und **New project** wählen.
2. Name: `unitopia`, ein starkes Datenbank-Passwort vergeben (notieren).
3. **Region: Frankfurt (eu-central-1)** wählen. Das steht so auch in der Datenschutzerklärung.

## Schritt 2 – Datenbank anlegen
1. Links **SQL Editor → New query**.
2. Den kompletten Inhalt von `supabase/schema.sql` einfügen und **Run** klicken.
   Es sollte „Success“ erscheinen. (Der letzte Block gibt den Admin erst frei, wenn es den Benutzer schon gibt – das machen wir in Schritt 3 und führen ihn dann nochmal aus.)

## Schritt 3 – Deinen Admin-Zugang anlegen
1. **Authentication → Users → Add user → Create new user**.
2. E-Mail `Unitopia.itservice@gmx.de`, ein langes Passwort, Haken bei **Auto Confirm User**.
3. Zurück in den **SQL Editor** und `supabase/schema.sql` **nochmal komplett ausführen** (ist gefahrlos). Jetzt wird dein Konto als Administrator freigeschaltet.

## Schritt 4 – Anmeldung absichern
- **Authentication → Sign In / Providers → Email**: **„Allow new users to sign up“ ausschalten**. Sonst könnte sich jeder selbst registrieren. Mitarbeiter kommen nur per Einladung herein.
- **Authentication → URL Configuration**: Bei **Site URL** die Adresse deiner Website eintragen (z. B. `https://deine-domain.de`). Unter **Redirect URLs** zusätzlich `https://deine-domain.de/admin.html` eintragen.

## Schritt 5 – E-Mail-Vorlage für Einladungen
Der Admin-Bereich erwartet den Einladungslink in dieser Form.
**Authentication → Emails → Templates:**

**Invite user** – Betreff z. B. „Dein Zugang zu Unitopia IT-Service“, Inhalt:
```html
<h2>Willkommen bei Unitopia IT-Service</h2>
<p>Du wurdest eingeladen. Lege über den Link dein Passwort fest:</p>
<p><a href="{{ .RedirectTo }}?invite={{ .TokenHash }}&type=invite">Passwort festlegen</a></p>
```

**Reset password** (Passwort vergessen):
```html
<h2>Passwort zurücksetzen</h2>
<p><a href="{{ .RedirectTo }}?invite={{ .TokenHash }}&type=recovery">Neues Passwort festlegen</a></p>
```

Tipp: Das eingebaute Supabase-Mailsystem erlaubt nur wenige Mails pro Stunde. Besser unter **Authentication → Emails → SMTP Settings** dein GMX-Postfach eintragen (Host `mail.gmx.net`, Port `465`, Benutzer `Unitopia.itservice@gmx.de`, dein GMX-Passwort).

## Schritt 6 – GMX für den E-Mail-Versand freischalten
1. In GMX einloggen → **Einstellungen → E-Mail → POP3 & IMAP** → **„Zugriff auf GMX Postfach via POP3 und IMAP“ erlauben** (das schaltet auch SMTP frei).
2. Falls du Zwei-Faktor-Anmeldung nutzt, ein **Anwendungspasswort** erzeugen und dieses unten verwenden.

## Schritt 7 – Push-Schlüssel erzeugen (für Handy-Benachrichtigung)
`supabase/vapid-keys-generator.html` im Browser öffnen → **Schlüssel erzeugen**. Beide Werte bereithalten.

## Schritt 8 – Secrets eintragen
**Edge Functions → Secrets** (oder Project Settings → Edge Functions):

| Name | Wert |
|---|---|
| `SMTP_USER` | `Unitopia.itservice@gmx.de` |
| `SMTP_PASS` | dein GMX-Passwort bzw. Anwendungspasswort |
| `SMTP_HOST` | `mail.gmx.net` (optional, ist Standard) |
| `SMTP_PORT` | `465` (optional, ist Standard) |
| `NOTIFY_EMAIL` | `Unitopia.itservice@gmx.de` (optional, hierhin gehen neue Anfragen) |
| `VAPID_PUBLIC_KEY` | öffentlicher Schlüssel aus Schritt 7 |
| `VAPID_PRIVATE_KEY` | privater Schlüssel aus Schritt 7 |
| `VAPID_SUBJECT` | `mailto:Unitopia.itservice@gmx.de` |

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` gibt es automatisch – nicht selbst anlegen.

## Schritt 9 – Die 4 Functions bereitstellen
**Edge Functions → Deploy a new function → Via Editor.** Für jede Function: Namen **genau** so eintragen, den Code aus der gleichnamigen Datei einfügen, **Deploy**:

| Funktionsname | Datei |
|---|---|
| `submit-inquiry` | `supabase/functions/submit-inquiry/index.ts` |
| `manage-inquiry` | `supabase/functions/manage-inquiry/index.ts` |
| `manage-team` | `supabase/functions/manage-team/index.ts` |
| `push-notify` | `supabase/functions/push-notify/index.ts` |

**Wichtig:** Bei **jeder** der vier Functions unter *Details/Settings* **„Verify JWT“ ausschalten**. Die Functions prüfen die Anmeldung selbst; mit eingeschaltetem Häkchen schlägt das Formular mit den neuen Publishable Keys fehl.

(Alternativ mit der Supabase-CLI: `supabase functions deploy` im Ordner `Homepage`.)

## Schritt 10 – Website verbinden
1. **Project Settings → API** (bzw. **API Keys**): `Project URL` und den **anon / publishable** Key kopieren.
2. In `config.js` bei `SUPABASE_URL` und `SUPABASE_ANON_KEY` eintragen. **Niemals** den `service_role`/Secret-Key eintragen.
3. Dateien hochladen (Website muss über **https** laufen, sonst funktionieren App-Installation und Push nicht).

## Schritt 11 – Testen
1. Anfrage über das Formular auf der Website senden → sie erscheint in `admin.html` und eine Mail kommt bei GMX an.
2. In `admin.html` anmelden → Status „Angenommen“ setzen → der Kunde bekommt einmalig die Bestätigungsmail.
3. `app.html` auf dem Handy öffnen → anmelden → **Benachrichtigung aktivieren** → **Test senden**.
   - Android/Chrome: Menü → „App installieren“.
   - iPhone: Teilen → „Zum Home-Bildschirm“, dann die App von dort öffnen (nötig für Push).
4. Mitarbeiter einladen: in `admin.html` unten **Mitarbeiter einladen**.

## Wenn etwas nicht klappt
- „Funktion … nicht bereitgestellt“ → Name der Function stimmt nicht oder wurde nicht deployed.
- Formular sendet nicht → „Verify JWT“ noch an, oder `config.js` nicht eingetragen.
- Keine Mails → Schritt 6 nicht erledigt oder `SMTP_PASS` falsch. Der Fehler steht in der Anfrage unter „E-Mail an Team“.
- Keine Anfragen sichtbar → Schritt 3 vergessen (Admin-Profil nicht freigeschaltet).
