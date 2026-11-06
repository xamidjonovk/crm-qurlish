"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Building2, ShieldCheck } from "lucide-react";
import { useSession } from "./session";
export function Login({ onPublic }: { onPublic: () => void }) {
  const { login } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await login(String(f.get("username")), String(f.get("password")));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-scene">
      <section className="login-story">
        <div className="brand">
          <Building2 /> Qurilish<span>CRM</span>
        </div>
        <div>
          <h1>
            Savdoga aniqlik.
            <br />
            Jamoaga erkinlik.
          </h1>
          <p>
            Birinchi murojaatdan yakuniy sotuvgacha — barcha jarayon bir joyda.
          </p>
        </div>
        <div className="story-footer">
          <ShieldCheck size={20} /> Jamoangiz uchun yagona ish muhiti
        </div>
      </section>
      <section className="login-panel glass">
        <div className="login-heading">
          <span className="login-symbol">
            <Building2 size={26} />
          </span>
          <h2>Xush kelibsiz</h2>
          <p>Ishni davom ettirish uchun hisobingizga kiring.</p>
        </div>
        <form className="editor" onSubmit={submit}>
          <label className="field">
            Foydalanuvchi nomi
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            Parol
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Kirilmoqda…" : "Tizimga kirish"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <button className="text-button" onClick={onPublic}>
          Xonadonlar katalogini ko‘rish <ArrowUpRight size={16} />
        </button>
      </section>
    </main>
  );
}
