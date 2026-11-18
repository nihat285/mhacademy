import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

/** Friendly explanation for teachers who lack a capability (requirePermission would 404 by design). */
export function NoPermission({ title, what }: { title: string; what: string }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={<ShieldAlert size={32} />}
        title={title}
        action={
          <LinkButton href="/muellim" variant="outline">
            İcmala qayıt
          </LinkButton>
        }
      >
        Bu bölməyə giriş icazəniz verilməyib. {what} üçün administrator hesabınıza uyğun icazəni aktiv etməlidir. İcazə verildikdən sonra səhifəni yeniləyin və ya{" "}
        <Link href="/muellim" className="font-semibold underline">
          icmala
        </Link>{" "}
        qayıdın.
      </EmptyState>
    </div>
  );
}
