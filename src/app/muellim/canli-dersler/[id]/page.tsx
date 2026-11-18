import type { Metadata } from "next";
import { LiveDetail } from "@/components/live/staff-pages";

export const metadata: Metadata = { title: "Canlı dərs" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveDetail area="muellim" id={id} />;
}
