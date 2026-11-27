import type { Metadata } from "next";
import { MaterialEdit } from "@/components/materials/staff-pages";

export const metadata: Metadata = { title: "Material" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaterialEdit area="idare" id={id} />;
}
