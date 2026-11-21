# Sınaqlarda dinləmə və mətn (oxu parçası)

## Nə əlavə olunur
- **Parça** = mətn və/və ya audio + (könüllü) transkript + (könüllü) dinləmə limiti.
- Bir parçaya bir neçə sual bağlanır. Sınaqda bu suallar **həmişə ardıcıl** gəlir (qarışdırma açıq olsa belə, qruplar bütöv qarışır).
- Şagirdin sınaq ekranında sualın üstündə parça paneli çıxır (mətn + audio pleyer). Eyni parçanın növbəti sualında panel qalır, audio kəsilmir.
- **Dinləmə limiti** (məs. 2): "Dinlə" düyməsi, qalan say göstərilir; fasilə/davam say sayılmır, yalnız baştan başlamaq sayılır.
- **Transkript** sınaq zamanı brauzerə heç göndərilmir. Yalnız nəticə açıldıqdan sonra və sınaqda "izahları göstər" aktivdirsə, nəticə səhifəsində görünür.
- Müəllim/idarə: yeni səhifələr `/muellim/metnler`, `/idare/metnler` (siyahı, yaratma, redaktə, sual bağlama, silmə).

## Quraşdırma (sıra ilə)
1. Zipdəki faylları eyni yollarla layihəyə qoyun (`DEYISEN-FAYLLAR-REFERANS` qovluğu **kopyalanmır**, o yalnız baxmaq üçündür).
2. `drizzle.config.ts` → `schema` massivinə əlavə edin: `"./src/db/passage-schema.ts"`
3. Bazaya cədvəllər: `npx drizzle-kit generate` sonra `npx drizzle-kit migrate`.
   (Hazır SQL: `drizzle/0005_passages.sql`, 2 yeni cədvəl: `question_passages`, `question_passage_links`; mövcud cədvələ toxunmur.)
4. Aşağıdakı kiçik dəyişiklikləri mövcud fayllara edin.
5. `nav-config.ts` — müəllim və idarə menyusuna əlavə edin (ikon `lessons` mövcuddur):
   - `{ href: "/muellim/metnler", label: "Mətn və audio", icon: "lessons" },` (Sual bankından sonra)
   - `{ href: "/idare/metnler", label: "Mətn və audio", icon: "lessons" },`
6. `npm run build`

## Mövcud fayllarda edilən dəyişikliklər
(Tam son hallar `DEYISEN-FAYLLAR-REFERANS` içindədir.)

**src/lib/upload.ts** — `UploadKind`-ə `"audio"` əlavə olunur, limit 25 MB, `sniff()` MP3/OGG/WAV/M4A üçün magic-byte yoxlaması alır, `allowed` şərti audio ilə PDF/şəkli bir-birindən ayırır. Audio yalnız audio kimi qəbul olunur.

**src/lib/content/action-utils.ts** — `optionalUpload`-un `kind` tipi: `"image" | "document" | "audio"`.

**src/lib/exam/shuffle.ts** — sona `shuffleGrouped` və `groupContiguous` əlavə olunur.

**src/lib/exam/engine.ts**
- import: `questionPassageLinks, questionPassages` (`@/db/passage-schema`), `groupContiguous, shuffleGrouped`.
- `startAttempt`: `orderedIds` sətri əvəzinə parça bağlantılarını oxuyub `exam.shuffleQuestions ? shuffleGrouped(...) : groupContiguous(...)` istifadə olunur.
- `TakingQuestion`-a `passageId: string | null`, yeni `TakingPassage` tipi, `TakingState`-ə `passages: TakingPassage[]`.
- `getAttemptForTaking`: bağlantılar və parçalar (**transkript seçilmir**) yüklənir, `passageId` və `passages` qaytarılır.

**src/components/exam/exam-runner.tsx** — `PassagePanel` import; `const passage = q.passageId ? state.passages.find(...) : null;` və `<section aria-labelledby="q-title">`-dən əvvəl `{passage && <PassagePanel key={passage.id} passage={passage} attemptId={attemptId} />}`.

**src/lib/exam/results.ts** — `ReviewItem`-ə `passage: ReviewPassage | null`; `passagesForReview(qids)` çağırışı; transkript yalnız `reviewAllowed` olanda doldurulur.

**src/app/panel/neticelerim/[attemptId]/page.tsx** — `ReviewCard`-a `showPassage` və yeni `PassageReview` komponenti (parça ilk sualın üstündə bir dəfə göstərilir, transkript açılan blokdadır).

## Bilməli olduqlarınız (dürüst qeydlər)
- **Dinləmə limiti brauzerdə tətbiq olunur**, server tərəfdən yox: audio faylı ictimai URL-dir, texniki şagird faylı birbaşa aça bilər. Adi şagird üçün limit işləyir; ciddi "təkrar dinləmək olmaz" təminatı üçün imzalı/müvəqqəti linklər lazımdır (ayrıca iş).
- Audio yükləmə server action-la yox, ayrıca `/api/passages/audio` ilə gedir ki, `bodySizeLimit: "4mb"` dəyişməsin. Forma yalnız qaytarılan linki göndərir, server linkin öz qovluğumuzdan olduğunu yenidən yoxlayır.
- Production-da audio üçün S3 (`STORAGE_DRIVER=s3`) lazımdır, şəkillərdəki kimi.
- Parça silinəndə suallar silinmir, yalnız bağ ayrılır; köhnə nəticələrdə parça artıq görünməyəcək.
- Müəllim yalnız öz suallarını bağlaya bilir; idarə hamısını.
- Sual redaktə formasına toxunmadım: sual parçaya parçanın öz səhifəsindən bağlanır.

## Yoxlama
Vitest: 23 fayl / 213 test keçdi (yeni: qaydalar, qruplaşma, real bazada icazələr, sınaqda ardıcıllıq, transkriptin sızmaması). Brauzerdə: audio yükləmə, saxta faylın rədd edilməsi, 2 dəfə dinləmə limiti, panelin növbəti sualda qalması. `npm run build` uğurlu.
