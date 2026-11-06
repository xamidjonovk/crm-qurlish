"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, fetcher, json } from "@/lib/api";
import { type Apartment, type Complex, availability, money } from "@/lib/types";
import {
  PageTitle,
  Resource,
  Pagination,
  Badge,
  Editor,
  Field,
} from "@/components/ui";
type Edit = {
  kind: "complex" | "apartment" | "price";
  item?: Complex | Apartment;
  remove?: boolean;
};
export default function Catalog() {
  const [tab, setTab] = useState("apartments");
  const [offset, setOffset] = useState(0);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState("");
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<(Apartment & Complex)[]>(
    `/api/v1/crm/catalog/${tab}?limit=20&offset=${offset}`,
    fetcher,
  );
  const { data: complexes, mutate: refreshComplexes } = useSWR<Complex[]>(
    "/api/v1/crm/catalog/complexes?limit=100",
    fetcher,
  );
  const names = new Map(complexes?.map((c) => [c.id, c.name]));
  const apt = tab === "apartments";
  async function open(kind: Edit["kind"], id: number, remove = false) {
    try {
      const item = await api<Apartment & Complex>(
        `/api/v1/crm/catalog/${kind === "complex" ? "complexes" : "apartments"}/${id}`,
      );
      setEdit({ kind, item, remove });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="Xonadonlar va majmualar"
        description="Mavjudlik, narxlar va obyektlar ustidan to‘liq nazorat."
        action={
          <button
            className="primary"
            onClick={() => setEdit({ kind: apt ? "apartment" : "complex" })}
          >
            <Plus size={18} />
            {apt ? "Xonadon" : "Majmua"} qo‘shish
          </button>
        }
      />
      <div className="tabs">
        {[
          ["apartments", "Xonadonlar"],
          ["complexes", "Majmualar"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => {
              setTab(k);
              setOffset(0);
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="glass panel">
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
                  <th>{apt ? "Xonadon" : "Majmua nomi"}</th>
                  {apt && (
                    <>
                      <th>Majmua</th>
                      <th>Xonalar</th>
                      <th>Narx</th>
                      <th>Holat</th>
                    </>
                  )}
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <strong>{apt ? x.number : x.name}</strong>
                      <small>#{x.id}</small>
                    </td>
                    {apt && (
                      <>
                        <td>
                          {names.get(x.complex_id) || `Majmua #${x.complex_id}`}
                        </td>
                        <td>{x.rooms} xona</td>
                        <td>{money(x.price_uzs)}</td>
                        <td>
                          <Badge
                            value={x.availability}
                            label={
                              availability[x.availability] || x.availability
                            }
                          />
                        </td>
                      </>
                    )}
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label="Tahrirlash"
                          disabled={apt && x.availability !== "available"}
                          onClick={() =>
                            open(apt ? "apartment" : "complex", x.id)
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        {apt && (
                          <button
                            disabled={x.availability !== "available"}
                            onClick={() => open("price", x.id)}
                          >
                            Narx
                          </button>
                        )}
                        <button
                          className="danger"
                          aria-label="O‘chirish"
                          disabled={apt && x.availability !== "available"}
                          onClick={() =>
                            open(apt ? "apartment" : "complex", x.id, true)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
      {edit && (
        <Editor
          title={
            edit.remove
              ? "Yozuvni o‘chirish"
              : edit.kind === "price"
                ? "Narxni yangilash"
                : edit.kind === "complex"
                  ? "Majmua ma’lumotlari"
                  : "Xonadon ma’lumotlari"
          }
          submit={edit.remove ? "O‘chirish" : "Saqlash"}
          onClose={() => setEdit(null)}
          onSave={async (f) => {
            const item = edit.item;
            const kind = edit.kind;
            const base =
              "/api/v1/crm/catalog/" +
              (kind === "complex" ? "complexes" : "apartments");
            if (edit.remove)
              await api(`${base}/${item!.id}`, { method: "DELETE" });
            else if (kind === "price")
              await api(
                `/api/v1/crm/inventory/apartments/${item!.id}/price`,
                json("PATCH", {
                  price_uzs: Number(f.get("price_uzs")),
                  expected_price_uzs: (item as Apartment).price_uzs,
                }),
              );
            else if (kind === "complex")
              await api(
                item ? `${base}/${item.id}` : "/api/v1/crm/inventory/complexes",
                json(item ? "PUT" : "POST", { name: f.get("name") }),
              );
            else {
              const values = {
                number: f.get("number"),
                rooms: Number(f.get("rooms")),
              };
              await api(
                item
                  ? `${base}/${item.id}`
                  : "/api/v1/crm/inventory/apartments",
                json(
                  item ? "PATCH" : "POST",
                  item
                    ? values
                    : {
                        ...values,
                        complex_id: Number(f.get("complex_id")),
                        price_uzs: Number(f.get("price_uzs")),
                      },
                ),
              );
            }
            await Promise.all([mutate(), refreshComplexes()]);
          }}
        >
          {edit.remove ? (
            <p>
              #{edit.item?.id} yozuvini butunlay o‘chirasizmi? Bog‘langan ariza
              yoki xonadonlar bo‘lsa, server o‘chirishni rad etadi.
            </p>
          ) : edit.kind === "complex" ? (
            <Field label="Majmua nomi">
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={(edit.item as Complex)?.name}
              />
            </Field>
          ) : (
            <>
              {edit.kind !== "price" && (
                <>
                  {!edit.item && (
                    <Field label="Majmua">
                      <select name="complex_id" required>
                        <option value="">Majmuani tanlang</option>
                        {complexes?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field label="Xonadon raqami">
                    <input
                      name="number"
                      required
                      maxLength={30}
                      defaultValue={(edit.item as Apartment)?.number}
                    />
                  </Field>
                  <Field label="Xonalar soni">
                    <input
                      name="rooms"
                      type="number"
                      min={1}
                      max={10}
                      required
                      defaultValue={(edit.item as Apartment)?.rooms}
                    />
                  </Field>
                </>
              )}
              {(!edit.item || edit.kind === "price") && (
                <Field label="Narx (so‘m)">
                  <input
                    name="price_uzs"
                    type="number"
                    min={1}
                    max={1e15}
                    step={1}
                    required
                    defaultValue={(edit.item as Apartment)?.price_uzs}
                  />
                </Field>
              )}
            </>
          )}
        </Editor>
      )}
    </>
  );
}
