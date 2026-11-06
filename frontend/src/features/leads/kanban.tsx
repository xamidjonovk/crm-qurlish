"use client";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Phone, RefreshCw } from "lucide-react";
import { api, fetcher, json } from "@/lib/api";
import { stages, type Lead } from "@/lib/types";
import { useSession } from "@/features/auth/session";
import { PageTitle } from "@/components/ui";
import { LeadDetail } from "./lead-detail";
import "./pipeline.css";
const transitions: Record<string, string[]> = {
  new: ["contacted", "lost"],
  contacted: ["viewing", "lost"],
  viewing: ["won", "lost"],
  won: [],
  lost: [],
};
const keys = ["new", "contacted", "viewing", "won", "lost"];
function Column({
  stage,
  refresh,
  epoch,
  canWrite,
  onOpen,
  onMove,
}: {
  stage: string;
  refresh: () => void;
  epoch: number;
  canWrite: boolean;
  onOpen: (l: Lead) => void;
  onMove: (l: Lead, s: string) => Promise<void>;
}) {
  const [offset, setOffset] = useState(0);
  const { data, error, isLoading, mutate } = useSWR<Lead[]>(
    `/api/v1/crm/arizalar?stage=${stage}&limit=50&offset=${offset}`,
    fetcher,
  );
  return (
    <section
      className={`kanban-column kanban-${stage}`}
      onDragOver={(e) => {
        if (canWrite) e.preventDefault();
      }}
      onDrop={async (e) => {
        e.preventDefault();
        try {
          const l = JSON.parse(
            e.dataTransfer.getData("application/json"),
          ) as Lead;
          await onMove(l, stage);
          await mutate();
          refresh();
        } catch {}
      }}
    >
      <header>
        <span className="kanban-dot" />
        <h2>{stages[stage]}</h2>
        <small>
          {data
            ? `${offset + data.length}${data.length === 50 ? "+" : ""}`
            : "…"}
        </small>
      </header>
      {isLoading && <p>Yuklanmoqda…</p>}
      {error && <button onClick={() => mutate()}>Qayta urinish</button>}
      {data?.length === 0 && (
        <p className="kanban-empty">Bu bosqichda murojaat yo‘q</p>
      )}
      {data?.map((l) => (
        <article
          key={`${l.id}-${epoch}`}
          draggable={canWrite && transitions[l.stage].length > 0}
          onDragStart={(e) =>
            e.dataTransfer.setData("application/json", JSON.stringify(l))
          }
        >
          <button className="kanban-name" onClick={() => onOpen(l)}>
            {l.full_name}
          </button>
          <span>
            Ariza #{l.id} · xonadon #{l.apartment_id}
          </span>
          <div>
            {l.source === "demo-dashboard-v1" ? (
              <span>Namuna raqam</span>
            ) : (
              <a href={`tel:${l.phone}`}>
                <Phone size={14} /> {l.phone}
              </a>
            )}
            {canWrite && transitions[l.stage].length > 0 && (
              <select
                aria-label={`${l.full_name} bosqichini o‘zgartirish`}
                value=""
                onChange={async (e) => {
                  if (e.target.value) {
                    await onMove(l, e.target.value);
                    await mutate();
                    refresh();
                  }
                }}
              >
                <option value="">Ko‘chirish</option>
                {transitions[l.stage].map((s) => (
                  <option value={s} key={s}>
                    {stages[s]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </article>
      ))}
      {(offset > 0 || data?.length === 50) && (
        <footer>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            Oldingi
          </button>
          <button
            disabled={(data?.length || 0) < 50}
            onClick={() => setOffset(offset + 50)}
          >
            Keyingi
          </button>
        </footer>
      )}
    </section>
  );
}
export default function Kanban() {
  const { user } = useSession();
  const { mutate: mutateAll } = useSWRConfig();
  const [detail, setDetail] = useState<Lead | null>(null),
    [error, setError] = useState(""),
    [epoch, setEpoch] = useState(0);
  const canWrite = !!user?.permissions.includes("leads:write");
  async function move(l: Lead, s: string) {
    setError("");
    if (l.stage === s) return;
    if (!transitions[l.stage]?.includes(s)) {
      setError("Bu bosqichga o‘tish mumkin emas.");
      return;
    }
    if (
      s === "won" &&
      !window.confirm(
        `${l.full_name} uchun sotuvni tasdiqlaysizmi? Xonadon sotilgan deb belgilanadi.`,
      )
    )
      return;
    try {
      await api(
        `/api/v1/crm/arizalar/${l.id}/${s === "won" ? "confirm-sale" : "stage"}`,
        json(s === "won" ? "POST" : "PATCH", {
          stage: s,
          expected_version: l.version,
        }),
      );
      await mutateAll(
        (key) =>
          typeof key === "string" &&
          key.startsWith("/api/v1/crm/arizalar?stage="),
        undefined,
        { revalidate: true },
      );
      setEpoch((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
      setEpoch((v) => v + 1);
    }
  }
  return (
    <>
      <PageTitle
        title="Savdo jarayoni"
        description="Murojaatlarni bosqichlar bo‘yicha kuzating va boshqaring."
      />
      <div className="kanban-toolbar">
        <p>Kartani torting yoki «Ko‘chirish» orqali bosqichni tanlang.</p>
        <button onClick={() => setEpoch((v) => v + 1)}>
          <RefreshCw size={15} /> Yangilash
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="kanban-board">
        {keys.map((s) => (
          <Column
            key={`${s}-${epoch}`}
            stage={s}
            epoch={epoch}
            refresh={() => {}}
            canWrite={canWrite}
            onOpen={setDetail}
            onMove={move}
          />
        ))}
      </div>
      {detail && <LeadDetail lead={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
