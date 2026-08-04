import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export type AdminChartsData = {
  byDay: Array<{ day: string; count: number }>;
  byCategory: Array<{ name: string; count: number }>;
  byHour: Array<{ hour: string | number; count: number }>;
};

/**
 * Gráficos do painel administrativo isolados em um módulo próprio.
 *
 * Decisão arquitetural: `recharts` (+ d3-scale/shape) é a maior dependência
 * do app (~200 KB min). Mantê-la no módulo da rota /admin obrigava o download
 * do pacote inteiro só para abrir a tela de login do painel. Extraindo para
 * este arquivo e carregando via `React.lazy`, o chunk só é buscado quando a
 * aba "Visão geral" é realmente exibida — o TBT inicial do /admin cai junto,
 * já que o parse/execute do bundle sai do caminho crítico.
 */
export default function AdminCharts({ data }: { data: AdminChartsData }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boletins por dia (últimos 14)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byDay}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias mais usadas</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byCategory} dataKey="count" nameKey="name" outerRadius={80}>
                  {data.byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horários de pico</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byHour}>
                <XAxis dataKey="hour" fontSize={10} interval={2} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
