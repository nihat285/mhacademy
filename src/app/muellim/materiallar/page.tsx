import type { Metadata } from "next";
import { MaterialIndex } from "@/components/materials/staff-pages";

export const metadata: Metadata = { title: "Materiallar" };

export default function Page() {
  return <MaterialIndex area="muellim" />;
}
