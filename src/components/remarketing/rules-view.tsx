"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createRule, updateRule, toggleRule } from "@/actions/remarketing";

type Rule = {
  id: string;
  name: string;
  category: string;
  daysAfter: number;
  messageTemplate: string;
  active: boolean;
};

export function RulesView({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nueva regla
        </Button>
      </div>

      <div className="grid gap-3">
        {rules.map((r) => (
          <Card key={r.id} className={cn("p-4", !r.active && "opacity-55")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <Badge className="bg-violet-100 text-violet-800 border-violet-200">
                    {r.category}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                    {r.daysAfter} días
                  </Badge>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">{r.messageTemplate}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toggleRule(r.id, !r.active);
                      router.refresh();
                    })
                  }
                >
                  {r.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            No hay reglas. La regla post-venta (3 días por tipo de entrega) es fija y siempre aplica.
          </Card>
        )}
      </div>

      <RuleDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva regla"
        onSubmit={async (d) => (await createRule(d)).ok}
      />
      <RuleDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Editar regla"
        initial={editing ?? undefined}
        onSubmit={async (d) => {
          if (!editing) return false;
          return (await updateRule(editing.id, d)).ok;
        }}
      />
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Rule;
  onSubmit: (d: {
    name: string;
    category: string;
    daysAfter: number;
    messageTemplate: string;
    active: boolean;
  }) => Promise<boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [days, setDays] = useState(String(initial?.daysAfter ?? "20"));
  const [msg, setMsg] = useState(initial?.messageTemplate ?? "");
  const [error, setError] = useState<string | null>(null);

  const key = initial?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? "");
    setDays(String(initial?.daysAfter ?? "20"));
    setMsg(initial?.messageTemplate ?? "");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!name.trim() || !category.trim() || !msg.trim()) {
      return setError("Completá nombre, categoría y mensaje.");
    }
    if (!Number(days) || Number(days) < 1) return setError("Los días deben ser un número ≥ 1.");
    startTransition(async () => {
      const ok = await onSubmit({
        name: name.trim(),
        category: category.trim(),
        daysAfter: Number(days),
        messageTemplate: msg.trim(),
        active: initial?.active ?? true,
      });
      if (!ok) return setError("No se pudo guardar.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre de la regla</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría del producto</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="sublimacion"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Días después de la venta</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensaje sugerido</Label>
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Hola {nombre}! ¿Cómo veniste con la {producto}? …"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
