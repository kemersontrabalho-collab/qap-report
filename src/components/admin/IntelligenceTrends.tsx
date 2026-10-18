import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminGetIntelligenceTrends } from "@/lib/admin.functions";
import { SEIZED_LABEL, type SeizedKind } from "@/lib/bulletin-extras";

const C = ["var(--primary)", "var(--accent-foreground)", "var(--muted-foreground)", "var(--ring)", "var(--secondary-foreground)"];
const PERIODS = [
  [7, "7 dias"],
  [30, "30 dias"],
  [90, "90 dias"],
  [0, "Tudo"],
] as const;

export default function IntelligenceTrends() {
  const fn = useServerFn(adminGetIntelligenceTrends);
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-intel", days],
    queryFn: () => fn({ data: { days } }),
  });

  const pct = (n: number) => (data?.total ? Math.round((n / data.total) * 100) : 0);

  function exportSummary() {
    if (!data) return;
    const label = PERIODS.find((p) => p[0] === days)?.[1];
    const lines = [
      `RESUMO ESTATÍSTICO — QAP Report (${label})`,
      `Total de ocorrências: ${data.total}`,
      `Com apoio de guarnição: ${data.withSupport} (${pct(data.withSupport)}%)`,
      `Motorizadas: ${data.motorized} (${pct(data.motorized)}%)`,
      `Com apreensão: ${data.withSeizure} (${pct(data.withSeizure)}%)`,
      "",
      "Naturezas mais frequentes:",
      ...data.topCategories.map((c, i) => `${i + 1}. ${c.name} — ${c.count} (${c.pct}%)`),
      "",
      "Turnos:",
      ...data.byShift.map((s) => `${s.name}: ${s.count}`),
      "",
      "Apreensões:",
      ...Object.entries(data.seized).map(([k, v]) => `${SEIZED_LABEL[k as SeizedKind]}: ${v}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => toast.success("Resumo copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {PERIODS.map(([v, l]) => (
            <Button key={v} size="sm" variant={days === v ? "default" : "outline"} onClick={() => setDays(v)}>
              {l}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={exportSummary} disabled={!data}>
          <Copy className="mr-2 h-4 w-4" /> Copiar resumo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Dados 100% anônimos: apenas contagens, sem nomes, textos, endereços ou autores.
      </p>

      {isLoading || !data ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Ocorrências" value={data.total} />
            <Kpi label="Com apoio" value={data.withSupport} sub={`${pct(data.withSupport)}%`} />
            <Kpi label="Motorizadas" value={data.motorized} sub={`${pct(data.motorized)}% · a pé ${pct(data.total - data.motorized)}%`} />
            <Kpi label="Com apreensão" value={data.withSeizure} sub={`${pct(data.withSeizure)}%`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Naturezas mais frequentes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.topCategories.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
              {data.topCategories.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm"><span className="truncate">{c.name}</span><span className="text-muted-foreground">{c.count} · {c.pct}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${c.pct}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="Mancha horária">
              <BarChart data={data.byHour}>
                <XAxis dataKey="hour" fontSize={10} interval={2} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name="Ocorrências" fill="var(--primary)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Turnos">
              <BarChart data={data.byShift}>
                <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name="Ocorrências" fill="var(--accent-foreground)" />
              </BarChart>
            </ChartCard>
            <ChartCard title="Tipo de boletim">
              <PieChart>
                <Pie data={data.byType} dataKey="count" nameKey="name" innerRadius={45} outerRadius={80} label>
                  {data.byType.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartCard>
            <ChartCard title="Evolução diária">
              <AreaChart data={data.byDay}>
                <XAxis dataKey="day" fontSize={10} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
                <Area type="monotone" dataKey="count" name="Ocorrências" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
              </AreaChart>
            </ChartCard>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Apreensões registradas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Object.entries(data.seized).map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{SEIZED_LABEL[k as SeizedKind]}</p>
                  <p className="text-xl font-semibold">{v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent></Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></CardContent>
    </Card>
  );
}
