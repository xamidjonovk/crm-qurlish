"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  Activity,
  Building2,
  CheckCircle2,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { fetcher } from "@/lib/api";
import { PageTitle, Resource } from "@/components/ui";
import { stages, availability } from "@/lib/types";
import "./dashboard.css";
type Stats = {
  leads: Record<string, number>;
  apartments: Record<string, number>;
  daily: { date: string; count: number }[];
  sample_leads: number;
};
const total = (v: Record<string, number>) =>
  Object.values(v).reduce((a, b) => a + b, 0);
const colors: Record<string, string> = {
  new: "#6b8ee8",
  contacted: "#a886d3",
  viewing: "#e4a260",
  won: "#56b397",
  lost: "#d7838f",
  available: "#4da68b",
  reserved: "#e0a552",
  sold: "#d77b86",
};
export default function Dashboard() {
  const [days, setDays] = useState(14);
  const { data, error, isLoading, mutate } = useSWR<Stats>(
    "/api/v1/crm/dashboard",
    fetcher,
    { refreshInterval: 30000 },
  );
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - days + 1 + i);
    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
    return {
      date: key,
      label: `${date.getUTCDate()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      count: data?.daily.find((d) => d.date === key)?.count || 0,
    };
  });
  const peak = Math.max(1, ...daily.map((d) => d.count));
  const maxLead = data ? total(data.leads) : 0;
  const maxStock = data ? total(data.apartments) : 0;
  const arc = data
    ? Object.entries(availability).reduce(
        (a, [key]) => {
          const count = data.apartments[key] || 0;
          const next = a.cursor + (maxStock ? (count / maxStock) * 100 : 0);
          a.parts.push(`${colors[key]} ${a.cursor}% ${next}%`);
          a.cursor = next;
          return a;
        },
        { parts: [] as string[], cursor: 0 },
      )
    : null;
  return (
    <>
      <PageTitle
        title="Boshqaruv paneli"
        description="Savdo va murojaatlarning jonli ko‘rinishi."
      />
      <Resource loading={isLoading} error={error} retry={mutate}>
        {!!data?.sample_leads && (
          <p className="dash-sample">
            Ko‘rsatkichlarda {data.sample_leads} ta namuna murojaat mavjud.
          </p>
        )}
        <div className="dash-welcome">
          <div>
            <span>Bugungi ish holati</span>
            <h2>Savdo jarayoni bir qarashda</h2>
            <p>Murojaatlar va xonadonlar holatini kuzating.</p>
          </div>
          <div className="dash-live">
            <span /> Ma’lumotlar 30 soniyada yangilanadi
          </div>
        </div>
        <div className="dash-summary">
          {[
            ["Jami murojaatlar", maxLead, Users, "violet"],
            ["Yangi murojaatlar", data?.leads.new || 0, Activity, "blue"],
            [
              "Mavjud xonadonlar",
              data?.apartments.available || 0,
              Building2,
              "green",
            ],
            [
              "Sotilgan xonadonlar",
              data?.apartments.sold || 0,
              CheckCircle2,
              "amber",
            ],
          ].map(([label, value, Icon, tone]) => {
            const Symbol = Icon as typeof Users;
            return (
              <article className={`dash-stat ${tone}`} key={label as string}>
                <div>
                  <span>{label as string}</span>
                  <Symbol size={19} />
                </div>
                <strong>{value as number}</strong>
                <small>
                  Joriy ma’lumot <ArrowUpRight size={13} />
                </small>
              </article>
            );
          })}
        </div>
        <div className="dash-main">
          <section className="dash-chart glass">
            <header>
              <div>
                <h2>Murojaatlar dinamikasi</h2>
                <p>Kunlar bo‘yicha kelib tushgan arizalar</p>
              </div>
              <div className="dash-period">
                <button aria-pressed={days === 14} onClick={() => setDays(14)}>
                  14 kun
                </button>
                <button aria-pressed={days === 30} onClick={() => setDays(30)}>
                  30 kun
                </button>
              </div>
            </header>
            <div className="dash-total">
              <strong>{daily.reduce((a, b) => a + b.count, 0)}</strong>
              <span>shu davrdagi murojaat</span>
            </div>
            <div
              className="dash-graph"
              role="img"
              aria-label={`Oxirgi ${days} kunlik murojaatlar, jami ${daily.reduce((a, b) => a + b.count, 0)} ta`}
            >
              <div className="dash-bars">
                {daily.map((d, i) => (
                  <div className="dash-bar-wrap" key={d.date}>
                    <div
                      className="dash-bar"
                      title={`${d.label}: ${d.count} ta`}
                      style={{
                        height: `${Math.max(d.count ? 8 : 2, (d.count / peak) * 100)}%`,
                      }}
                    />
                    <small>{days === 14 || i % 5 === 0 ? d.label : ""}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="dash-inventory glass">
            <h2>Xonadonlar holati</h2>
            <p>Joriy inventar tarkibi</p>
            <div
              className="dash-donut"
              style={{
                background: maxStock
                  ? `conic-gradient(${arc?.parts.join(",")})`
                  : "#e4ecec",
              }}
            >
              <div>
                <strong>{maxStock}</strong>
                <span>jami xonadon</span>
              </div>
            </div>
            <div className="dash-legend">
              {Object.entries(availability).map(([k, v]) => (
                <div key={k}>
                  <span>
                    <i style={{ background: colors[k] }} />
                    {v}
                  </span>
                  <strong>{data?.apartments[k] || 0}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="dash-funnel glass">
          <header>
            <div>
              <h2>Savdo voronkasi</h2>
              <p>Barcha murojaatlar joriy bosqich bo‘yicha</p>
            </div>
            <strong>{maxLead} ta ariza</strong>
          </header>
          <div className="dash-funnel-grid">
            {Object.entries(stages).map(([k, v]) => {
              const n = data?.leads[k] || 0;
              return (
                <div key={k}>
                  <div className="dash-funnel-label">
                    <span>
                      <i style={{ background: colors[k] }} />
                      {v}
                    </span>
                    <strong>{n}</strong>
                  </div>
                  <div className="dash-track">
                    <span
                      style={{
                        width: `${maxLead ? (n / maxLead) * 100 : 0}%`,
                        background: colors[k],
                      }}
                    />
                  </div>
                  <small>
                    {maxLead ? Math.round((n / maxLead) * 100) : 0}% jami
                    murojaatdan
                  </small>
                </div>
              );
            })}
          </div>
        </section>
      </Resource>
    </>
  );
}
