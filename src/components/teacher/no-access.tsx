import { EmptyState } from "@/components/ui/card";

export function NoAccess({ what }: { what: string }) {
  return (
    <EmptyState title="Bu bölməyə icazəniz yoxdur">
      {what} üçün administrator sizə uyğun icazəni verməlidir. İcazə veriləndən sonra səhifəni yeniləyin.
    </EmptyState>
  );
}
