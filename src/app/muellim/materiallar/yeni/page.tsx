import type { Metadata } from "next";
import { MaterialNew } from "@/components/materials/staff-pages";

export const metadata: Metadata = { title: "Yeni material" };

export default function Page() {
  return <MaterialNew area="muellim" />;
}
