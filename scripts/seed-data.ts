/**
 * Development/demo content for MH Academy. Everything seeded from here is flagged as demo
 * (users.is_demo, testimonials.is_placeholder) and is never created in production unless forced.
 */

export type Diff = "easy" | "medium" | "hard";

export interface SeedQuestion {
  subject: string; // subject slug
  topic: string; // topic slug
  diff: Diff;
  text: string;
  /** [text, whyWrong?] — the first entry is always the correct option. Order is shuffled at attempt time. */
  correct: string;
  wrong: [string, string][];
  explanation: string;
  steps?: string[];
  concept: string;
  points?: number;
}

export const SUBJECTS = [
  { slug: "riyaziyyat", name: "Riyaziyyat", accent: "#C9A24B", description: "Cəbr, həndəsə, funksiyalar və triqonometriya — buraxılış və qəbul imtahanlarına hazırlıq.", featured: true },
  { slug: "fizika", name: "Fizika", accent: "#5B8DEF", description: "Mexanika, elektrik və istilik hadisələri: düsturlar, məsələ həlli və təcrübə.", featured: true },
  { slug: "kimya", name: "Kimya", accent: "#3FB68B", description: "Atomun quruluşu, maddələr və məhlullar, kimyəvi reaksiyaların əsasları.", featured: true },
  { slug: "azerbaycan-dili", name: "Azərbaycan dili", accent: "#E0705A", description: "Fonetika, leksika və qrammatika: qaydalar və praktik tapşırıqlar.", featured: true },
  { slug: "ingilis-dili", name: "İngilis dili", accent: "#9A7BE0", description: "Grammar və vocabulary: imtahan formatında məşqlər.", featured: true },
] as const;

export const TOPICS: { subject: string; slug: string; name: string }[] = [
  { subject: "riyaziyyat", slug: "tenlikler", name: "Tənliklər" },
  { subject: "riyaziyyat", slug: "funksiyalar", name: "Funksiyalar" },
  { subject: "riyaziyyat", slug: "hendese", name: "Həndəsə" },
  { subject: "riyaziyyat", slug: "faiz-nisbet", name: "Faiz və nisbət" },
  { subject: "riyaziyyat", slug: "ardicilliqlar", name: "Ardıcıllıqlar" },
  { subject: "riyaziyyat", slug: "triqonometriya", name: "Triqonometriya" },
  { subject: "riyaziyyat", slug: "quvvetler", name: "Qüvvətlər" },
  { subject: "fizika", slug: "mexanika", name: "Mexanika" },
  { subject: "fizika", slug: "elektrik", name: "Elektrik" },
  { subject: "fizika", slug: "istilik", name: "İstilik hadisələri" },
  { subject: "kimya", slug: "atom", name: "Atomun quruluşu" },
  { subject: "kimya", slug: "maddeler", name: "Maddələr və məhlullar" },
  { subject: "azerbaycan-dili", slug: "fonetika", name: "Fonetika" },
  { subject: "azerbaycan-dili", slug: "nitq-hisseleri", name: "Nitq hissələri" },
  { subject: "azerbaycan-dili", slug: "leksika", name: "Leksika" },
  { subject: "ingilis-dili", slug: "grammar", name: "Grammar" },
  { subject: "ingilis-dili", slug: "vocabulary", name: "Vocabulary" },
];

export const TEACHERS = [
  {
    slug: "leyla-quliyeva",
    name: "Leyla Quliyeva",
    email: "leyla@demo.mhacademy.local",
    subjects: ["riyaziyyat"],
    headline: "Riyaziyyat müəllimi",
    bio: "Mürəkkəb mövzuları sadə addımlara bölərək izah edir. Dərslərində hər yeni qaydadan sonra imtahan formatında məşq verilir.",
    qualifications: "Riyaziyyat üzrə ali təhsil. İmtahana hazırlıq kurslarında dərs demə təcrübəsi.",
    years: 12,
    featured: true,
    permissions: ["lessons.manage", "questions.manage", "exams.manage", "exams.assign", "announcements.publish"],
  },
  {
    slug: "resad-memmedov",
    name: "Rəşad Məmmədov",
    email: "resad@demo.mhacademy.local",
    subjects: ["fizika", "riyaziyyat"],
    headline: "Fizika müəllimi",
    bio: "Fiziki hadisələri gündəlik həyat nümunələri ilə əlaqələndirir və məsələ həllində düzgün düşüncə ardıcıllığını öyrədir.",
    qualifications: "Fizika üzrə ali təhsil. Olimpiada hazırlığı təcrübəsi.",
    years: 9,
    featured: true,
    permissions: ["lessons.manage", "questions.manage", "exams.manage"],
  },
  {
    slug: "nigar-eliyeva",
    name: "Nigar Əliyeva",
    email: "nigar@demo.mhacademy.local",
    subjects: ["kimya"],
    headline: "Kimya müəllimi",
    bio: "Düsturları əzbərləmək əvəzinə səbəb-nəticə əlaqəsini başa düşməyə əsaslanan yanaşma tətbiq edir.",
    qualifications: "Kimya üzrə ali təhsil. Test metodikası üzrə təcrübə.",
    years: 8,
    featured: true,
    permissions: ["lessons.manage", "questions.manage"],
  },
  {
    slug: "aysel-ceferova",
    name: "Aysel Cəfərova",
    email: "aysel@demo.mhacademy.local",
    subjects: ["ingilis-dili", "azerbaycan-dili"],
    headline: "Dil fənləri müəllimi",
    bio: "Qrammatika qaydalarını real nümunələr və qısa məşqlərlə möhkəmləndirir.",
    qualifications: "Filologiya üzrə ali təhsil. Dil kurslarında dərs demə təcrübəsi.",
    years: 10,
    featured: true,
    permissions: ["lessons.manage", "questions.manage", "exams.manage"],
  },
];

export interface SeedLesson {
  topic: string;
  teacher: string;
  title: string;
  slug: string;
  minutes: number;
  description: string;
  notes: string;
  featured?: boolean;
}

export const LESSONS: SeedLesson[] = [
  {
    topic: "tenlikler", teacher: "leyla-quliyeva", slug: "xetti-tenlikler", minutes: 14, featured: true,
    title: "Xətti tənliklər: addım-addım həll",
    description: "ax + b = c şəklində tənliklərin həlli və yoxlama qaydası.",
    notes: "**Əsas qayda:** tənliyin hər iki tərəfinə eyni əməliyyat tətbiq edilir.\n\n1. Sərbəst həddi (məchulsuz ədədi) o biri tərəfə keçirin — işarəsi dəyişir.\n2. Məchulun əmsalına bölün.\n3. Nəticəni tənlikdə yoxlayın.\n\n**Nümunə:** 2x + 7 = 19 → 2x = 12 → x = 6. Yoxlama: 2·6 + 7 = 19 ✓\n\n**Tez-tez edilən səhv:** ədədi tərəf dəyişəndə işarəni dəyişməmək.",
  },
  {
    topic: "tenlikler", teacher: "leyla-quliyeva", slug: "kvadrat-tenlik-vyet", minutes: 18, featured: true,
    title: "Kvadrat tənlik və Vyet teoremi",
    description: "Diskriminant, köklərin tapılması və Vyet teoremi ilə sürətli həll.",
    notes: "ax² + bx + c = 0 tənliyi üçün D = b² − 4ac.\n\n- D > 0 olduqda iki fərqli kök var.\n- D = 0 olduqda bir kök var.\n- D < 0 olduqda həqiqi kök yoxdur.\n\n**Vyet teoremi:** x₁ + x₂ = −b/a, x₁·x₂ = c/a.\n\n**Nümunə:** x² − 5x + 6 = 0 → cəm = 5, hasil = 6 → köklər 2 və 3.\n\n**Modullu tənlik:** |x − a| = k (k > 0) iki halı verir: x − a = k və x − a = −k. Hər iki kökü tapmağı unutmayın.",
  },
  {
    topic: "funksiyalar", teacher: "leyla-quliyeva", slug: "funksiya-anlayisi", minutes: 12,
    title: "Funksiya anlayışı və qiymətin hesablanması",
    description: "f(x) yazılışı, arqumentin yerinə qoyulması və sadə nümunələr.",
    notes: "f(x) = 3x − 2 funksiyasında x-in yerinə ədəd qoyulur.\n\nf(4) = 3·4 − 2 = 10.\n\n**Addımlar:** əvvəlcə vurma, sonra toplama/çıxma. Mötərizəsiz yazılışda əməliyyatların ardıcıllığına riayət edin.",
  },
  {
    topic: "hendese", teacher: "leyla-quliyeva", slug: "pifaqor-ucbucaq", minutes: 16, featured: true,
    title: "Pifaqor teoremi, üçbucaq və dairə",
    description: "Düzbucaqlı üçbucaq, bucaqlar cəmi və dairənin sahəsi.",
    notes: "**Pifaqor teoremi:** a² + b² = c² (c — hipotenuz).\n\nKatetlər 6 və 8 olduqda: 36 + 64 = 100, c = 10.\n\n**Üçbucağın bucaqları cəmi** 180°-dir.\n\n**Dairə:** çevrə uzunluğu C = 2πr, sahə S = πr². Radius 5 olduqda S = 25π.",
  },
  {
    topic: "faiz-nisbet", teacher: "leyla-quliyeva", slug: "faiz-meseleleri", minutes: 11,
    title: "Faiz və nisbət məsələləri",
    description: "Faizin tapılması və düz mütənasiblik məsələləri.",
    notes: "**Ədədin faizi:** ədəd × faiz / 100. 80-in 25%-i = 80 × 0,25 = 20.\n\n**Düz mütənasiblik:** əvvəlcə 1 vahidin qiymətini tapın, sonra lazım olan miqdara vurun. 3 kq — 4,5 manat → 1 kq — 1,5 manat → 5 kq — 7,5 manat.",
  },
  {
    topic: "ardicilliqlar", teacher: "leyla-quliyeva", slug: "ededi-silsile", minutes: 13,
    title: "Ədədi silsilə",
    description: "Fərq, n-ci həddin düsturu və tipik məsələlər.",
    notes: "Ədədi silsilədə hər hədd əvvəlkinə eyni d ədədini əlavə etməklə alınır.\n\n**n-ci hədd:** aₙ = a₁ + (n − 1)·d.\n\n**Nümunə:** 3, 7, 11, … → d = 4, a₁₀ = 3 + 9·4 = 39.\n\n**Diqqət:** (n − 1) vurulur, n yox.",
  },
  {
    topic: "triqonometriya", teacher: "leyla-quliyeva", slug: "sin-cos-esaslar", minutes: 15,
    title: "Sinus və kosinus: əsas qiymətlər",
    description: "30°, 45°, 60° və 90° bucaqları üçün sin və cos qiymətləri.",
    notes: "| Bucaq | sin | cos |\n|---|---|---|\n| 30° | 1/2 | √3/2 |\n| 45° | √2/2 | √2/2 |\n| 60° | √3/2 | 1/2 |\n| 90° | 1 | 0 |\n\nƏzbərləmək üçün: sin artır (½, √2/2, √3/2, 1), cos azalır.",
  },
  {
    topic: "quvvetler", teacher: "leyla-quliyeva", slug: "quvvetler-qaydalari", minutes: 10,
    title: "Qüvvətlər və qüvvət qaydaları",
    description: "Eyni əsaslı qüvvətlərin vurulması, bölünməsi və qüvvətə yüksəldilməsi.",
    notes: "- aᵐ · aⁿ = aᵐ⁺ⁿ\n- aᵐ : aⁿ = aᵐ⁻ⁿ\n- (aᵐ)ⁿ = aᵐⁿ\n\n**Nümunə:** 2⁵ : 2² = 2³ = 8.",
  },
  {
    topic: "mexanika", teacher: "resad-memmedov", slug: "mexanika-esaslari", minutes: 20, featured: true,
    title: "Mexanika: sürət, təcil, qüvvət və enerji",
    description: "v = s/t, F = ma, Eₖ = mv²/2 düsturları və məsələ nümunələri.",
    notes: "**Sürət:** v = s / t. 120 km məsafə 2 saata → 60 km/saat.\n\n**Nyutonun II qanunu:** F = m·a. m = 5 kq, a = 2 m/s² → F = 10 N.\n\n**Kinetik enerji:** Eₖ = m·v² / 2. m = 2 kq, v = 3 m/s → Eₖ = 9 J.\n\n**Sərbəst düşmə təcili:** g ≈ 9,8 m/s² (məsələlərdə çox vaxt 10 qəbul edilir, şərtə baxın).",
  },
  {
    topic: "elektrik", teacher: "resad-memmedov", slug: "om-qanunu", minutes: 12,
    title: "Om qanunu",
    description: "Cərəyan şiddəti, gərginlik və müqavimət arasındakı əlaqə.",
    notes: "I = U / R. U = 12 V, R = 4 Ω → I = 3 A.\n\nGərginlik artdıqca cərəyan artır, müqavimət artdıqca cərəyan azalır.",
  },
  {
    topic: "istilik", teacher: "resad-memmedov", slug: "istilik-hadiseleri", minutes: 10,
    title: "İstilik hadisələri: donma və qaynama",
    description: "Maddənin aqreqat halları və faza keçidləri.",
    notes: "Normal atmosfer təzyiqində su 0 °C-də donur və 100 °C-də qaynayır.\n\n4 °C — suyun sıxlığının ən böyük olduğu temperaturdur; donma temperaturu deyil.",
  },
  {
    topic: "atom", teacher: "nigar-eliyeva", slug: "atomun-qurulusu", minutes: 14, featured: true,
    title: "Atomun quruluşu",
    description: "Proton, neytron, elektron və sıra nömrəsi.",
    notes: "Neytral atomda elektronların sayı protonların sayına, yəni elementin sıra nömrəsinə bərabərdir.\n\nNatrium (Z = 11): 11 proton, 11 elektron.",
  },
  {
    topic: "maddeler", teacher: "nigar-eliyeva", slug: "maddeler-mehlullar", minutes: 15,
    title: "Maddələr, qarışıqlar və pH",
    description: "Saf maddələr, hava tərkibi, turşu-əsas mühiti.",
    notes: "Suyun formulu H₂O-dur. Hidrogen peroksid H₂O₂ tamamilə fərqli maddədir.\n\nHavanın təxminən 78%-i azotdur, 21%-i oksigendir.\n\n**pH:** 7-dən kiçik — turşu mühit, 7 — neytral, 7-dən böyük — qələvi mühit.",
  },
  {
    topic: "fonetika", teacher: "aysel-ceferova", slug: "saitler-samitler", minutes: 9,
    title: "Saitlər və samitlər",
    description: "Azərbaycan əlifbasında səslərin bölgüsü.",
    notes: "Azərbaycan əlifbası 32 hərfdən ibarətdir: 9 sait (a, e, ə, ı, i, o, ö, u, ü) və 23 samit.",
  },
  {
    topic: "nitq-hisseleri", teacher: "aysel-ceferova", slug: "nitq-hisseleri-esaslar", minutes: 12,
    title: "Nitq hissələri: isim, sifət, fel, zərf",
    description: "Hər nitq hissəsinin sualı və əsas əlamətləri.",
    notes: "- **İsim:** kim? nə? (kitab, şagird)\n- **Sifət:** necə? hansı? (gözəl, böyük)\n- **Fel:** nə edir? (oxuyur)\n- **Zərf:** necə? nə vaxt? hara? (sürətlə, dünən)\n\n\"Sürətlə qaçdı\" cümləsində \"sürətlə\" hərəkətin tərzini bildirir — zərfdir.",
  },
  {
    topic: "leksika", teacher: "aysel-ceferova", slug: "antonim-sinonim", minutes: 8,
    title: "Antonim və sinonim",
    description: "Əks mənalı və yaxın mənalı sözlər.",
    notes: "**Antonim** — əks mənalı sözlər: böyük — kiçik. **Sinonim** — yaxın mənalı sözlər: böyük — iri.\n\nSual \"əks mənalı\" deyirsə, sinonim variantlarına aldanmayın.",
  },
  {
    topic: "grammar", teacher: "aysel-ceferova", slug: "english-tenses-basics", minutes: 16, featured: true,
    title: "English Grammar: Present Simple, Present Perfect, Past Simple",
    description: "Üç əsas zamanın istifadə qaydaları və tipik səhvlər.",
    notes: "- **Present Simple:** habits and facts. She **goes** to school every day (3rd person: -s / -es).\n- **Present Perfect + since/for:** I have lived here **since** 2015 (a point in time) / **for** ten years (a period).\n- **Past Simple:** irregular verbs — buy → **bought**, go → went.",
  },
  {
    topic: "vocabulary", teacher: "aysel-ceferova", slug: "english-vocabulary-synonyms", minutes: 8,
    title: "English Vocabulary: synonyms and antonyms",
    description: "Sinonim və antonim cütləri ilə söz ehtiyatının artırılması.",
    notes: "big ≈ large ≈ huge; small ≈ little ≈ tiny.\n\nAntonym of big: small.",
  },
];

export const QUESTIONS: SeedQuestion[] = [
  // ---------------------------------------------------------------- Riyaziyyat
  {
    subject: "riyaziyyat", topic: "tenlikler", diff: "easy", concept: "Xətti tənliyin həlli",
    text: "2x + 7 = 19 tənliyinin kökü hansıdır?",
    correct: "6",
    wrong: [
      ["5", "19 − 7 = 12 alınır və 12-ni 2-yə böləndə 6 çıxır. 5 almaq üçün başqa ədəd çıxılmalı idi."],
      ["7", "7 sərbəst haddir, məchulun qiyməti deyil. Onu x ilə qarışdırmısınız."],
      ["12", "12 yalnız 2x ifadəsinin qiymətidir (19 − 7). Hələ 2-yə bölmək lazımdır."],
    ],
    explanation: "Sərbəst həddi o biri tərəfə keçirib məchulun əmsalına bölürük.",
    steps: ["2x + 7 = 19", "2x = 19 − 7 = 12", "x = 12 : 2 = 6", "Yoxlama: 2·6 + 7 = 19 ✓"],
  },
  {
    subject: "riyaziyyat", topic: "tenlikler", diff: "medium", concept: "Vyet teoremi",
    text: "x² − 5x + 6 = 0 tənliyinin köklərinin cəmi neçədir?",
    correct: "5",
    wrong: [
      ["−5", "Vyet teoreminə görə köklərin cəmi −b/a-dır. Burada b = −5 olduğundan −b/a = +5. İşarəni səhv götürmüsünüz."],
      ["6", "6 köklərin hasilidir (c/a), cəmi deyil."],
      ["−6", "Nə cəm, nə də hasil −6 deyil. Hasil +6, cəm isə +5-dir."],
    ],
    explanation: "Vyet teoremi: x₁ + x₂ = −b/a, x₁·x₂ = c/a. Köklər 2 və 3-dür, cəmləri 5.",
    steps: ["a = 1, b = −5, c = 6", "x₁ + x₂ = −b/a = 5", "Yoxlama: 2 + 3 = 5 ✓"],
  },
  {
    subject: "riyaziyyat", topic: "tenlikler", diff: "hard", concept: "Modullu tənlik",
    text: "|x − 2| = 3 tənliyinin köklərinin cəmi neçədir?",
    correct: "4",
    wrong: [
      ["5", "Yalnız x = 5 kökünü tapıb dayanmısınız. x − 2 = −3 halı da var və o, x = −1 verir."],
      ["−1", "−1 ikinci köklərdən biridir, cəm isə iki kökün toplanmasıdır."],
      ["2", "2 modulun içindəki sabitdir, kökə aid deyil."],
    ],
    explanation: "Modul həm +3, həm −3 ola bilər, ona görə iki hal araşdırılır.",
    steps: ["x − 2 = 3 → x = 5", "x − 2 = −3 → x = −1", "Cəm: 5 + (−1) = 4"],
  },
  {
    subject: "riyaziyyat", topic: "funksiyalar", diff: "easy", concept: "Funksiyanın qiyməti",
    text: "f(x) = 3x − 2 olarsa, f(4) neçədir?",
    correct: "10",
    wrong: [
      ["8", "4·2 = 8 hesablamısınız; f(x) düsturunu tətbiq etməmisiniz. Düstur 3 ilə vurmağı tələb edir."],
      ["12", "3·4 = 12 doğrudur, amma sonra 2-ni çıxmağı unutmusunuz."],
      ["14", "−2 əvəzinə +2 etmisiniz: 12 + 2 = 14."],
    ],
    explanation: "x-in yerinə 4 yazırıq və əməliyyatları ardıcıllıqla yerinə yetiririk.",
    steps: ["f(4) = 3·4 − 2", "= 12 − 2", "= 10"],
  },
  {
    subject: "riyaziyyat", topic: "hendese", diff: "easy", concept: "Pifaqor teoremi",
    text: "Katetləri 6 və 8 olan düzbucaqlı üçbucağın hipotenuzu neçədir?",
    correct: "10",
    wrong: [
      ["9", "Hipotenuz katetin kvadratlar cəminin kökünə bərabərdir: 6² + 8² = 100. 9 olsaydı, 81 alınardı."],
      ["12", "Pifaqor teoremi ədədi orta və ya cəm vermir, kvadratlar cəminin kökünü verir."],
      ["14", "6 + 8 = 14 — katetlərin cəmini götürmüsünüz. Düstur a² + b² = c²-dir."],
    ],
    explanation: "Hipotenuz c = √(a² + b²).",
    steps: ["c² = 6² + 8² = 36 + 64 = 100", "c = √100 = 10"],
  },
  {
    subject: "riyaziyyat", topic: "hendese", diff: "medium", concept: "Dairənin sahəsi",
    text: "Radiusu 5 olan dairənin sahəsi neçədir?",
    correct: "25π",
    wrong: [
      ["10π", "10π çevrənin uzunluğudur (2πr). Sahə üçün r² lazımdır."],
      ["5π", "r əvəzinə r² götürmək lazımdır: πr² = π·25."],
      ["50π", "2πr² səhv düsturdur; sahə πr²-dir."],
    ],
    explanation: "Dairənin sahəsi S = πr².",
    steps: ["S = π·r²", "S = π·5² = 25π"],
  },
  {
    subject: "riyaziyyat", topic: "hendese", diff: "easy", concept: "Üçbucağın bucaqlar cəmi",
    text: "Üçbucağın iki bucağı 50° və 60°-dir. Üçüncü bucaq neçə dərəcədir?",
    correct: "70°",
    wrong: [
      ["60°", "50 + 60 + 60 = 170 ≠ 180. Bucaqlar cəmi 180° olmalıdır."],
      ["80°", "50 + 60 + 80 = 190 — çox olur."],
      ["90°", "50 + 60 + 90 = 200 — çox olur."],
    ],
    explanation: "Üçbucağın daxili bucaqlarının cəmi həmişə 180°-dir.",
    steps: ["50° + 60° = 110°", "180° − 110° = 70°"],
  },
  {
    subject: "riyaziyyat", topic: "faiz-nisbet", diff: "easy", concept: "Ədədin faizi",
    text: "80 manatın 25%-i neçə manatdır?",
    correct: "20",
    wrong: [
      ["15", "80 × 0,25 = 20. 15 almaq üçün 80-in 18,75%-ni götürmək lazım idi."],
      ["25", "25 faiz dərəcəsidir, nəticə deyil. Onu ədədə vurmaq lazımdır."],
      ["30", "30 manat 80-in 37,5%-ə bərabərdir."],
    ],
    explanation: "Faizi ədədə çevirib vururuq: 25% = 0,25.",
    steps: ["25% = 25/100 = 0,25", "80 × 0,25 = 20"],
  },
  {
    subject: "riyaziyyat", topic: "faiz-nisbet", diff: "medium", concept: "Düz mütənasiblik",
    text: "3 kq almanın qiyməti 4,5 manatdır. 5 kq alma neçə manat edər?",
    correct: "7,5",
    wrong: [
      ["7", "1 kq-ın qiyməti 1,5 manatdır; 5·1,5 = 7,5. 7 almaq üçün kq-ın qiyməti 1,4 olmalı idi."],
      ["8", "5·1,6 = 8 — 1 kq-ın qiymətini 1,6 hesab etmisiniz."],
      ["9", "9 manat 6 kq-ın qiymətidir (6·1,5), 5 kq-ın yox."],
    ],
    explanation: "Əvvəlcə 1 kq-ın qiyməti tapılır.",
    steps: ["4,5 : 3 = 1,5 manat (1 kq)", "1,5 × 5 = 7,5 manat"],
  },
  {
    subject: "riyaziyyat", topic: "ardicilliqlar", diff: "medium", concept: "Ədədi silsilənin n-ci həddi",
    text: "3, 7, 11, … ədədi silsiləsinin 10-cu həddi neçədir?",
    correct: "39",
    wrong: [
      ["43", "n−1 əvəzinə n vurmusunuz — bu, 11-ci həddir (3 + 10·4)."],
      ["40", "Fərqi 10-a vurub (4·10) ilk həddi nəzərə almamısınız."],
      ["35", "Yalnız 8 addım atmısınız: 3 + 8·4 = 35. 10-cu hədd üçün 9 addım lazımdır."],
    ],
    explanation: "aₙ = a₁ + (n − 1)·d düsturundan istifadə olunur.",
    steps: ["a₁ = 3, d = 7 − 3 = 4", "a₁₀ = 3 + 9·4", "a₁₀ = 39"],
  },
  {
    subject: "riyaziyyat", topic: "triqonometriya", diff: "easy", concept: "Əsas bucaqların sinusu",
    text: "sin 30° neçəyə bərabərdir?",
    correct: "1/2",
    wrong: [
      ["√3/2", "√3/2 sin 60°-nin qiymətidir."],
      ["√2/2", "√2/2 sin 45°-nin qiymətidir."],
      ["1", "1 sin 90°-nin qiymətidir."],
    ],
    explanation: "sin 30° = 1/2. Cədvəldəki ardıcıllığı yadda saxlayın: sin 30°, 45°, 60°, 90° üçün 1/2, √2/2, √3/2, 1.",
  },
  {
    subject: "riyaziyyat", topic: "quvvetler", diff: "easy", concept: "Qüvvətlərin bölünməsi",
    text: "2⁵ : 2² ifadəsinin qiyməti neçədir?",
    correct: "8",
    wrong: [
      ["4", "Üstləri bölmək olmaz: eyni əsaslı qüvvətləri böləndə üstlər çıxılır (5 − 2 = 3)."],
      ["16", "Üstü 4 götürmüsünüz; düzgün üst 5 − 2 = 3-dür."],
      ["32", "32 = 2⁵ — məxrəci nəzərə almamısınız."],
    ],
    explanation: "aᵐ : aⁿ = aᵐ⁻ⁿ.",
    steps: ["2⁵ : 2² = 2⁵⁻²", "= 2³ = 8"],
  },
  // ---------------------------------------------------------------- Fizika
  {
    subject: "fizika", topic: "mexanika", diff: "easy", concept: "Sürət düsturu",
    text: "Avtomobil 120 km məsafəni 2 saata qət edib. Orta sürəti neçə km/saatdır?",
    correct: "60",
    wrong: [
      ["40", "120 : 3 = 40 hesablamısınız. Zaman 3 deyil, 2 saatdır."],
      ["80", "80 km/saat üçün 120 km məsafə 1,5 saata qət edilməli idi."],
      ["240", "120·2 = 240 — bölmək əvəzinə vurmusunuz. v = s / t."],
    ],
    explanation: "Sürət = məsafə / zaman.",
    steps: ["v = s / t", "v = 120 : 2 = 60 km/saat"],
  },
  {
    subject: "fizika", topic: "mexanika", diff: "easy", concept: "Nyutonun II qanunu",
    text: "Kütləsi 5 kq olan cisim 2 m/s² təcillə hərəkət edir. Ona təsir edən qüvvə neçə nyutondur?",
    correct: "10",
    wrong: [
      ["2,5", "5 : 2 = 2,5 — bölmüsünüz. F = m·a, yəni vurmaq lazımdır."],
      ["7", "5 + 2 = 7 — toplamısınız. Düstur vurmanı tələb edir."],
      ["25", "5² = 25 — kütləni kvadrata yüksəltmisiniz. F = m·a."],
    ],
    explanation: "Nyutonun ikinci qanunu: F = m·a.",
    steps: ["F = m·a", "F = 5 · 2 = 10 N"],
  },
  {
    subject: "fizika", topic: "elektrik", diff: "easy", concept: "Om qanunu",
    text: "Gərginlik 12 V, müqavimət 4 Ω olan dövrədə cərəyan şiddəti neçə amperdir?",
    correct: "3",
    wrong: [
      ["8", "12 − 4 = 8 çıxmısınız. Om qanunu I = U / R bölmədir."],
      ["16", "12 + 4 = 16 toplamısınız. Düzgün əməliyyat bölmədir."],
      ["48", "12·4 = 48 vurmusunuz; I = U/R."],
    ],
    explanation: "Om qanunu: I = U / R.",
    steps: ["I = U / R", "I = 12 : 4 = 3 A"],
  },
  {
    subject: "fizika", topic: "mexanika", diff: "medium", concept: "Sərbəst düşmə təcili",
    text: "Yer səthinə yaxın sərbəst düşmə təcilinin təxmini qiyməti neçədir?",
    correct: "9,8 m/s²",
    wrong: [
      ["1,6 m/s²", "1,6 m/s² Ayda sərbəst düşmə təcilidir."],
      ["6,7 m/s²", "Bu qiymət Yer üçün xarakterik deyil."],
      ["98 m/s²", "Onluq vergülü səhv yerləşdirilib: g ≈ 9,8, 98 deyil."],
    ],
    explanation: "Yerdə g ≈ 9,8 m/s² (məsələlərdə çox vaxt 10 m/s² götürülür).",
  },
  {
    subject: "fizika", topic: "istilik", diff: "easy", concept: "Suyun donma temperaturu",
    text: "Normal atmosfer təzyiqində təmiz su neçə °C-də donur?",
    correct: "0 °C",
    wrong: [
      ["−10 °C", "Təmiz su normal təzyiqdə 0 °C-də donur; −10 °C-yə qədər soyutmağa ehtiyac yoxdur."],
      ["4 °C", "4 °C suyun sıxlığının ən böyük olduğu temperaturdur, donma temperaturu deyil."],
      ["100 °C", "100 °C qaynama temperaturudur."],
    ],
    explanation: "Su 0 °C-də donur və 100 °C-də qaynayır.",
  },
  {
    subject: "fizika", topic: "mexanika", diff: "medium", concept: "Kinetik enerji",
    text: "Kütləsi 2 kq olan cisim 3 m/s sürətlə hərəkət edir. Kinetik enerjisi neçə coul (J)-dur?",
    correct: "9",
    wrong: [
      ["6", "m·v = 6 impulsdur, enerji deyil. Enerji üçün v kvadrata yüksəldilir."],
      ["12", "Düstur Eₖ = mv²/2-dir; 12 almaq üçün başqa əməliyyat aparılıb."],
      ["18", "m·v² = 18 hesablanıb, lakin 2-yə bölmək unudulub."],
    ],
    explanation: "Kinetik enerji Eₖ = m·v²/2.",
    steps: ["Eₖ = m·v² / 2", "Eₖ = 2 · 3² / 2", "Eₖ = 9 J"],
  },
  // ---------------------------------------------------------------- Kimya
  {
    subject: "kimya", topic: "maddeler", diff: "easy", concept: "Suyun kimyəvi formulu",
    text: "Suyun kimyəvi formulu hansıdır?",
    correct: "H₂O",
    wrong: [
      ["H₂O₂", "H₂O₂ hidrogen peroksiddir — fərqli maddədir."],
      ["CO₂", "CO₂ karbon qazıdır."],
      ["NaCl", "NaCl xörək duzudur."],
    ],
    explanation: "Su molekulu iki hidrogen və bir oksigen atomundan ibarətdir.",
  },
  {
    subject: "kimya", topic: "atom", diff: "medium", concept: "Elektronların sayı",
    text: "Sıra nömrəsi 11 olan natrium atomunda neytral halda neçə elektron var?",
    correct: "11",
    wrong: [
      ["1", "1 xarici qatdakı elektron sayıdır; ümumi elektron sayı sıra nömrəsinə bərabərdir."],
      ["12", "12 neytronların təxmini sayıdır, elektronların yox."],
      ["23", "23 kütlə ədədidir (proton + neytron)."],
    ],
    explanation: "Neytral atomda elektronların sayı protonların sayına, yəni sıra nömrəsinə bərabərdir.",
  },
  {
    subject: "kimya", topic: "maddeler", diff: "easy", concept: "Hava tərkibi",
    text: "Havanın həcmcə ən böyük hissəsini hansı qaz təşkil edir?",
    correct: "Azot",
    wrong: [
      ["Oksigen", "Oksigen təxminən 21%-dir; ən böyük hissə azotdur (≈78%)."],
      ["Karbon qazı", "Karbon qazı havada çox azdır (≈0,04%)."],
      ["Hidrogen", "Hidrogen havada praktik olaraq yoxdur."],
    ],
    explanation: "Havada təxminən 78% azot, 21% oksigen var.",
  },
  {
    subject: "kimya", topic: "maddeler", diff: "medium", concept: "pH və mühit",
    text: "pH = 3 olan məhlulun mühiti necədir?",
    correct: "Turşu",
    wrong: [
      ["Neytral", "Neytral mühitdə pH = 7-dir."],
      ["Qələvi", "Qələvi mühitdə pH 7-dən böyükdür."],
      ["Mühit təyin edilə bilməz", "pH məhz mühiti təyin etmək üçündür: 7-dən kiçik — turşu."],
    ],
    explanation: "pH < 7 turşu, pH = 7 neytral, pH > 7 qələvi mühiti göstərir.",
  },
  // ---------------------------------------------------------------- Azərbaycan dili
  {
    subject: "azerbaycan-dili", topic: "fonetika", diff: "easy", concept: "Saitlərin sayı",
    text: "Azərbaycan əlifbasında neçə sait var?",
    correct: "9",
    wrong: [
      ["7", "7 yanlışdır: a, e, ə, ı, i, o, ö, u, ü — cəmi 9 sait var."],
      ["23", "23 samitlərin sayıdır."],
      ["32", "32 əlifbadakı bütün hərflərin sayıdır."],
    ],
    explanation: "32 hərfin 9-u sait, 23-ü samitdir.",
  },
  {
    subject: "azerbaycan-dili", topic: "nitq-hisseleri", diff: "easy", concept: "İsim",
    text: "\"Kitab\" sözü hansı nitq hissəsidir?",
    correct: "İsim",
    wrong: [
      ["Sifət", "Sifət əşyanın əlamətini bildirir (necə? hansı?). \"Kitab\" isə kim? nə? sualına cavab verir."],
      ["Fel", "Fel hərəkət bildirir. \"Kitab\" əşya adıdır."],
      ["Zərf", "Zərf hərəkətin tərzini, zamanını, yerini bildirir."],
    ],
    explanation: "\"Nə?\" sualına cavab verən söz isimdir.",
  },
  {
    subject: "azerbaycan-dili", topic: "nitq-hisseleri", diff: "medium", concept: "Zərf",
    text: "\"Sürətlə qaçdı\" ifadəsində \"sürətlə\" sözü hansı nitq hissəsidir?",
    correct: "Zərf",
    wrong: [
      ["İsim", "\"Sürət\" isimdir, lakin \"sürətlə\" burada hərəkətin tərzini göstərir."],
      ["Sifət", "Sifət əşyanın əlamətini bildirir; burada hərəkətin əlaməti bildirilir."],
      ["Əvəzlik", "Əvəzlik isim, sifət və ya sayı əvəz edir; burada belə bir əvəzetmə yoxdur."],
    ],
    explanation: "Hərəkətin necə icra edildiyini bildirən söz zərfdir.",
  },
  {
    subject: "azerbaycan-dili", topic: "leksika", diff: "easy", concept: "Antonim",
    text: "\"Böyük\" sözünün antonimi hansıdır?",
    correct: "Kiçik",
    wrong: [
      ["İri", "\"İri\" \"böyük\"ün sinonimidir (yaxın mənalı)."],
      ["Nəhəng", "\"Nəhəng\" da böyüklüyü bildirir, əks mənalı deyil."],
      ["Ulu", "\"Ulu\" böyüklük/ucalıq bildirir, əks mənalı deyil."],
    ],
    explanation: "Antonim əks mənalı sözdür: böyük — kiçik.",
  },
  // ---------------------------------------------------------------- İngilis dili
  {
    subject: "ingilis-dili", topic: "grammar", diff: "easy", concept: "Present Simple, 3rd person",
    text: "Choose the correct form: She ___ to school every day.",
    correct: "goes",
    wrong: [
      ["go", "With he/she/it the Present Simple verb takes -s/-es: goes."],
      ["going", "\"Going\" needs an auxiliary (is going); here a simple habit is described."],
      ["gone", "\"Gone\" is the past participle and does not fit a daily habit."],
    ],
    explanation: "Daily habits use Present Simple; third person singular adds -es to \"go\".",
  },
  {
    subject: "ingilis-dili", topic: "grammar", diff: "medium", concept: "since / for",
    text: "I have lived here ___ 2015.",
    correct: "since",
    wrong: [
      ["for", "\"For\" is used with a period of time (for ten years), not a starting point."],
      ["during", "\"During\" is not used with Present Perfect and a year."],
      ["from", "\"From\" does not combine with Present Perfect here; use \"since\"."],
    ],
    explanation: "\"Since\" + a point in time (2015); \"for\" + a duration.",
  },
  {
    subject: "ingilis-dili", topic: "grammar", diff: "medium", concept: "Irregular past forms",
    text: "What is the Past Simple form of \"buy\"?",
    correct: "bought",
    wrong: [
      ["buyed", "\"Buy\" is irregular; it does not take -ed."],
      ["boughten", "\"Boughten\" is not a standard English form."],
      ["buying", "\"Buying\" is the -ing form, not the past."],
    ],
    explanation: "buy — bought — bought.",
  },
  {
    subject: "ingilis-dili", topic: "vocabulary", diff: "easy", concept: "Synonyms",
    text: "Choose the synonym of \"big\".",
    correct: "large",
    wrong: [
      ["tiny", "\"Tiny\" means very small — the opposite."],
      ["narrow", "\"Narrow\" refers to small width, not size in general."],
      ["short", "\"Short\" refers to length or height, and is not a synonym of \"big\"."],
    ],
    explanation: "\"Large\" and \"big\" have the same meaning.",
  },
];

export const FAQS = [
  { q: "MH Academy-də imtahan necə keçirilir?", a: "Sınağa başlayanda tam ekranlı imtahan səhifəsi açılır. Taymer serverdə hesablanır, cavablarınız avtomatik saxlanılır və vaxt bitəndə sınaq özü təhvil verilir." },
  { q: "Səhifəni yeniləsəm və ya internet kəsilsə, cavablarım itərmi?", a: "Xeyr. Hər cavab dəyişikliyi serverə yazılır. Səhifəni yenilədikdə eyni sınağı qaldığınız yerdən davam etdirirsiniz; deadline isə dəyişmir." },
  { q: "Nəticəni nə vaxt görürəm?", a: "Bu, sınağın tənzimləməsindən asılıdır: bəzi sınaqlar təhvil verən kimi, bəziləri isə bütün iştirakçıların vaxtı bitəndən sonra və ya müəllim dərc edəndə açılır." },
  { q: "Səhv cavablarımı necə təhlil edə bilərəm?", a: "Nəticə səhifəsində hər səhv və ya cavabsız sual üçün izah, mövzu, niyə seçdiyiniz cavabın səhv olduğu və əlaqəli video dərs göstərilir. \"Səhvlərim\" bölməsində isə bu sualları təkrar məşq edə bilərsiniz." },
  { q: "Neçə dəfə sınağa girə bilərəm?", a: "Hər sınağın cəhd limiti var və sınaq yaradılarkən təyin olunur. Hər cəhdin nəticəsi ayrıca saxlanılır, əvvəlki cəhdlərlə müqayisə edə bilərsiniz." },
  { q: "Şəxsi məlumatlarım necə qorunur?", a: "Şifrələr yalnız hash şəklində saxlanılır. Reytinqdə yalnız razılıq verdiyiniz halda və təxəllüslə görünürsünüz." },
];

export const TESTIMONIALS = [
  { name: "Nümunə tələbə", role: "Nümunə rəy", quote: "Səhv təhlili bölməsi sayəsində hansı mövzuları təkrar etməli olduğumu dəqiq bilirəm." },
  { name: "Nümunə valideyn", role: "Nümunə rəy", quote: "Övladımın hazırlıq irəliləyişini nəticələr cədvəlindən izləmək çox rahatdır." },
  { name: "Nümunə məzun", role: "Nümunə rəy", quote: "Real imtahan formatında sınaqlar mənə vaxtı düzgün bölməyi öyrətdi." },
];
