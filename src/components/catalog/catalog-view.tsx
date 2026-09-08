"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatMoney, cn } from "@/lib/utils";
import { createProduct, updateProduct, toggleProduct } from "@/actions/products";

type P = {
  id: string;
  name: string;
  basePrice: number;
  category: string;
  active: boolean;
  salesCount: number;
};

export function CatalogView({ products }: { products: P[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<P | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            Productos disponibles al registrar una venta.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nuevo producto
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Precio base</th>
                <th className="px-4 py-3 font-medium">Categorías / tags</th>
                <th className="px-4 py-3 font-medium">Ventas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={cn("border-b", !p.active && "opacity-55")}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(p.basePrice)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.category
                        ? p.category.split(",").filter(Boolean).map((c) => (
                            <Badge key={c} className="bg-slate-100 text-slate-700 border-slate-200">
                              {c}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{p.salesCount}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        p.active
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }
                    >
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await toggleProduct(p.id, !p.active);
                            router.refresh();
                          })
                        }
                      >
                        {p.active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Todavía no cargaste productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nuevo producto"
        onSubmit={async (data) => {
          const res = await createProduct(data);
          return res.ok;
        }}
      />
      <ProductDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title="Editar producto"
        initial={editing ?? undefined}
        onSubmit={async (data) => {
          if (!editing) return false;
          const res = await updateProduct(editing.id, data);
          return res.ok;
        }}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: Partial<P>;
  onSubmit: (data: {
    name: string;
    basePrice: number;
    category: string;
    active: boolean;
  }) => Promise<boolean>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(String(initial?.basePrice ?? ""));
  const [category, setCategory] = useState(initial?.category ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  // resync cuando cambia initial (editar otro producto)
  const key = initial?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(initial?.name ?? "");
    setPrice(String(initial?.basePrice ?? ""));
    setCategory(initial?.category ?? "");
    setActive(initial?.active ?? true);
    setError(null);
  }

  function submit() {
    setError(null);
    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (price === "" || Number(price) < 0) return setError("Precio inválido.");
    startTransition(async () => {
      const ok = await onSubmit({
        name: name.trim(),
        basePrice: Number(price),
        category: category.trim(),
        active,
      });
      if (!ok) {
        setError("No se pudo guardar.");
        return;
      }
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
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Precio base</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Categorías / tags (separadas por coma)</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="sublimacion, estampado"
            />
            <p className="text-xs text-muted-foreground">
              Se usan para enganchar reglas de remarketing (ej: “sublimacion”).
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4"
            />
            Activo (aparece al registrar ventas)
          </label>
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
