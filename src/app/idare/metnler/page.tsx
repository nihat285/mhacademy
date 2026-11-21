import type { Metadata } from "next";
import { PassageIndex } from "@/components/passages/staff-pages";

export const metadata: Metadata = { title: "Mətn və audio parçaları" };

export default function Page() {
  return <PassageIndex area="idare" />;
}
