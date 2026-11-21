import type { Metadata } from "next";
import { PassageDetail } from "@/components/passages/staff-pages";

export const metadata: Metadata = { title: "Parça" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PassageDetail area="idare" id={id} />;
}
