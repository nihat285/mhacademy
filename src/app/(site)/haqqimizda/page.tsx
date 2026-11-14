import { BarChart3, ClipboardCheck, Lightbulb, PlayCircle, Timer, Users } from "lucide-react";
import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Haqqımızda", description: "MH Academy — onlayn sınaqlar, ətraflı səhv təhlili və peşəkar müəllimlərin dərsləri bir platformada." };

const OFFER = [
  { icon: ClipboardCheck, title: "Onlayn sınaqlar", text: "Fənn, çətinlik və vaxta görə seçilən, real imtahan formatında vaxtlı sınaqlar." },
  { icon: PlayCircle, title: "Video dərslər", text: "Mövzu üzrə qısa və aydın dərslər. Səhv etdiyiniz mövzunun dərsi nəticədən birbaşa açılır." },
  { icon: Users, title: "Peşəkar müəllimlər", text: "Təcrübəli müəllim heyəti. Hər müəllimin fənləri, dərsləri və sınaqları ayrıca profildədir." },
  { icon: Lightbulb, title: "Səhv təhlili", text: "Hər səhv üçün izah, niyə yanlış olduğu və təkrar üçün dərs tövsiyəsi." },
  { icon: Timer, title: "Real imtahan mühiti", text: "Tam ekran interfeys, serverdə hesablanan taymer və avtomatik saxlanılan cavablar." },
  { icon: BarChart3, title: "Dərhal nəticə", text: "Bal, düzgün/səhv/cavabsız sayı və mövzular üzrə performans." },
];

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="MH Academy"
        title={
          <>
            Hazırlığınızı real imtahan mühitində <span className="text-gold-400">yoxlayın</span>, səhvlərinizdən öyrənin.
          </>
        }
        intro="Onlayn sınaqlar, ətraflı səhv təhlili və peşəkar müəllimlərin dərsləri bir platformada."
      />
      <Container className="max-w-5xl space-y-14">
        <section aria-labelledby="who">
          <h2 id="who" className="text-2xl font-semibold sm:text-3xl">Biz kimik?</h2>
          <p className="mt-3 max-w-3xl text-muted">
            MH Academy onlayn sınaqlar, video dərslər və səhv təhlili ilə şagirdlərin ölçülə bilən akademik irəliləyişini hədəfləyən təhsil platformasıdır.
          </p>
        </section>

        <section aria-labelledby="offer">
          <h2 id="offer" className="text-2xl font-semibold sm:text-3xl">Nə təklif edirik?</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFER.map((o) => (
              <li key={o.title} className="rounded-2xl border border-border bg-surface p-5">
                <o.icon className="text-accent" size={24} />
                <h3 className="mt-3 font-sans text-base font-bold">{o.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{o.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="approach">
          <h2 id="approach" className="text-2xl font-semibold sm:text-3xl">Yanaşmamız</h2>
          <p className="mt-3 max-w-3xl text-muted">
            Nəticə yalnız bal deyil — nəyi və niyə səhv etdiyinizi başa düşmək üçündür. Hər cəhddən sonra nəyi təkrar etməli olduğunuzu dəqiq bilirsiniz: nəyi bildiyinizi, harada boşluq olduğunu görür və növbəti addımı bilirsiniz.
          </p>
        </section>

        <section aria-labelledby="start" className="rounded-2xl bg-navy-900 p-8 text-white">
          <h2 id="start" className="text-2xl font-semibold text-white sm:text-3xl">Bizimlə öyrənməyə başla</h2>
          <p className="mt-3 max-w-2xl text-white/75">Müəllimləri kəşf et, uyğun fənn üzrə dərslərə qoşul və ilk sınağını ver.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/muellimler" size="lg">Müəllimlərə bax</LinkButton>
            <LinkButton href="/sinaqlar" size="lg" variant="outline">Sınaq təqvimi</LinkButton>
          </div>
        </section>
      </Container>
    </>
  );
}
