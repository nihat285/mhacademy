import type { Metadata } from "next";
import { LiveIndex } from "@/components/live/staff-pages";

export const metadata: Metadata = { title: "Canlı dərslər" };

export default function Page() {
  return <LiveIndex area="idare" />;
}
