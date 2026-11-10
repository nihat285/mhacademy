import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Haqqımızda", description: "MH Academy platforması haqqında." };

const TEXT = `MH Academy onlayn sınaqlar, video dərslər və səhv təhlili ilə şagirdlərin ölçülə bilən akademik irəliləyişini hədəfləyən təhsil platformasıdır.

**Nə təklif edirik**

- Real imtahan formatında vaxtlı onlayn sınaqlar
- Fənn və mövzu üzrə video dərs kitabxanası
- Səhvlərin təhlili və hədəfli təkrar
- Peşəkar müəllimlərdən dəstək

**Yanaşmamız**

Hər şagirdin nəticəsi şəffaf ölçülür: nəyi bildiyini və harada boşluq olduğunu görür, növbəti addımı bilir.`;

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MH Academy" title="Haqqımızda" />
      <Container className="max-w-3xl">
        <Prose text={TEXT} />
      </Container>
    </>
  );
}
