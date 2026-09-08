"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney } from "@/lib/utils";
import { DELIVERY_TYPE_LABEL } from "@/lib/enums";
import { registerSale } from "@/actions/sales";
import type { LeadRow, ProductDTO } from "./types";

const NEW = "__new__";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function MarkWonDialog({
  lead,
  products,
  open,
  onOpenChange,
}: {
  lead: LeadRow | null;
  products: ProductDTO[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [soldAt, setSoldAt] = useState(todayStr());
  const [deliveryType, setDeliveryType] = useState<string>("");

  const selected = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  function reset() {
    setProductId("");
    setNewName("");
    setNewPrice("");
    setFinalPrice("");
    setSoldAt(todayStr());
    setDeliveryType("");
    setError(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function onProductChange(value: string) {
    setProductId(value);
    setError(null);
    if (value === NEW) {
      setFinalPrice(newPrice || "");
    } else {
      const p = products.find((x) => x.id === value);
      if (p) setFinalPrice(String(p.basePrice));
    }
  }

  function submit() {
    setError(null);
    if (!lead) return;
    if (!productId) return setError("Elegí un producto.");
    if (productId === NEW && !newName.trim()) return setError("Poné el nombre del producto nuevo.");
    if (!deliveryType) return setError("Elegí el tipo de entrega.");
    if (!finalPrice || Number(finalPrice) < 0) return setError("Precio inválido.");

    startTransition(async () => {
      const res = await registerSale({
        leadId: lead.id,
        productId: productId === NEW ? undefined : productId,
        newProductName: productId === NEW ? newName.trim() : undefined,
        newProductPrice: productId === NEW ? Number(newPrice || finalPrice) : undefined,
        finalPrice: Number(finalPrice),
        soldAt,
        deliveryType: deliveryType as "envio" | "local",
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo registrar la venta.");
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-emerald-600" />
            Marcar como Ganado
          </DialogTitle>
          <DialogDescription>
            {lead ? (
              <>
                Registrá la venta de <strong>{lead.name}</strong>. El lead pasa a{" "}
                <strong>Ganado</strong> y se generan los recordatorios de remarketing.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Producto</Label>
            <Select value={productId} onChange={(e) => onProductChange(e.target.value)}>
              <option value="">Elegí un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMoney(p.basePrice)}
                </option>
              ))}
              <option value={NEW}>+ Agregar producto nuevo</option>
            </Select>
          </div>

          {productId === NEW && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="space-y-1.5">
                <Label>Nombre del producto</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Plancha 40x50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Precio base</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => {
                    setNewPrice(e.target.value);
                    if (!finalPrice) setFinalPrice(e.target.value);
                  }}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {selected?.category && (
            <p className="text-xs text-muted-foreground">
              Categorías: <span className="font-medium">{selected.category}</span> — si alguna
              matchea una regla, se genera un recordatorio extra.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Precio final</Label>
              <Input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">Editable (descuentos, promos…).</p>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de venta</Label>
              <Input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de entrega</Label>
            <RadioGroup
              value={deliveryType}
              onValueChange={setDeliveryType}
              className="grid grid-cols-2 gap-2"
            >
              {(["envio", "local"] as const).map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={v} /> {DELIVERY_TYPE_LABEL[v]}
                </label>
              ))}
            </RadioGroup>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Guardando…" : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
