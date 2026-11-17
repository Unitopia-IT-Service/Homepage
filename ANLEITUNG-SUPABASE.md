# Supabase einrichten – Unitopia IT-Service

Damit funktionieren das Anfrage-Formular und der Admin-Bereich (`admin.html`). Du brauchst dafür keinen eigenen Server.

## 1. Projekt anlegen
1. Auf supabase.com ein kostenloses Konto erstellen und **New project** wählen.
2. Region **Frankfurt (eu-central-1)** wählen (Daten bleiben in der EU). Starkes Datenbank-Passwort vergeben und sicher aufbewahren.

## 2. Datenbank einrichten
1. Im Projekt links **SQL Editor** öffnen.
2. Den Inhalt von `supabase/schema.sql` einfügen und auf **Run** klicken.

## 3. Deinen Admin-Zugang anlegen
1. **Authentication → Users → Add user → Create new user**: deine E-Mail und ein langes Passwort eintragen, **Auto Confirm User** anhaken.
2. Zurück im **SQL Editor** diese Zeilen ausführen (E-Mail anpassen):
```sql
insert into public.profiles (id, email, role, first_name, last_name, job_title)
select id, email, 'admin', 'Vorname', 'Nachname', 'Inhaber' from auth.users where email = 'DEINE-LOGIN-MAIL';
```
3. **Authentication → Sign In / Providers → Email**: **Allow new users to sign up** ausschalten, damit sich niemand selbst registrieren kann.

## 4. Funktionen bereitstellen (Edge Functions)
Im Dashboard **Edge Functions → Deploy a new function → Via Editor**. Drei Funktionen mit **genau diesen Namen** anlegen und den Code aus den Ordnern einfügen:
- `submit-inquiry` (aus `supabase/functions/submit-inquiry/index.ts`)
- `manage-inquiry` (aus `supabase/functions/manage-inquiry/index.ts`)
- `manage-team` (aus `supabase/functions/manage-team/index.ts`)

**Verify JWT** (JWT-Prüfung) je Funktion:
- `submit-inquiry`: **ausschalten**. Das Anfrageformular wird von Besuchern ohne Anmeldung benutzt. Neue Supabase-Projekte nutzen Publishable Keys, und die sind keine JWTs, deshalb würde die Plattform die Anfragen sonst mit „401“ abweisen. Die Funktion prüft alle Eingaben selbst.
- `manage-inquiry` und `manage-team`: **anlassen**. Sie werden nur von angemeldeten Personen aufgerufen.

## 5. Website verbinden
**Project Settings → API**: Project URL und den `anon`/`publishable` Key kopieren und in `config.js` eintragen. Den `service_role`-Key (bzw. Secret Key) niemals in die Website eintragen. Standardmäßig steht in `config.js` ein Platzhalter mit `DEIN-PROJEKT`; solange der drin ist, zeigt die Website freundlich an, dass das Anfrage-System noch nicht verbunden ist.

## 6. Einladungen für weitere Personen (optional)
**Authentication → URL Configuration**: Als **Site URL** die Adresse deiner Website eintragen und bei **Redirect URLs** zusätzlich die Adresse von `admin.html`.

## 7. E-Mail-Benachrichtigung (optional)
Ohne diesen Schritt funktioniert alles, es werden nur keine E-Mails verschickt. Mit einem Konto bei resend.com unter **Edge Functions → Secrets** setzen:
- `RESEND_API_KEY` (dein Resend-Schlüssel)
- `OWNER_EMAIL` (deine Adresse für Hinweise zu neuen Anfragen)
- `MAIL_FROM` (Absender; mit eigener verifizierter Domain, sonst funktioniert nur der Test-Absender)

## 8. Testen
1. Anfrage über das Formular auf der Website senden.
2. `admin.html` öffnen, anmelden, die Anfrage sollte erscheinen.

## Noch zu erledigen vor dem Livegang
- Impressum und Datenschutz: alle Angaben in eckigen Klammern ersetzen (Name, Anschrift, Hosting-Anbieter, Aufsichtsbehörde).
- Datenschutz Abschnitt 8 nennt als Serverstandort Frankfurt. Falls du eine andere Region gewählt hast, den Satz anpassen.
- Datenschutz Abschnitt 7 (E-Mail-Dienst) löschen, falls du Schritt 7 nicht einrichtest.
- Im Impressum steht der Hinweis auf § 19 UStG (Kleinunternehmer). Das gilt nur, wenn du die Kleinunternehmerregelung beim Finanzamt gewählt hast, sonst streichen.
