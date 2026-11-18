import type { Metadata } from "next";
import { LiveNew } from "@/components/live/staff-pages";

export const metadata: Metadata = { title: "Yeni canlı dərs" };

export default function Page() {
  return <LiveNew area="muellim" />;
}
