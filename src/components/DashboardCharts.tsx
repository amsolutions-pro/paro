"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Card } from "@/src/components/ui/Card";

interface Props {
  posData: { name: string; taux: number; total: number }[];
  activityData: { jour: string; exercices: number }[];
}

/**
 * Graphiques du tableau de bord, isolés dans un module à part pour être
 * chargés en `dynamic(() => …, { ssr:false })` : recharts (~100 kB) ne pèse
 * plus sur le bundle initial ni sur le rendu serveur.
 */
export default function DashboardCharts({ posData, activityData }: Props) {
  return (
    <>
      {posData.length > 0 && (
        <Card>
          <h2 className="font-serif text-lg font-semibold mb-4">Taux de réussite par catégorie</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={posData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => (typeof v === "number" ? `${v} %` : v)} />
              <Bar dataKey="taux" fill="#8e7cc3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {activityData.length > 0 && (
        <Card>
          <h2 className="font-serif text-lg font-semibold mb-4">Activité (7 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e3d6" />
              <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="exercices" stroke="#8e7cc3" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
