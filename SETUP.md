# חיבור WHAT ל-Slack ולמסד משותף (Supabase)

אחרי ההתקנה:
- **Slack → WHAT:** מתייגים `@WHAT` בהודעה (או בתגובה בשרשור, והבוט ייקח את ההודעה המקורית), וההתראה נוספת לטבלה.
- **WHAT → Slack:** התראה חדשה בחומרה High/Critical, שינוי סטטוס ל-In progress/Resolved וסיכום יומי נשלחים לערוץ.
- כל הצוות רואה את אותם נתונים, בזמן אמת, אחרי התחברות עם מייל (קישור קסם).

אין צורך בטרמינל. הכול נעשה בממשקי Supabase, Slack ו-GitHub. סדר הצעדים חשוב.

## 1. פרויקט Supabase
1. נכנסים ל-https://supabase.com, יוצרים פרויקט (Free מספיק) ושומרים את הסיסמה.
2. **SQL Editor → New query**, מדביקים את כל התוכן של `supabase/migrations/0001_init.sql` ולוחצים **Run**.
3. מוסיפים את חברי הצוות (רק מי שברשימה יכנס לדשבורד):
   ```sql
   insert into public.team_members (email) values ('you@company.com'), ('teammate@company.com');
   ```
4. **Authentication → URL Configuration:** ב-Site URL שמים את כתובת האתר (`https://nitsand-hash.github.io/WHAT/`), וב-Redirect URLs מוסיפים את אותה כתובת.
5. **Project Settings → API:** מעתיקים את **Project URL** ואת מפתח ה-**anon public**.

## 2. חיבור הדשבורד
פותחים את `config.js` בריפו (בעורך של GitHub) ומדביקים:
```js
window.WHAT_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'eyJ...',   // anon public בלבד!
};
```
ה-anon key נועד להיות ציבורי. ההגנה היא התחברות + רשימת team_members. **לעולם לא** מדביקים כאן את ה-service_role key.
אחרי השמירה האתר יתעדכן אוטומטית ויציג מסך התחברות.

## 3. פריסת הפונקציות (דרך GitHub)
1. ב-Supabase: **Account → Access Tokens → Generate new token**, מעתיקים.
2. בריפו ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret**, ויוצרים שניים:
   - `SUPABASE_ACCESS_TOKEN` – הטוקן מהשלב הקודם.
   - `SUPABASE_PROJECT_ID` – ה-Reference ID של הפרויקט (ה-`xxxx` מכתובת ה-URL).
3. **Actions → Deploy Supabase functions → Run workflow.**

## 4. אפליקציית Slack
1. https://api.slack.com/apps → **Create New App → From scratch**. שם: `WHAT`, בוחרים את ה-workspace.
2. **OAuth & Permissions → Bot Token Scopes**, מוסיפים: `app_mentions:read`, `chat:write`, `chat:write.public`, `channels:history`, `groups:history`.
3. **Install to Workspace**, ומעתיקים את ה-**Bot User OAuth Token** (מתחיל ב-`xoxb-`).
4. **Basic Information → Signing Secret**, מעתיקים.
5. **Event Subscriptions:** מפעילים, ב-Request URL שמים
   `https://<PROJECT_REF>.supabase.co/functions/v1/slack-events`
   (צריך לקבל Verified, וזה עובד רק אחרי שהסודות בשלב 5 והפריסה בשלב 3 קיימים), ובסעיף **Subscribe to bot events** מוסיפים `app_mention`. שומרים.
6. מזמינים את הבוט לערוץ: `/invite @WHAT`.

## 5. סודות לפונקציות
**Supabase → Edge Functions → Secrets** (או Project Settings → Edge Functions), מוסיפים:

| שם | ערך |
|---|---|
| `SLACK_BOT_TOKEN` | הטוקן `xoxb-...` |
| `SLACK_SIGNING_SECRET` | ה-Signing Secret |
| `SLACK_DEFAULT_CHANNEL` | מזהה הערוץ להתראות וסיכום (Slack → קליק ימני על הערוץ → View details → למטה, מתחיל ב-`C`) |
| `WEBHOOK_SECRET` | מחרוזת אקראית ארוכה שתמציא |
| `APP_URL` | `https://nitsand-hash.github.io/WHAT/` |
| `ANTHROPIC_API_KEY` | *אופציונלי.* מאפשר ל-Claude לחלץ לקוח/סוג/חומרה מטקסט חופשי. בלעדיו עובד פענוח מילות מפתח |
| `SLACK_ALLOWED_CHANNELS` | *אופציונלי.* מזהי ערוצים מופרדים בפסיק. רק בהם הבוט יפתח התראות |
| `WHAT_TIMEZONE` | *אופציונלי.* ברירת מחדל `Asia/Jerusalem` |

## 6. התראות וסיכום יומי (פעם אחת)
פותחים את `supabase/setup-automation.sql`, מחליפים `<PROJECT_REF>` ו-`<WEBHOOK_SECRET>` (אותו ערך כמו בסוד), ומריצים ב-SQL Editor.
השעה כברירת מחדל: 18:00 שעון ישראל, ימים א׳–ה׳ (15:00 UTC בקיץ; בחורף משנים ל-`0 16 * * 0-4`).

## בדיקה
1. בערוץ: `@WHAT Acme Coffee – impersonator on Instagram, high` → תגובה בשרשור והתראה בטבלה.
2. בדשבורד: משנים סטטוס ל-Resolved → הודעה בשרשור המקורי.
3. בדשבורד: יוצרים התראה Critical → הודעה בערוץ ההתראות.
4. בטבלת `cron.job` / ב-Logs של Edge Functions רואים שהסיכום היומי רץ. אפשר גם להריץ ידנית מ-SQL Editor:
   ```sql
   select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/slack-daily-summary',
     headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret','<WEBHOOK_SECRET>'), body := '{}'::jsonb);
   ```

## שימו לב
- האתר ב-GitHub Pages ציבורי, אבל הנתונים מוגנים: בלי התחברות ובלי להיות ב-`team_members` אי אפשר לקרוא או לכתוב כלום.
- מי שמתייג את הבוט ב-Slack יכול ליצור התראה, גם אם אינו ב-`team_members`. כדי להגביל, משתמשים ב-`SLACK_ALLOWED_CHANNELS`.
- עריכה במקביל של אותו יום בסיכום היומי: הכותב האחרון מנצח. התראות נשמרות בנפרד, בלי התנגשויות.
