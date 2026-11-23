import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "Məxfilik siyasəti",
  description: "MH Academy platformasında fərdi məlumatların toplanması, işlənməsi, qorunması və istifadəçi hüquqları barədə məxfilik siyasəti.",
};

const DEVELOPER = "Atakişiyev Nihad";
const UPDATED = "24 noyabr 2026-cı il";

type Contact = { email?: string };

/** Each section is plain text (see Prose: paragraphs, "- " lists, **bold**) so it is never injected as HTML. */
const SECTIONS: { id: string; title: string; text: (c: { email: string }) => string }[] = [
  {
    id: "umumi",
    title: "1. Ümumi müddəalar",
    text: () => `Bu Məxfilik siyasəti (“Siyasət”) mhacademy.az ünvanında fəaliyyət göstərən MH Academy onlayn təhsil platformasında (“Platforma”) istifadəçilərin fərdi məlumatlarının necə toplandığını, işləndiyini, saxlandığını, qorunduğunu və istifadəçilərin bu barədə hansı hüquqlara malik olduğunu müəyyən edir.

Siyasət Azərbaycan Respublikasının “Fərdi məlumatlar haqqında” Qanununa və digər qüvvədə olan qanunvericilik aktlarına uyğun hazırlanıb.

Platformadan istifadə etməklə, qeydiyyatdan keçməklə və ya əlaqə formasını göndərməklə siz bu Siyasətlə tanış olduğunuzu təsdiq edirsiniz. Siyasətlə razı deyilsinizsə, Platformadan istifadə etməməlisiniz.

Platformanın veb-developeri: **${DEVELOPER}**. Platformanın texniki hazırlanması, işlək vəziyyətdə saxlanması və təhlükəsizliyi onun tərəfindən həyata keçirilir.`,
  },
  {
    id: "operator",
    title: "2. Operator və əlaqə",
    text: ({ email }) => `Fərdi məlumatların operatoru Platformanı idarə edən MH Academy-dir (“Operator”).

Məxfilik və fərdi məlumatlarla bağlı bütün sorğular üçün: ${email}

Texniki məsələlər (təhlükəsizlik xətası, məlumat sızması şübhəsi və s.) üçün Platformanın veb-developeri ${DEVELOPER} ilə də Operator vasitəsilə əlaqə saxlaya bilərsiniz.`,
  },
  {
    id: "melumatlar",
    title: "3. Hansı məlumatlar toplanır",
    text: () => `**Qeydiyyat və hesab məlumatları:** ad və soyad, e-poçt ünvanı, parol (yalnız şifrələnmiş, geri qaytarıla bilməyən formada), profil şəkli (istəyə bağlı), istifadəçi rolu (şagird, müəllim, idarə).

**Təhsil məlumatları:** sinif, təhsil məqsədləri (istəyə bağlı), baxılan dərslər, sınaq cəhdləri, verilən cavablar, alınan bal və nəticələr, zəif və güclü mövzular, gündəlik fəallıq seriyası, canlı dərslərdə iştirak.

**Reytinq məlumatları:** reytinqdə iştirak yalnız sizin razılığınızla həyata keçirilir. İştirak edirsinizsə, adınız əvəzinə seçdiyiniz təxəllüs göstərilə bilər.

**Müəllimlər üçün:** təqdimat məlumatları (başlıq, təsvir, ixtisas), yüklənmiş dərs, sual və digər tədris materialları.

**Əlaqə məlumatları:** əlaqə formasını doldurduqda göndərdiyiniz ad, e-poçt və mesaj mətni.

**Yüklənən fayllar:** sual şəkilləri, sənədlər, audio fayllar və sizin yüklədiyiniz digər materiallar.

**Texniki məlumatlar:** IP ünvanı, brauzer və cihaz məlumatı, giriş tarixi və vaxtı, təhlükəsizlik və əməliyyat jurnalları (audit qeydləri).

Platforma sizdən həssas məlumatlar (sağlamlıq, dini və siyasi baxışlar, biometrik məlumatlar) tələb etmir və toplamır. Zəhmət olmasa, bu cür məlumatları mesajlarda və ya yüklənən fayllarda paylaşmayın.`,
  },
  {
    id: "meqsed",
    title: "4. Məlumatlardan nə üçün istifadə olunur",
    text: () => `Məlumatlar yalnız aşağıdakı məqsədlərlə işlənir:

- hesabın yaradılması, girişin təmin edilməsi və istifadəçinin eyniləşdirilməsi;
- dərslərin, kursların, sınaqların və canlı dərslərin təqdim edilməsi;
- sınaq nəticələrinin hesablanması, şagirdin irəliləyişinin və zəif mövzularının göstərilməsi;
- bildirişlərin (nəticə, canlı dərs xatırlatması, təsdiq və şifrə bərpası) göndərilməsi;
- müraciətlərə cavab verilməsi və istifadəçi dəstəyi;
- Platformanın təhlükəsizliyinin təmin edilməsi, saxtakarlığın, sui-istifadənin və icazəsiz girişin qarşısının alınması;
- Platformanın keyfiyyətinin və işinin yaxşılaşdırılması;
- qanunvericiliyin tələblərinin yerinə yetirilməsi.

Məlumatlarınız reklam məqsədilə satılmır və üçüncü şəxslərə marketinq üçün ötürülmür.`,
  },
  {
    id: "esas",
    title: "5. İşləmənin hüquqi əsasları",
    text: () => `Fərdi məlumatlar aşağıdakı əsaslardan biri ilə işlənir:

- **Razılıq:** qeydiyyat zamanı və reytinqdə iştirak kimi istəyə bağlı funksiyalar üçün verdiyiniz razılıq. Razılığı istənilən vaxt geri götürə bilərsiniz;
- **Müqavilənin icrası:** Platformadan istifadə şərtləri çərçivəsində xidmətin göstərilməsi;
- **Qanuni maraq:** təhlükəsizliyin təmin edilməsi və Platformanın düzgün işləməsi;
- **Qanunvericilik tələbi:** səlahiyyətli dövlət orqanlarının qanuni sorğularının icrası.`,
  },
  {
    id: "usaq",
    title: "6. Azyaşlıların məlumatları",
    text: () => `Platformanın istifadəçilərinin bir hissəsi şagirdlərdir və onlar azyaşlı ola bilər. 18 yaşına çatmamış şəxslər Platformada qeydiyyatdan keçərkən valideynin və ya qanuni nümayəndənin xəbəri və razılığı ilə hərəkət etməlidir.

Valideyn və ya qanuni nümayəndə övladının məlumatları ilə tanış olmaq, onları düzəltmək və ya silinməsini tələb etmək hüququna malikdir. Bunun üçün 2-ci bənddəki ünvana müraciət edə bilərsiniz.

Operator azyaşlılardan qəsdən lazımsız məlumat toplamır. Belə məlumatların toplandığını aşkar etsəniz, bizə bildirin, onları dərhal siləcəyik.`,
  },
  {
    id: "kukiler",
    title: "7. Kukilər (cookies)",
    text: () => `Platforma yalnız işləməsi üçün zəruri olan kukilərdən istifadə edir. Əsas kuki giriş sessiyasını (“mh_session”) saxlayır: o, hesabınıza girişi tanımaq və təhlükəsizlik üçün lazımdır və brauzerdən JavaScript vasitəsilə oxuna bilməyən (HttpOnly) formada saxlanılır.

Reklam və ya üçüncü tərəf izləmə kukiləri istifadə olunmur. Brauzerinizdə kukiləri bloklasanız, Platformaya giriş işləməyəcək.

Bəzi sadə seçimlərinizi (məsələn, sınaqda audionun neçə dəfə dinlənildiyini) cihazınızın yerli yaddaşında (localStorage) saxlaya bilərik. Bu məlumat serverə göndərilmir və brauzerin tənzimləmələrindən silinə bilər.`,
  },
  {
    id: "ucuncu",
    title: "8. Məlumatların üçüncü şəxslərə ötürülməsi",
    text: () => `Məlumatlarınız satılmır. Platformanın işləməsi üçün aşağıdakı texniki xidmət təchizatçılarından istifadə olunur. Onlar məlumatları yalnız bizim adımızdan və xidmətin göstərilməsi məqsədilə işləyirlər:

- **Hostinq və yerləşdirmə:** Platformanın serverlərdə işləməsi;
- **Verilənlər bazası xidməti:** hesab, təhsil və nəticə məlumatlarının saxlanması;
- **Fayl saxlama xidməti:** yüklənmiş şəkil, sənəd və audio faylların saxlanması;
- **E-poçt göndərmə xidməti:** təsdiq, şifrə bərpası və bildiriş məktublarının çatdırılması;
- **Canlı dərs platformaları (Zoom, Google Meet və s.):** müəllimin seçdiyi xarici platforma ilə canlı dərsə qoşulduqda həmin platformanın öz məxfilik qaydaları tətbiq olunur.

Platformanın veb-developeri ${DEVELOPER} sistemi saxlamaq, xətaları aradan qaldırmaq və təhlükəsizliyi təmin etmək üçün zəruri həddə texniki girişə malik ola bilər. O, bu məlumatları öz məqsədləri üçün istifadə etməməyi və məxfiliyi qorumağı öhdəsinə götürür.

Məlumatlar yalnız qanunvericiliyə əsasən səlahiyyətli dövlət orqanlarının əsaslandırılmış sorğusu olduqda və ya hüquqlarımızı müdafiə etmək zərurəti yarandıqda açıqlana bilər.

Bəzi texniki təchizatçıların serverləri Azərbaycandan kənarda yerləşə bilər. Bu halda məlumatların qorunması üçün təchizatçılarla müvafiq tədbirlər görülür.`,
  },
  {
    id: "saxlanma",
    title: "9. Məlumatların saxlanma müddəti",
    text: () => `Hesab məlumatları hesabınız aktiv olduğu müddətdə saxlanılır. Hesabın silinməsini tələb etdikdə, qanunvericiliklə saxlanması tələb olunan məlumatlar istisna olmaqla, fərdi məlumatlar əsaslı müddətdə silinir və ya anonim hala salınır.

Əlaqə formasından daxil olan müraciətlər cavablandırıldıqdan sonra əsaslı müddət ərzində saxlanılır. Təhlükəsizlik jurnalları məhdud müddət saxlanılır.

Silinən məlumatların bir hissəsi təhlükəsizlik üçün ehtiyat nüsxələrdə məhdud müddət qala bilər, sonra isə avtomatik silinir.`,
  },
  {
    id: "tehlukesizlik",
    title: "10. Məlumatların təhlükəsizliyi",
    text: () => `Məlumatlarınızı icazəsiz giriş, itirilmə, dəyişdirilmə və açıqlanmadan qorumaq üçün təşkilati və texniki tədbirlər görülür:

- parollar yalnız şifrələnmiş (hash) formada saxlanılır, açıq mətn kimi saxlanılmır;
- Platformaya giriş şifrələnmiş (HTTPS) bağlantı ilə həyata keçirilir;
- istifadəçilərin giriş hüquqları rola görə məhdudlaşdırılır: şagird yalnız öz nəticələrinə, müəllim yalnız öz materiallarına baxa bilər;
- sınaq cavabları və qiymətləndirmə yalnız serverdə yoxlanılır və düzgün cavablar sınaq zamanı brauzerə göndərilmir;
- yüklənən fayllar növünə görə yoxlanılır, təhlükəli fayl formatları qəbul edilmir;
- giriş cəhdləri məhdudlaşdırılır və təhlükəsizlik əməliyyatları qeydə alınır.

Heç bir elektron sistem tam təhlükəsiz ola bilməz. Hesabınızın təhlükəsizliyi üçün parolunuzu gizli saxlayın, başqası ilə bölüşməyin və şübhəli hallarda dərhal bizə bildirin.`,
  },
  {
    id: "huquqlar",
    title: "11. Sizin hüquqlarınız",
    text: ({ email }) => `Qanunvericiliyə uyğun olaraq, fərdi məlumat subyekti kimi aşağıdakı hüquqlara malikdiniz:

- haqqınızda hansı məlumatların işləndiyini bilmək və onların surətini almaq;
- yanlış və ya natamam məlumatların düzəldilməsini tələb etmək;
- məlumatların silinməsini və ya bloklanmasını tələb etmək (qanunvericiliklə saxlanılması tələb olunan hallar istisna olmaqla);
- verdiyiniz razılığı geri götürmək;
- məlumatların işlənməsinə etiraz etmək;
- hüquqlarınızın pozulduğunu düşünürsünüzsə, müvafiq dövlət orqanlarına və ya məhkəməyə müraciət etmək.

Bu hüquqlardan istifadə üçün ${email} ünvanına yazın. Şəxsiyyətinizi yoxlamaq üçün əlavə məlumat istəyə bilərik. Müraciətlərə qanunvericilikdə nəzərdə tutulmuş müddətdə cavab veriləcək.

Profil məlumatlarınızı, reytinqdə iştirakı və təxəllüsü Platformadakı hesab bölməsindən də dəyişə bilərsiniz.`,
  },
  {
    id: "istifadeci",
    title: "12. İstifadəçilərin öhdəlikləri",
    text: () => `İstifadəçi Platformada yalnız düzgün məlumat verməli, başqasının adından hesab açmamalı, başqasının məlumatlarını icazəsiz toplamamalı, yaymamalı və ya Platformanın təhlükəsizliyini pozmağa çalışmamalıdır.

Müəllimlər yüklədikləri materiallarda şagirdlərin və üçüncü şəxslərin fərdi məlumatlarını (ad, telefon, şəkil və s.) onların razılığı olmadan yerləşdirməməlidir. Müəllim və idarə işçiləri şagirdlərin nəticələrinə və digər məlumatlarına yalnız vəzifə öhdəlikləri çərçivəsində baxa bilər və bu məlumatları üçüncü şəxslərə vermək qadağandır.

Tədris materialları, suallar və dizayn üzərində müəllif hüquqları Platformaya və müvafiq müəlliflərə məxsusdur və icazəsiz kopyalana bilməz.`,
  },
  {
    id: "xarici",
    title: "13. Xarici saytlara keçidlər",
    text: () => `Platformada üçüncü tərəf saytlarına və xidmətlərinə (məsələn, canlı dərs platformaları, sosial şəbəkələr) keçidlər ola bilər. Bu xarici resursların məxfilik qaydalarına və məzmununa Operator cavabdeh deyil. Onlardan istifadə etməzdən əvvəl müvafiq qaydalarla tanış olmağınız tövsiyə olunur.`,
  },
  {
    id: "deyisiklik",
    title: "14. Siyasətdə dəyişikliklər",
    text: () => `Operator bu Siyasəti qanunvericilikdəki və ya Platformadakı dəyişikliklərə uyğun olaraq yeniləyə bilər. Yeni redaksiya bu səhifədə dərc olunduğu andan qüvvəyə minir. Əhəmiyyətli dəyişikliklər barədə istifadəçilərə e-poçt və ya Platforma vasitəsilə xəbər verilə bilər. Platformadan istifadəni davam etdirməklə yenilənmiş Siyasətlə razılaşmış sayılırsınız.`,
  },
  {
    id: "elaqe",
    title: "15. Əlaqə",
    text: ({ email }) => `Bu Siyasətlə bağlı sualları, fərdi məlumatlarınızla bağlı sorğuları və şikayətləri ${email} ünvanına və ya Platformanın “Əlaqə” səhifəsi vasitəsilə göndərə bilərsiniz.

Platformanın veb-developeri: ${DEVELOPER}.`,
  },
];

export default async function PrivacyPage() {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, "contact")).limit(1);
  const contact = (row?.value ?? {}) as Contact;
  const email = contact.email?.trim() || "saytdakı “Əlaqə” səhifəsi";
  return (
    <>
      <PageHeader eyebrow="Hüquqi məlumat" title="Məxfilik siyasəti" intro="Məlumatlarınızın necə toplandığını, qorunduğunu və hansı hüquqlarınız olduğunu aydın şəkildə izah edirik." />
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 text-sm text-muted">Son yenilənmə: {UPDATED}</p>
          <nav aria-label="Məzmun" className="mb-10 rounded-2xl border border-border bg-surface p-5">
            <p className="mb-2 text-sm font-bold">Məzmun</p>
            <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-muted hover:text-text hover:underline">{s.title}</a></li>
              ))}
            </ol>
          </nav>
          <div className="space-y-9">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
                <h2 id={`${s.id}-h`} className="mb-3 font-sans text-xl font-bold">{s.title}</h2>
                <Prose text={s.text({ email })} className="leading-relaxed text-text/90" />
              </section>
            ))}
          </div>
          <p className="mt-12 border-t border-border pt-6 text-sm text-muted">Veb-sayt və texniki infrastruktur: {DEVELOPER}.</p>
        </div>
      </Container>
    </>
  );
}
