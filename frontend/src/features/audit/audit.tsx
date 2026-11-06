"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { type Audit } from "@/lib/types";
import { PageTitle, Resource, Pagination } from "@/components/ui";
const actions: Record<string, string> = {
  "complex.created": "Majmua yaratildi",
  "complex.updated": "Majmua tahrirlandi",
  "complex.deleted": "Majmua o‘chirildi",
  "building.created": "Bino yaratildi",
  "building.updated": "Bino tahrirlandi",
  "building.deleted": "Bino o‘chirildi",
  "apartment.created": "Xonadon yaratildi",
  "apartment.updated": "Xonadon tahrirlandi",
  "apartment.deleted": "Xonadon o‘chirildi",
  "apartment.price_changed": "Xonadon narxi yangilandi",
  "user.created": "Xodim yaratildi",
  "user.deactivated": "Xodim faolsizlantirildi",
  "sale.confirmed": "Sotuv yakunlandi",
  "lead.stage.contacted": "Mijoz bilan bog‘lanildi",
  "lead.stage.viewing": "Ko‘rik belgilandi",
  "lead.stage.lost": "Ariza yopildi",
};
export default function AuditPage() {
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading, mutate } = useSWR<Audit[]>(
    `/api/v1/crm/audit?limit=20&offset=${offset}`,
    fetcher,
  );
  return (
    <>
      <PageTitle
        title="Faoliyat tarixi"
        description="Jamoa bajargan amallar va o‘zgarishlar jurnali."
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
                  <th>Amal</th>
                  <th>Xodim</th>
                  <th>Obyekt</th>
                  <th>Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <strong>{actions[x.action] || x.action}</strong>
                      <small>Hodisa #{x.id}</small>
                    </td>
                    <td>#{x.actor_id}</td>
                    <td>#{x.resource_id}</td>
                    <td>
                      {new Intl.DateTimeFormat("uz-UZ", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Tashkent",
                      }).format(new Date(x.created_at))}
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
    </>
  );
}
