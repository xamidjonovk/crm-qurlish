"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { PageTitle, Resource } from "@/components/ui";
import { stages, availability } from "@/lib/types";
import "./dashboard.css";
type Stats = {
  leads: Record<string, number>;
  apartments: Record<string, number>;
};
export default function Dashboard() {
  const { data, error, isLoading, mutate } = useSWR<Stats>(
    "/api/v1/crm/dashboard",
    fetcher,
    { refreshInterval: 30000 },
  );
  const total = (values: Record<string, number>) =>
    Object.values(values).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageTitle
        title="Umumiy ko‘rsatkichlar"
        description="Savdo va murojaatlarning joriy holati."
      />
      <Resource loading={isLoading} error={error} retry={mutate}>
        <div className="dash-summary">
          <article>
            <span>Jami murojaatlar</span>
            <strong>{data ? total(data.leads) : 0}</strong>
          </article>
          <article>
            <span>Yangi murojaatlar</span>
            <strong>{data?.leads.new || 0}</strong>
          </article>
          <article>
            <span>Mavjud xonadonlar</span>
            <strong>{data?.apartments.available || 0}</strong>
          </article>
          <article>
            <span>Sotilgan xonadonlar</span>
            <strong>{data?.apartments.sold || 0}</strong>
          </article>
        </div>
        <div className="dash-panels">
          {data &&
            [
              ["Murojaatlar bosqichi", data.leads, stages],
              ["Xonadonlar holati", data.apartments, availability],
            ].map(([title, values, labels]) => (
              <section className="glass panel" key={title as string}>
                <h2>{title as string}</h2>
                {Object.entries(labels as Record<string, string>).map(
                  ([key, label]) => {
                    const count = (values as Record<string, number>)[key] || 0;
                    const all = total(values as Record<string, number>);
                    return (
                      <div className="dash-row" key={key}>
                        <div>
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="dash-track">
                          <span
                            style={{
                              width: `${all ? (count / all) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </section>
            ))}
        </div>
      </Resource>
    </>
  );
}
