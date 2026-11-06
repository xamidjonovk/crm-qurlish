"use client";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { X, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Badge({ value, label }: { value: string; label: string }) {
  return <span className={`badge ${value}`}>{label}</span>;
}
export function Resource({
  loading,
  error,
  empty,
  children,
  retry,
}: {
  loading?: boolean;
  error?: Error;
  empty?: boolean;
  children: ReactNode;
  retry: () => unknown;
}) {
  if (error)
    return (
      <div className="empty error" role="alert">
        <h3>Ma’lumot yuklanmadi</h3>
        <p>{error.message}</p>
        <button onClick={retry}>
          <RefreshCw size={16} /> Qayta urinish
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="empty" role="status">
        Ma’lumotlar yuklanmoqda…
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        <h3>Hozircha yozuvlar yo‘q</h3>
        <p>Filtrlarni o‘zgartiring yoki yangi yozuv qo‘shing.</p>
      </div>
    );
  return children;
}
export function Pagination({
  offset,
  count,
  onChange,
}: {
  offset: number;
  count: number;
  onChange: (offset: number) => void;
}) {
  return (
    <footer className="pagination">
      <span>
        {count ? `${offset + 1}–${offset + count} ta yozuv` : "Yozuvlar tugadi"}
      </span>
      <div>
        <button
          aria-label="Oldingi sahifa"
          disabled={!offset}
          onClick={() => onChange(Math.max(0, offset - 20))}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          aria-label="Keyingi sahifa"
          disabled={count < 20}
          onClick={() => onChange(offset + 20)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </footer>
  );
}
export function Editor({
  title,
  children,
  onClose,
  onSave,
  submit = "Saqlash",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: (data: FormData) => Promise<unknown>;
  submit?: string;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(new FormData(e.currentTarget));
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button aria-label="Yopish" disabled={busy} onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <form className="editor" onSubmit={save}>
        {children}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Bekor qilish
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saqlanmoqda…" : submit}
          </button>
        </div>
      </form>
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const labelId = useId();
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {Children.map(children, (child) =>
        isValidElement<{ "aria-labelledby"?: string }>(child) &&
        ["input", "select", "textarea"].includes(String(child.type))
          ? cloneElement(child, { "aria-labelledby": labelId })
          : child,
      )}
    </label>
  );
}
