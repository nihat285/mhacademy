# Ana səhifədə real statistika ("Şəxsi panel" bölməsi)

Daxil olmuş ŞAGİRD öz real nəticələrini görür. Qonaq və müəllim/admin nümunəni (açıq "Nümunə" nişanı ilə) görür,
çünki ictimai səhifədə "sənin" məlumatın yoxdur və başqasının nəticəsini göstərmək olmaz.

## Fayllar (zip-i kökdə aç)
src/lib/stats/student-stats.ts        (getStudentStats + buildStats; yalnız AÇIQLANMIŞ nəticələr sayılır)
src/lib/stats/student-stats.test.ts   (5 test)
src/components/site/dashboard-live.tsx

## src/app/(site)/page.tsx - 3 dəyişiklik (sənin faylın fərqli ola bilər, ona görə üstünə yazmadım)
1) import-lar:
   import { DashboardLive } from "@/components/site/dashboard-live";
   import { getStudentStats } from "@/lib/stats/student-stats";
   import { getCurrentUser } from "@/lib/session";
2) HomePage funksiyasının əvvəlində:
   const me = await getCurrentUser();
   const isStudent = me?.role === "student";
   const myStats = isStudent ? await getStudentStats(me.id) : null;
3) <Section eyebrow="Şəxsi panel" ...> bloku bununla əvəz olunur:
   {myStats && myStats.attempts > 0 ? (
     <Section eyebrow="Şəxsi panel" title="Sizin irəliləyişiniz" intro="Bu göstəricilər yalnız sizin saxlanılmış və açıqlanmış nəticələrinizdən hesablanır. Başqa heç kim onları görmür.">
       <DashboardLive stats={myStats} />
       <div className="mt-8"><LinkButton href="/panel/neticelerim">Bütün nəticələrim</LinkButton></div>
     </Section>
   ) : isStudent ? (
     <Section eyebrow="Şəxsi panel" title="İrəliləyişiniz burada görünəcək" intro="Hələ açıqlanmış sınaq nəticəniz yoxdur. İlk sınağı həll edəndən sonra nəticələrin dinamikası, dəqiqlik və təkrar etməli mövzular real məlumatlarınızla burada göstəriləcək.">
       <LinkButton href="/panel/sinaqlar">Sınaqlara bax</LinkButton>
     </Section>
   ) : (
     ...köhnə <Section> (DashboardPreview ilə) olduğu kimi qalır...
   )}

## Asılılıq
Sənin sxemdə `exam_attempts` (percentage, correct_count, incorrect_count, unanswered_count, graded_at, submitted_at),
`attempt_answers` (is_correct), `questions.topic_id`, `lessons.topic_id`, `exams.result_release/ends_at/results_released_at`
və `@/lib/exam/release` (isReleased) olmalıdır. Sütun adları fərqlidirsə tsc dəqiq yeri göstərəcək.
