"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { daysSince, formatDate } from "@/lib/utils";
import { markTaskContacted } from "@/actions/remarketing";

type Task = {
  id: string;
  kind: string;
  dueAt: string;
  suggestedMessage: string;
  altMessages: string[];
  leadName: string;
  leadPhone: string;
  productName: string;
  seller: string;
};

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

function TaskCard({ t }: { t: Task }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const overdueDays = daysSince(t.dueAt);
  const isOverdue = new Date(t.dueAt) < new Date();

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{t.leadName}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {t.leadPhone} · {t.productName}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              className={
                t.kind === "rule"
                  ? "bg-violet-100 text-violet-800 border-violet-200"
                  : "bg-sky-100 text-sky-800 border-sky-200"
              }
            >
              {t.kind === "rule" ? "Regla de producto" : "Post-venta"}
            </Badge>
            <Badge
              className={
                isOverdue
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }
            >
              <Clock className="mr-1 h-3 w-3" />
              {isOverdue
                ? overdueDays === 0
                  ? "Vence hoy"
                  : `Vencida hace ${overdueDays} d`
                : `Para ${formatDate(t.dueAt)}`}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">{t.suggestedMessage}</div>

        <div className="flex flex-wrap gap-2">
          <CopyButton text={t.suggestedMessage} label="Copiar mensaje" />
          <Button asChild variant="outline" size="sm">
            <a href={waLink(t.leadPhone, t.suggestedMessage)} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> Abrir en WhatsApp
            </a>
          </Button>
          <Button
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markTaskContacted(t.id, true);
                router.refresh();
              })
            }
          >
            <Check className="h-4 w-4" /> Marcar como contactado
          </Button>
        </div>

        {t.altMessages.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {t.altMessages.length} mensaje(s) de acompañamiento sugeridos
            </summary>
            <div className="mt-2 space-y-2">
              {t.altMessages.map((m, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                  <span className="flex-1">{m}</span>
                  <CopyButton text={m} label="Copiar" />
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

export function RemarketingView({
  due,
  upcoming,
  recentDone,
}: {
  due: Task[];
  upcoming: Task[];
  recentDone: { id: string; leadName: string; productName: string; contactedAt: string }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Para contactar hoy ({due.length})
        </h2>
        {due.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              🎉 Nada pendiente. Los recordatorios aparecen acá cuando llega su fecha.
            </CardContent>
          </Card>
        )}
        {due.map((t) => (
          <TaskCard key={t.id} t={t} />
        ))}

        {upcoming.length > 0 && (
          <>
            <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Próximos ({upcoming.length})
            </h2>
            <Card>
              <CardContent className="divide-y pt-0">
                {upcoming.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      <span className="font-medium">{t.leadName}</span>{" "}
                      <span className="text-muted-foreground">· {t.productName}</span>
                    </span>
                    <span className="text-muted-foreground">{formatDate(t.dueAt)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contactados recientemente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentDone.length === 0 && (
              <p className="text-muted-foreground">Todavía nada.</p>
            )}
            {recentDone.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="flex-1">
                  {t.leadName} <span className="text-muted-foreground">· {t.productName}</span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(t.contactedAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
