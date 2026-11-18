# Canlı dərslər (cədvəl + xarici görüş linki)

Müəllim sinif üçün dərs planlaşdırır (Zoom / Google Meet / Teams / başqa https link). Şagird linki YALNIZ
dərsdən 10 dəqiqə əvvəl "Qoşul" düyməsi ilə alır (səhifənin HTML-inə yazılmır). Davamiyyət qeyd olunur.

## 1. Fayllar
Zip-dəki yollarla eyni yerə köçür.

## 2. Baza
`src/db/live-schema.ts` yeni fayldır (2 cədvəl: live_sessions, live_joins; 2 enum).
- `drizzle.config.ts` -> schema massivinə `"./src/db/live-schema.ts"` əlavə et.
- `npx drizzle-kit generate` + migrate (zip-dəki `drizzle/0004_live_lessons.sql` yalnız nümunədir; sənin PGlite
  miqrasiya zəncirinlə uyğun gəlməyə bilər, ona görə öz generate-ni işlət).

## 3. Naviqasiya (`src/components/panel/nav-config.ts`) - 3 sətir əlavə et
STUDENT_NAV: `{ href: "/panel/canli-dersler", label: "Canlı dərslər", icon: "calendar" },`
TEACHER_NAV: `{ href: "/muellim/canli-dersler", label: "Canlı dərslər", icon: "calendar" },`
ADMIN_NAV:   `{ href: "/idare/canli-dersler", label: "Canlı dərslər", icon: "calendar" },`

## 4. Xatırlatma (könüllü)
`GET /api/cron/live-reminders` - hər 5 dəqiqədən bir `Authorization: Bearer $CRON_SECRET` ilə çağır.
Dərsdən 30 dəqiqə əvvəl bir dəfə bildiriş göndərir (təkrarlanmır).

## 5. Asılılıqlar (səndə olmalıdır)
`@/components/content/form-kit` (CForm, CField, CSelect, CTextArea), `@/components/content/no-permission`,
`@/components/ui/{action-form,button,card,confirm-button,table}`, `@/components/panel/shell` (PageHeader),
`@/lib/{auth,session,permissions,notify,audit,rate-limit,format}`, `@/lib/content/{access,action-utils}`.
Əgər adları/imzaları fərqlidirsə, tsc dəqiq yeri göstərəcək.

## 6. Qaydalar
- Müəllim yalnız öz siniflərinə dərs yaradır və "lessons.manage" icazəsi lazımdır; admin hər sinif üçün.
- Başqa müəllimin dərsi "tapılmadı" kimi görünür.
- Link yalnız https, IP/localhost qadağandır; provayder host-dan təyin olunur.
- Vaxt Bakı saatı (UTC+4) ilə daxil edilir.
- Testlər: `src/lib/live/rules.test.ts` (9), `tests/integration/live.test.ts` (14).
