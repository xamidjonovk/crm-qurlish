"use client";
import { useState } from "react";
import useSWR from "swr";
import { Phone, Search, ArrowUpRight } from "lucide-react";
import { api, fetcher, json } from "@/lib/api";
import { stages, type Lead } from "@/lib/types";
import { useSession } from "@/features/auth/session";
import {
  PageTitle,
  Resource,
  Pagination,
  Badge,
  Editor,
  Field,
} from "@/components/ui";
export default function Leads() {
  const { user } = useSession();
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [sale, setSale] = useState(false);
  const [error, setError] = useState("");
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (stage) params.set("stage", stage);
  if (search) params.set("q", search);
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<Lead[]>("/api/v1/crm/arizalar?" + params, fetcher);
  const write = user?.permissions.includes("leads:write");
  const next: Record<string, string[]> = {
    new: ["contacted", "lost"],
    contacted: ["viewing", "lost"],
    viewing: ["lost"],
    won: [],
    lost: [],
  };
  return (
    <>
      <PageTitle
        title="Arizalar"
        description="Har bir murojaatni keyingi qadamga olib boring."
      />
      <section className="glass panel">
        <div className="panel-toolbar">
          <h2>Mijozlar murojaatlari</h2>
          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim().length === 1) {
                setError("Kamida 2 ta belgi kiriting");
                return;
              }
              setError("");
              setSearch(q.trim());
              setOffset(0);
            }}
          >
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Mijozni qidirish"
                placeholder="Ism yoki telefon…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                maxLength={80}
              />
            </div>
            <select
              aria-label="Bosqich"
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Barcha bosqichlar</option>
              {Object.entries(stages).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button>Qidirish</button>
          </form>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Resource
          loading={isLoading}
          error={loadError}
          empty={!data?.length}
          retry={mutate}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Telefon raqami</th>
                  <th>Xonadon</th>
                  <th>Bosqich</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <button
                        className="link"
                        onClick={async () => {
                          try {
                            setDetail(
                              await api<Lead>(`/api/v1/crm/arizalar/${x.id}`),
                            );
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        {x.full_name}
                        <ArrowUpRight size={14} />
                      </button>
                      <small>Ariza #{x.id}</small>
                    </td>
                    <td>
                      <a className="phone" href={"tel:" + x.phone}>
                        <Phone size={13} />
                        {x.phone}
                      </a>
                    </td>
                    <td>#{x.apartment_id}</td>
                    <td>
                      <Badge value={x.stage} label={stages[x.stage]} />
                    </td>
                    <td>
                      {write && next[x.stage]?.length > 0 && (
                        <button
                          onClick={() => {
                            setSelected(x);
                            setSale(false);
                          }}
                        >
                          Bosqich
                        </button>
                      )}
                      {write && x.stage === "viewing" && (
                        <button
                          className="primary"
                          onClick={() => {
                            setSelected(x);
                            setSale(true);
                          }}
                        >
                          Sotuvni yakunlash
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Resource>
        <Pagination
          offset={offset}
          count={data?.length || 0}
          onChange={setOffset}
        />
      </section>
      {selected && (
        <Editor
          title={sale ? "Sotuvni tasdiqlash" : "Bosqichni o‘zgartirish"}
          submit={sale ? "Sotuvni tasdiqlash" : "Saqlash"}
          onClose={() => setSelected(null)}
          onSave={async (f) => {
            await api(
              `/api/v1/crm/arizalar/${selected.id}/${sale ? "confirm-sale" : "stage"}`,
              json(sale ? "POST" : "PATCH", {
                stage: sale ? "won" : f.get("stage"),
                expected_version: selected.version,
              }),
            );
            await mutate();
          }}
        >
          <p>
            {selected.full_name} · Xonadon #{selected.apartment_id}
          </p>
          {sale ? (
            <p>
              Tasdiqlangach xonadon sotilgan deb belgilanadi. Bu amalni ortga
              qaytarib bo‘lmaydi.
            </p>
          ) : (
            <Field label="Yangi bosqich">
              <select name="stage">
                {next[selected.stage].map((v) => (
                  <option key={v} value={v}>
                    {stages[v]}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Editor>
      )}
      {detail && (
        <Editor
          title={`Ariza #${detail.id}`}
          submit="Yopish"
          onClose={() => setDetail(null)}
          onSave={async () => {}}
        >
          <dl>
            <dt>Mijoz</dt>
            <dd>{detail.full_name}</dd>
            <dt>Telefon</dt>
            <dd>{detail.phone}</dd>
            <dt>Bosqich</dt>
            <dd>{stages[detail.stage]}</dd>
            <dt>Xonadon</dt>
            <dd>#{detail.apartment_id}</dd>
          </dl>
        </Editor>
      )}
    </>
  );
}
