import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/catalog/page-header";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Məxfilik siyasəti", description: "Şəxsi məlumatların emalı haqqında." };

const TEXT = `**Qeyd:** Bu mətn şablondur və yayımdan əvvəl hüquqşünas tərəfindən yoxlanılmalıdır.

**Hansı məlumatlar toplanır**

- Ad, e-poçt, sinif/fənn seçimləri
- Sınaq nəticələri və dərs irəliləyişi
- Texniki məlumatlar (sessiya, təhlükəsizlik jurnalı)

**Necə istifadə olunur**

- Xidməti göstərmək, nəticələri hesablamaq və bildirişlər göndərmək üçün.
- Məlumatlar üçüncü tərəflərə satılmır.

**Hüquqlarınız**

- Məlumatlarınıza baxmaq, düzəltmək və silinməsini tələb etmək üçün Əlaqə səhifəsindən bizə yazın.`;

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="MH Academy" title="Məxfilik siyasəti" />
      <Container className="max-w-3xl">
        <Prose text={TEXT} />
      </Container>
    </>
  );
}
