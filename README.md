# MH Academy

Onlayn təhsil platforması: fənlər, video dərslər, müəllimlər, onlayn sınaqlar, nəticələr.
Stack: Next.js 16 (App Router) · React 19 · Drizzle ORM + PostgreSQL · Tailwind 4 · jose (sessiya) · argon2.

## Ən sürətli start (Postgres quraşdırmadan)

```bash
npm install
npm run dev                 # yerli baza (PGlite) + ilk dəfə cədvəllər və demo data + Next.js (dev:local eynidir)
```
Data `.data/pglite` qovluğunda saxlanır (silsən baza sıfırlanır). Demo giriş: `admin@demo.mhacademy.local`,
`student@demo.mhacademy.local`, `leyla@demo.mhacademy.local` — parol `Demo-Parol-2026`.

## Adi Postgres ilə quraşdırma

```bash
npm install
cp .env.example .env        # DATABASE_URL və APP_URL-i doldur
npm run db:migrate          # sxemi tətbiq et
npm run db:seed             # demo məlumat (yenidən: -- --reset)
npm run db:import-scores    # İxtisas balları (DİM 2026), /ixtisas-ballari səhifəsi üçün
npm run dev                 # http://localhost:3000
```

## Əmrlər

| Əmr | Təyinatı |
|---|---|
| `npm run dev` | Yerli baza (PGlite) + Next.js. Adi Postgres ilə: `npm run dev:pg` |
| `npm run build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (integration testləri üçün `TEST_DATABASE_URL`) |
| `npm run db:generate` | Sxem dəyişikliyindən migrasiya yarat |

## İxtisas balları

`/ixtisas-ballari` səhifəsi DİM-in 2026-cı il keçid balları nəşrindən (I, II, III, IV, V qrup; Azərbaycan və Rus bölməsi)
çıxarılmış 1480 ixtisası göstərir. Data `scripts/data/admission-scores-2026.json` faylındadır, `npm run db:import-scores`
onu bazaya yükləyir (təkrar işlətsən həmin ilin sətirləri yenilənir). `npm run dev:local` bunu özü edir.
Yeni il üçün eyni formatda `admission-scores-<il>.json` əlavə edib `npm run db:import-scores -- <il>` işlət.

## Struktur

- `src/app/(site)` – açıq səhifələr (fənlər, dərslər, müəllimlər, sınaqlar, nəticələr)
- `src/app/(auth)` – giriş, qeydiyyat, şifrə bərpası
- `src/app/panel` · `muellim` · `idare` – şagird / müəllim / admin panelləri
- `src/db` – Drizzle sxemi və bağlantı
- `src/lib` – auth, sessiya, icazələr, scoring, rate-limit, email və s.
- `src/lib/queries` – oxuma sorğuları (`catalog`, `public`, `panel`)

## Status

Hazırdır: açıq sayt, auth, rollar, dərs kataloqu, sınaq siyahısı/detalı, panel girişləri.
Növbəti: sınaq keçirmə (attempt) axını, panel/idarə CRUD, integration testləri (`tests/integration` boşdur), e2e (Playwright).
