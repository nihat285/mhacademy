import type { Metadata } from "next";
import { PassageNew } from "@/components/passages/staff-pages";

export const metadata: Metadata = { title: "Yeni parça" };

export default function Page() {
  return <PassageNew area="idare" />;
}
