"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, StickyNote, ArrowRightLeft, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton } from "@/components/copy-button";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/enums";
import { formatDateTime, formatDate, daysSince } from "@/lib/utils";
import { addLeadNote } from "@/actions/leads";
import type { LeadRow } from "./types";

const EVENT_META: Record<string, { icon: typeof MessageSquare; label: string }> = {
  inbound_message: { icon: MessageSquare, label: "Mensaje entrante" },
  note: { icon: StickyNote, label: "Nota" },
  status_change: { icon: ArrowRightLeft, label: "Cambio de estado" },
  sale: { icon: ShoppingBag, label: "Venta" },
};

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onChangeStatus,
  statusPending,
}: {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChangeStatus: (next: string) => void;
  statusPending: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (!lead) return null;

  function saveNote() {
    if (!note.trim() || !lead) return;
    startTransition(async () => {
      await addLeadNote({ leadId: lead.id, body: note.trim() });
      setNote("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lead.name}
            <StatusBadge status={lead.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span className="font-medium tabular-nums">{lead.phone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Origen</span>
              <span className="font-medium capitalize">{lead.source}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span className="font-medium">{formatDate(lead.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Últ. contacto</span>
              <span className="font-medium">
                {formatDate(lead.lastContactAt)} · {daysSince(lead.lastContactAt)} d
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={lead.status}
              disabled={statusPending}
              onChange={(e) => onChangeStatus(e.target.value)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <div className="pt-1">
              <CopyButton
                text={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}`}
                label="Copiar link wa.me"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Agregar nota</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Le pasé presupuesto, quedó en confirmar el viernes."
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={saveNote} disabled={pending || !note.trim()}>
              {pending ? "Guardando…" : "Guardar nota"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Historial</label>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
            {lead.events.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>
            )}
            {lead.events.map((e) => {
              const meta = EVENT_META[e.type] ?? { icon: StickyNote, label: e.type };
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex gap-2 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p>{e.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta.label} · {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
