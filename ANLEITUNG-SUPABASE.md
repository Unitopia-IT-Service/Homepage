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

## Schritt 10b – Über uns / Unser Team
`schema.sql` legt dafür automatisch die Tabelle `team_members` und den öffentlichen Bildspeicher `team` an. Personen pflegst du in `admin.html` im Bereich **„Website: Über uns → Unser Team anzeigen“**: Name, Position (z. B. Geschäftsführer), Beschreibung und Foto. Auf der Website erscheinen sie unter **Über uns → Unser Team**. Bitte nur Personen eintragen, die mit der Veröffentlichung einverstanden sind.

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

## Android-App (APK) erstellen
`app.html` wird mit **PWABuilder** (kostenlos, von Microsoft) in eine echte Android-App verpackt. Voraussetzung: Die Website läuft schon unter **https** (z. B. `https://deine-domain.de`).
1. Auf https://www.pwabuilder.com die Adresse `https://deine-domain.de/app.html` eingeben und **Start** drücken.
2. Bei **Package for stores → Android** wählen. Package ID z. B. `de.unitopia.app`, App name `Unitopia`, **Signing key: New** (die erzeugte Schlüsseldatei und das Passwort gut aufbewahren, sie werden für jedes Update gebraucht).
3. **Download** → im ZIP liegen die `.apk` (zum Installieren) und die `.aab` (für den Play Store). Außerdem die Datei `assetlinks.json`.
4. Die `assetlinks.json` auf deiner Website unter `https://deine-domain.de/.well-known/assetlinks.json` hochlegen. Ohne sie zeigt die App oben eine Adressleiste.
5. Die `.apk` in **Unitopia.apk** umbenennen und in denselben Ordner wie `admin.html` legen. Im Admin-Bereich lädt der Link „Mitarbeiter-App“ sie dann herunter.
6. Auf dem Handy die APK öffnen und „Installation aus unbekannten Quellen“ für den Browser erlauben.
Ohne Bauen geht es auch: `app.html` in Chrome öffnen → Menü → „App installieren“.

## Zusatz – Rechnungen & Angebote per E-Mail senden (Buchhaltung)
1. **Edge Functions → Deploy a new function** → Name `send-document` → Inhalt von `supabase/functions/send-document/index.ts` einfügen → **Verify JWT = AUS** → Deploy.
2. Es werden dieselben Secrets wie bei den anderen Functions benutzt (`SMTP_USER`, `SMTP_PASS`, …). Nichts Neues nötig.
3. `supabase/buchhaltung.sql` erneut im SQL-Editor ausführen (ist gefahrlos wiederholbar, ergänzt die Versand-Felder).
4. Der E-Mail-Text lässt sich unter Buchhaltung → Einstellungen anpassen.

## Wichtig – Links in Einladungs- und Passwort-Mails führen auf localhost?
Das liegt an zwei Einstellungen. Beide setzen:
1. **Supabase → Authentication → URL Configuration:** **Site URL** = deine echte Website (z. B. `https://deine-domain.de`, NICHT `http://localhost:3000`). Unter **Redirect URLs** zusätzlich `https://deine-domain.de/admin.html` eintragen. Ist die Adresse dort nicht erlaubt, nimmt Supabase die Site URL als Ersatz.
2. **`config.js`:** bei `SITE_URL` deine echte Website-Adresse eintragen (ohne Schrägstrich am Ende). Einladungen und „Passwort vergessen?“ benutzen dann immer diese Adresse, auch wenn du die Seite gerade lokal geöffnet hast.
Alte, bereits verschickte Links bleiben kaputt – bitte neu einladen bzw. „Passwort vergessen?“ erneut nutzen.

## Fehler „otp_expired – Email link is invalid or has expired“
- Der Link ist nur einmal und nur begrenzt gültig (Standard 1 Stunde: **Authentication → Sign In / Providers → Email → Email OTP Expiration**, dort bis 86400 s einstellbar). Mail-Programme/Virenscanner (auch GMX) öffnen Links manchmal vorab und „verbrauchen“ sie.
- Die Vorlagen **Invite user** und **Reset password** müssen die Variante mit `{{ .RedirectTo }}?invite={{ .TokenHash }}&type=…` enthalten (Schritt 5), NICHT `{{ .ConfirmationURL }}`. Nur dann wird der Link erst beim Klick auf „Passwort speichern“ verbraucht.
- Danach neuen Link anfordern („Passwort vergessen?“ auf der Login-Seite) – alte Links funktionieren nicht mehr.
