"use client";
import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { Building2, ArrowUpRight } from "lucide-react";
import { api, json } from "@/lib/api";
import { type Apartment, type Complex, availability, money } from "@/lib/types";
import {
  PageTitle,
  Resource,
  Pagination,
  Badge,
  Editor,
  Field,
} from "@/components/ui";
const Residence = dynamic(() => import("@/features/residence/residence"));
export default function PublicCatalog({
  initialSlug = "",
  embedded = false,
}: {
  initialSlug?: string;
  embedded?: boolean;
}) {
  const [visual, setVisual] = useState(embedded);
  const [input, setInput] = useState(initialSlug);
  const [slug, setSlug] = useState(initialSlug);
  const [offset, setOffset] = useState(0);
  const [complex, setComplex] = useState("");
  const [rooms, setRooms] = useState("");
  const [selected, setSelected] = useState<Apartment | null>(null);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [detailError, setDetailError] = useState("");
  const base = "/api/v1/companies/" + encodeURIComponent(slug);
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (complex) params.set("complex_id", complex);
  if (rooms) params.set("rooms", rooms);
  const { data: complexes } = useSWR<Complex[]>(
    slug ? base + "/majmualar" : null,
    (path: string) => api<Complex[]>(path, {}, false),
  );
  const { data, error, isLoading, mutate } = useSWR<Apartment[]>(
    slug ? base + "/kvartiralar?" + params : null,
    (path: string) => api<Apartment[]>(path, {}, false),
  );
  return (
    <>
      {!embedded && (
        <PageTitle
          title="Xonadon tanlang"
          description="Majmualar bilan tanishing va ma’qul xonadon uchun murojaat qoldiring."
        />
      )}
      <section className="glass panel">
        {!embedded && (
          <form
            className="panel-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setSlug(input.trim());
              setOffset(0);
              setComplex("");
              setRooms("");
              setReceipt(null);
            }}
          >
            <Field label="Kompaniya identifikatori">
              <input
                required
                pattern="[a-zA-Z0-9_-]+"
                value={input}
                placeholder="Masalan: ozod-demo"
                onChange={(e) => setInput(e.target.value)}
              />
            </Field>
            <button className="primary">
              Katalogni ochish <ArrowUpRight size={16} />
            </button>
          </form>
        )}
        {slug && (
          <>
            <div className="tabs">
              <button
                className={!visual ? "active" : ""}
                onClick={() => setVisual(false)}
              >
                Ro‘yxat
              </button>
              <button
                className={visual ? "active" : ""}
                onClick={() => setVisual(true)}
              >
                Majmua 3D
              </button>
            </div>
            {visual ? (
              <Residence key={slug} slug={slug} onApply={setSelected} />
            ) : (
              <>
                <div className="panel-toolbar">
                  <span>{slug}</span>
                  <div className="filters">
                    <select
                      aria-label="Majmua filtri"
                      value={complex}
                      onChange={(e) => {
                        setComplex(e.target.value);
                        setOffset(0);
                      }}
                    >
                      <option value="">Barcha majmualar</option>
                      {complexes?.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Xonalar filtri"
                      value={rooms}
                      onChange={(e) => {
                        setRooms(e.target.value);
                        setOffset(0);
                      }}
                    >
                      <option value="">Barcha xonalar</option>
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1} xona
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {receipt && (
                  <p className="success" role="status">
                    Arizangiz qabul qilindi. Ariza raqami: #{receipt}.
                  </p>
                )}
                {detailError && (
                  <p className="error" role="alert">
                    {detailError}
                  </p>
                )}
                <Resource
                  loading={isLoading}
                  error={error}
                  empty={!data?.length}
                  retry={mutate}
                >
                  <div className="apartment-grid">
                    {data?.map((x) => (
                      <article key={x.id} className="apartment">
                        <div className="apartment-top">
                          <Building2 size={28} />
                          <Badge
                            value={x.availability}
                            label={
                              availability[x.availability] || x.availability
                            }
                          />
                        </div>
                        <p>
                          {complexes?.find((c) => c.id === x.complex_id)
                            ?.name || `Majmua #${x.complex_id}`}
                        </p>
                        <h2>
                          {x.number} · {x.rooms} xona
                        </h2>
                        <strong className="price">{money(x.price_uzs)}</strong>
                        <button
                          disabled={x.availability !== "available"}
                          onClick={async () => {
                            try {
                              setSelected(
                                await api<Apartment>(
                                  base + "/kvartiralar/" + x.id,
                                  {},
                                  false,
                                ),
                              );
                              setDetailError("");
                            } catch (e) {
                              setDetailError((e as Error).message);
                            }
                          }}
                        >
                          Ariza qoldirish <ArrowUpRight size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </Resource>
                <Pagination
                  offset={offset}
                  count={data?.length || 0}
                  onChange={setOffset}
                />
              </>
            )}
            {visual && receipt && (
              <p className="success" role="status">
                Arizangiz qabul qilindi. Ariza raqami: #{receipt}.
              </p>
            )}
          </>
        )}
      </section>
      {selected && (
        <Editor
          title="Ariza qoldirish"
          submit="Arizani yuborish"
          onClose={() => setSelected(null)}
          onSave={async (f) => {
            const receipt = await api<{ id: number }>(
              base + "/arizalar",
              json("POST", {
                full_name: f.get("full_name"),
                phone: f.get("phone"),
                apartment_id: selected.id,
                consent: true,
              }),
              false,
            );
            setReceipt(receipt.id);
            await mutate();
          }}
        >
          <p>
            {selected.number} · {money(selected.price_uzs)}
          </p>
          <Field label="Ism va familiya">
            <input
              name="full_name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </Field>
          <Field label="Telefon raqami">
            <input
              name="phone"
              type="tel"
              required
              pattern="\+998[0-9]{9}"
              placeholder="+998901234567"
              autoComplete="tel"
            />
          </Field>
          <label className="check">
            <input type="checkbox" required /> Shaxsiy ma’lumotlarimni
            murojaatni ko‘rib chiqish uchun qayta ishlashga roziman.
          </label>
        </Editor>
      )}
    </>
  );
}
