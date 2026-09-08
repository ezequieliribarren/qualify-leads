import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_BADGE, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as LeadStatus;
  return (
    <Badge className={cn(LEAD_STATUS_BADGE[s] ?? "bg-muted text-muted-foreground", className)}>
      {LEAD_STATUS_LABEL[s] ?? status}
    </Badge>
  );
}
