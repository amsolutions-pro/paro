"use client";

import { useState, useEffect } from "react";
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
import { getUserId } from "@/src/lib/user-store";
import { Card } from "@/src/components/ui/Card";
import { BuildInfo } from "@/src/components/ui/BuildInfo";

interface Stats {
  total: number;
  correct: number;
  rate: number;
  byPosClass: Record<string, { total: number; correct: number }>;
  activityByDay: Record<string, number>;
}

const POS_LABELS: Record<string, string> = {
  NOM_M: "Noms m.", NOM_F: "Noms f.", ADJECTIF: "Adj.", VERBE: "Verbes", AUTRE: "Autre",
};

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getUserId();
    fetch(`/api/stats?userId=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((d: Stats) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-encre-soft animate-pulse text-sm">Chargement…</p>;
  if (!stats) return <p className="text-encre-soft text-sm">Erreur de chargement.</p>;

  const posData = Object.entries(stats.byPosClass).map(([pc, v]) => ({
    name: POS_LABELS[pc] ?? pc,
    taux: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    total: v.total,
  }));

  const activityData = Object.entries(stats.activityByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ jour: day.slice(5), exercices: count }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif text-3xl font-bold">Tableau de bord</h1>
        <BuildInfo />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Exercices complétés", value: stats.total },
          { label: "Réponses correctes", value: stats.correct },
          { label: "Taux de réussite", value: `${stats.rate} %` },
        ].map((kpi) => (
          <Card key={kpi.label} className="text-center">
            <p className="font-serif text-3xl font-bold text-lavande-700">{kpi.value}</p>
            <p className="text-encre-soft mt-1 text-xs">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {stats.total === 0 && (
        <p className="text-encre-soft text-sm">
          Commencez des exercices pour voir vos statistiques ici.
        </p>
      )}

      {/* Progression par catégorie */}
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

      {/* Activité sur 7 jours */}
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
    </div>
  );
}
