"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Flame, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "@/lib/enums";
import { cn, daysSince, formatDate, normalizePhone } from "@/lib/utils";
import { updateLeadStatus } from "@/actions/leads";
import { MarkWonDialog } from "./mark-won-dialog";
import { LeadDetailDialog } from "./lead-detail-dialog";
import { NewLeadDialog } from "./new-lead-dialog";
import type { LeadRow, ProductDTO } from "./types";

const COLD_DAYS = 7;

export function LeadsView({ rows, products }: { rows: LeadRow[]; products: ProductDTO[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [pending, startTransition] = useTransition();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [wonLead, setWonLead] = useState<LeadRow | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const nPhone = normalizePhone(q);
    return rows.filter((r) => {
      if (status !== "todos" && r.status !== status) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        (nPhone.length >= 3 && normalizePhone(r.phone).includes(nPhone))
      );
    });
  }, [rows, q, status]);

  const detailLead = rows.find((r) => r.id === detailId) ?? null;

  function changeStatus(lead: LeadRow, next: string) {
    if (next === lead.status) return;
    if (next === "ganado") {
      setWonLead(lead);
      return;
    }
    startTransition(async () => {
      await updateLeadStatus(lead.id, next);
      router.refresh();
    });
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} en total · ordenados por hace cuánto no se tocan
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo lead
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos los estados ({rows.length})</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]} ({counts[s] ?? 0})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Últ. contacto</th>
                <th className="px-4 py-3 font-medium">Días sin contacto</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = daysSince(r.lastContactAt);
                const cold = d >= COLD_DAYS && !["ganado", "perdido"].includes(r.status);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b transition-colors hover:bg-accent/50",
                      cold && "bg-rose-50/60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => setDetailId(r.id)}
                      >
                        {r.name}
                      </button>
                      {r.salesCount > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {r.salesCount} venta{r.salesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={r.status}
                        disabled={pending}
                        onChange={(e) => changeStatus(r, e.target.value)}
                        className="h-8 w-[170px] text-xs"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.lastContactAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 tabular-nums",
                          cold ? "font-semibold text-rose-600" : "text-muted-foreground",
                        )}
                      >
                        {cold && <Flame className="h-3.5 w-3.5" />}
                        {d} d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.assignedTo ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No hay leads que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Flame className="mr-1 inline h-3.5 w-3.5 text-rose-600" />
        Resaltado = {COLD_DAYS}+ días sin novedades (lead enfriándose).
      </p>

      <LeadDetailDialog
        lead={detailLead}
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        onChangeStatus={(next) => detailLead && changeStatus(detailLead, next)}
        statusPending={pending}
      />
      <MarkWonDialog
        lead={wonLead}
        products={products}
        open={!!wonLead}
        onOpenChange={(v) => !v && setWonLead(null)}
      />
      <NewLeadDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

export { LEAD_STATUS_LABEL };
export type { LeadStatus };
