import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "İstifadə qaydaları", description: "Platformadan istifadə şərtləri." };

const TEXT = `**Qeyd:** Bu mətn şablondur və yayımdan əvvəl hüquqşünas tərəfindən yoxlanılmalıdır.

**1. Hesab**

- Qeydiyyat zamanı düzgün məlumat verilməlidir.
- Hesab şifrəsinin qorunması istifadəçinin məsuliyyətidir.

**2. Sınaqlar**

- Sınaqlar fərdi yerinə yetirilməlidir.
- Sınaq sualları və cavabları icazəsiz yayıla bilməz.

**3. Məzmun**

- Platformadakı dərs və suallar müəllif hüququ ilə qorunur.

**4. Məsuliyyət**

- Qaydaları pozan hesablar məhdudlaşdırıla və ya silinə bilər.`;

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MH Academy" title="İstifadə qaydaları" />
      <Container className="max-w-3xl">
        <Prose text={TEXT} />
      </Container>
    </>
  );
}
