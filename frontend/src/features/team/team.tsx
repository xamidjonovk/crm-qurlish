"use client";
import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { api, fetcher, json } from "@/lib/api";
import { type TeamUser, roles } from "@/lib/types";
import {
  PageTitle,
  Resource,
  Pagination,
  Badge,
  Editor,
  Field,
} from "@/components/ui";
export default function Team() {
  const [offset, setOffset] = useState(0);
  const [add, setAdd] = useState(false);
  const [target, setTarget] = useState<TeamUser | null>(null);
  const { data, error, isLoading, mutate } = useSWR<TeamUser[]>(
    `/api/v1/crm/users?limit=20&offset=${offset}`,
    fetcher,
  );
  return (
    <>
      <PageTitle
        title="Jamoa"
        description="Hamkasblaringiz va ularning kirish huquqlari."
        action={
          <button className="primary" onClick={() => setAdd(true)}>
            <Plus size={18} />
            Xodim qo‘shish
          </button>
        }
      />
      <section className="glass panel">
        <Resource
          loading={isLoading}
          error={error}
          empty={!data?.length}
          retry={mutate}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Xodim</th>
                  <th>Rol</th>
                  <th>Holat</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <strong>{x.username}</strong>
                      <small>Hisob #{x.id}</small>
                    </td>
                    <td>{roles[x.role]}</td>
                    <td>
                      <Badge
                        value={x.active ? "available" : "lost"}
                        label={x.active ? "Faol" : "Faol emas"}
                      />
                    </td>
                    <td>
                      {x.active && x.role !== "admin" && (
                        <button className="danger" onClick={() => setTarget(x)}>
                          Faolsizlantirish
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
      {add && (
        <Editor
          title="Yangi xodim"
          onClose={() => setAdd(false)}
          onSave={async (f) => {
            await api("/api/v1/crm/users", json("POST", Object.fromEntries(f)));
            await mutate();
          }}
        >
          <Field label="Foydalanuvchi nomi">
            <input
              name="username"
              pattern="[a-z0-9_.-]{3,80}"
              required
              autoComplete="off"
            />
            <small>Kamida 3 ta kichik lotin harfi, raqam yoki _ . -</small>
          </Field>
          <Field label="Parol">
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
            />
            <small>Kamida 12 ta belgi.</small>
          </Field>
          <Field label="Rol">
            <select name="role">
              <option value="seller">Sotuvchi</option>
              <option value="viewer">Kuzatuvchi</option>
            </select>
          </Field>
        </Editor>
      )}
      {target && (
        <Editor
          title="Hisobni faolsizlantirish"
          submit="Faolsizlantirish"
          onClose={() => setTarget(null)}
          onSave={async () => {
            await api(`/api/v1/crm/users/${target.id}/deactivate`, {
              method: "POST",
            });
            await mutate();
          }}
        >
          <p>
            {target.username} tizimga kira olmaydi. Uning mavjud sessiyalari ham
            bekor qilinadi.
          </p>
        </Editor>
      )}
    </>
  );
}
