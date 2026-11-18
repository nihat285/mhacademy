import { EmptyState } from "@/components/ui/card";

export function NoPermission({ title = "Bu bölməyə icazəniz yoxdur", what }: { title?: string; what: string }) {
  return (
    <EmptyState title={title}>
      {what} üçün administrator sizə uyğun icazəni verməlidir. İcazə veriləndən sonra səhifəni yeniləyin.
    </EmptyState>
  );
}
