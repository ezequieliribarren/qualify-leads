"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { DELIVERY_TYPE_LABEL } from "@/lib/enums";
import { createSale, deleteSale } from "@/actions/sales";

type SaleRow = {
  id: string;
  soldAt: string;
  productName: string;
  finalPrice: number;
  deliveryType: string;
  customer: string | null;
  seller: string;
};
type ProductDTO = { id: string; name: string; basePrice: number };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function VentasView({
  sales,
  products,
  monthTotal,
  monthCount,
}: {
  sales: SaleRow[];
  products: ProductDTO[];
  monthTotal: number;
  monthCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-muted-foreground">Registro de ventas realizadas</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva venta
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-md">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Facturado este mes</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(monthTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Ventas este mes</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{monthCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Entrega</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <SaleRowView key={s.id} s={s} />
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Todavía no cargaste ninguna venta. Tocá <strong>Nueva venta</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <NuevaVentaDialog open={open} onOpenChange={setOpen} products={products} />
    </div>
  );
}

function SaleRowView({ s }: { s: SaleRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  return (
    <tr className="border-b hover:bg-accent/40">
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(s.soldAt)}</td>
      <td className="px-4 py-3 font-medium">{s.productName}</td>
      <td className="px-4 py-3 text-muted-foreground">{s.customer ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge
          className={
            s.deliveryType === "envio"
              ? "bg-sky-100 text-sky-800 border-sky-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
          }
        >
          {DELIVERY_TYPE_LABEL[s.deliveryType as "envio" | "local"] ?? s.deliveryType}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(s.finalPrice)}</td>
      <td className="px-4 py-3 text-muted-foreground">{s.seller}</td>
      <td className="px-4 py-3 text-right">
        {confirm ? (
          <span className="flex items-center justify-end gap-1">
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteSale(s.id);
                  router.refresh();
                })
              }
            >
              Borrar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function NuevaVentaDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: ProductDTO[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [soldAt, setSoldAt] = useState(todayStr());
  const [customer, setCustomer] = useState("");
  const [delivery, setDelivery] = useState("local");

  const byName = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.name.toLowerCase(), p.basePrice);
    return m;
  }, [products]);

  function reset() {
    setProductName("");
    setPrice("");
    setSoldAt(todayStr());
    setCustomer("");
    setDelivery("local");
    setError(null);
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function onProductChange(v: string) {
    setProductName(v);
    const base = byName.get(v.toLowerCase());
    if (base != null && !price) setPrice(String(base));
  }

  function submit() {
    setError(null);
    if (!productName.trim()) return setError("Poné el producto.");
    if (price === "" || Number(price) < 0) return setError("Poné un monto válido.");
    startTransition(async () => {
      const res = await createSale({
        productName: productName.trim(),
        finalPrice: Number(price),
        soldAt,
        deliveryType: delivery as "envio" | "local",
        customerName: customer.trim() || undefined,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar la venta.");
      handleOpenChange(false);
      router.refresh();
    });
  }

  const isKnown = byName.has(productName.trim().toLowerCase());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Cargá una venta ya realizada. La fecha viene puesta en hoy (podés cambiarla).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prod">Producto</Label>
            <Input
              id="prod"
              list="productos-catalogo"
              value={productName}
              onChange={(e) => onProductChange(e.target.value)}
              placeholder="Escribí o elegí un producto"
              autoComplete="off"
            />
            <datalist id="productos-catalogo">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            {productName.trim() && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                {isKnown ? "Del catálogo" : "Nuevo — se agrega al catálogo automáticamente"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">Monto / presupuesto</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cli">Cliente (opcional)</Label>
            <Input
              id="cli"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="space-y-2">
            <Label>Entrega</Label>
            <RadioGroup value={delivery} onValueChange={setDelivery} className="grid grid-cols-2 gap-2">
              {(["local", "envio"] as const).map((v) => (
                <label
                  key={v}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-accent",
                    "has-[:checked]:border-primary has-[:checked]:bg-primary/5",
                  )}
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
            {pending ? "Guardando…" : "Guardar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
