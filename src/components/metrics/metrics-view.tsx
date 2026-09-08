"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatMoney, cn } from "@/lib/utils";

type Group = { name: string; total: number; count: number };

export function MetricsView({
  ym,
  months,
  total,
  prevTotal,
  count,
  avgTicket,
  bySeller,
  topProducts,
  byDay,
}: {
  ym: string;
  months: { value: string; label: string }[];
  total: number;
  prevTotal: number;
  count: number;
  avgTicket: number;
  bySeller: Group[];
  topProducts: Group[];
  byDay: { label: string; total: number }[];
}) {
  const router = useRouter();
  const diff = prevTotal === 0 ? (total > 0 ? 100 : 0) : ((total - prevTotal) / prevTotal) * 100;
  const DiffIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-sm text-muted-foreground">Facturación del canal WhatsApp</p>
        </div>
        <div className="w-56">
          <Select
            value={ym}
            onChange={(e) => router.push(`/metrics?m=${e.target.value}`)}
            className="capitalize"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value} className="capitalize">
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Facturado en el mes" value={formatMoney(total)}>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground",
            )}
          >
            <DiffIcon className="h-3.5 w-3.5" />
            {diff > 0 ? "+" : ""}
            {diff.toFixed(0)}% vs mes anterior ({formatMoney(prevTotal)})
          </span>
        </Stat>
        <Stat title="Ventas ganadas" value={String(count)} />
        <Stat title="Ticket promedio" value={formatMoney(avgTicket)} />
        <Stat
          title="Vendedores activos"
          value={String(bySeller.filter((s) => s.count > 0).length || 1)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facturación por día</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay ventas registradas en este mes.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={2} />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatMoney(v), "Facturación"]}
                    labelFormatter={(l) => `Día ${l}`}
                  />
                  <Bar dataKey="total" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturación por vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bySeller.map((s) => (
              <div key={s.name} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <span className="font-medium">{s.name}</span>
                <span className="text-right">
                  <span className="font-semibold tabular-nums">{formatMoney(s.total)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{s.count} ventas</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin ventas este mes.</p>
            )}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 border-b py-2 text-sm last:border-0">
                <Badge className="bg-slate-100 text-slate-700 border-slate-200">{i + 1}</Badge>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.count}u</span>
                <span className="w-28 text-right font-semibold tabular-nums">
                  {formatMoney(p.total)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {children && <div className="mt-1">{children}</div>}
      </CardContent>
    </Card>
  );
}
