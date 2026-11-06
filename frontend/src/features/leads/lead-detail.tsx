"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Phone, X, Send } from "lucide-react";
import { api, fetcher, json } from "@/lib/api";
import { stages, type Lead } from "@/lib/types";
import { useSession } from "@/features/auth/session";
import "./pipeline.css";
type Note = { id: number; text: string; author_id: number; created_at: string };
export function LeadDetail({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { user } = useSession();
  const path = `/api/v1/crm/arizalar/${lead.id}/notes`;
  const { data, error: loadError, mutate } = useSWR<Note[]>(path, fetcher);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(path, json("POST", { text: text.trim() }));
      setText("");
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="lead-detail"
      aria-labelledby="lead-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <small>
            Ariza #{lead.id} · {stages[lead.stage]}
          </small>
          <h2 id="lead-detail-title">{lead.full_name}</h2>
        </div>
        <button aria-label="Yopish" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="lead-contact">
        {lead.source === "demo-dashboard-v1" ? (
          <span>Namuna raqam · qo‘ng‘iroq qilinmaydi</span>
        ) : (
          <a href={`tel:${lead.phone}`}>
            <Phone size={17} /> {lead.phone} · Qo‘ng‘iroq qilish
          </a>
        )}
        <span>Xonadon #{lead.apartment_id}</span>
      </div>
      <div className="lead-notes">
        <h3>Ichki aloqa tarixi</h3>
        <p>Eslatmalar faqat jamoa uchun ko‘rinadi; mijozga yuborilmaydi.</p>
        {loadError && <p role="alert">Eslatmalar yuklanmadi.</p>}
        {data?.length === 0 && <p>Hali eslatmalar yo‘q.</p>}
        {data?.map((note) => (
          <article key={note.id}>
            <p>{note.text}</p>
            <small>
              Xodim #{note.author_id} ·{" "}
              {new Date(note.created_at).toLocaleString("uz-UZ")}
            </small>
          </article>
        ))}
      </div>
      {user?.permissions.includes("leads:write") && (
        <form onSubmit={submit}>
          <label htmlFor="lead-note">Yangi eslatma</label>
          <textarea
            id="lead-note"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            required
            placeholder="Suhbat tafsilotlarini yozing…"
          />
          <button className="primary" disabled={busy || !text.trim()}>
            <Send size={15} /> Saqlash
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </dialog>
  );
}
