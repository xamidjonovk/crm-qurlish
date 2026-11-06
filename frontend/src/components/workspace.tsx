"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  Building2,
  LayoutList,
  Users,
  History,
  Globe,
  LogOut,
  ShieldCheck,
  Activity,
  ArrowLeft,
  Layers3,
} from "lucide-react";
import { api } from "@/lib/api";
import { roles } from "@/lib/types";
import { useSession } from "@/features/auth/session";
import { Login } from "@/features/auth/login";
import Leads from "@/features/leads/leads";
const Catalog = dynamic(() => import("@/features/catalog/catalog"));
const Team = dynamic(() => import("@/features/team/team"));
const Audit = dynamic(() => import("@/features/audit/audit"));
const Public = dynamic(() => import("@/features/public/catalog"));
const Residence = dynamic(() => import("@/features/residence/residence"));
const items = [
  {
    key: "residence",
    label: "Majmua 3D",
    icon: Layers3,
    permission: "leads:read",
  },
  {
    key: "leads",
    label: "Arizalar",
    icon: LayoutList,
    permission: "leads:read",
  },
  {
    key: "catalog",
    label: "Xonadonlar",
    icon: Building2,
    permission: "inventory:write",
  },
  { key: "team", label: "Jamoa", icon: Users, permission: "users:manage" },
  {
    key: "audit",
    label: "Faoliyat tarixi",
    icon: History,
    permission: "audit:read",
  },
  { key: "public", label: "Ochiq katalog", icon: Globe },
];
export function Workspace() {
  const { user, loading, logout } = useSession();
  const [page, setPage] = useState("leads");
  const [publicMode, setPublicMode] = useState(false);
  const [error, setError] = useState("");
  const { data: health } = useSWR(
    user ? "/health" : null,
    (path: string) => api<{ status: string }>(path, {}, false),
    { refreshInterval: 60000 },
  );
  const { data: ready } = useSWR(
    user ? "/ready" : null,
    (path: string) => api<{ status: string }>(path, {}, false),
    { refreshInterval: 60000 },
  );
  if (loading)
    return (
      <div className="boot" role="status">
        Ish muhiti tayyorlanmoqda…
      </div>
    );
  if (!user) {
    return publicMode ? (
      <main className="public-main">
        <button onClick={() => setPublicMode(false)}>
          <ArrowLeft size={16} />
          Kirishga qaytish
        </button>
        <Public />
      </main>
    ) : (
      <Login onPublic={() => setPublicMode(true)} />
    );
  }
  const visible = items.filter(
    (x) => !x.permission || user.permissions.includes(x.permission),
  );
  const current = visible.find((x) => x.key === page) || visible[0];
  return (
    <div className="workspace">
      <aside className="sidebar glass">
        <div className="brand">
          <Building2 />
          Qurilish<span>CRM</span>
        </div>
        <div className="workspace-name">
          <span className="company-icon">Q</span>
          <div>
            <strong>Savdo boshqaruvi</strong>
            <small>Sizning ish muhitingiz</small>
          </div>
        </div>
        <nav aria-label="Asosiy menyu">
          {visible.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={current.key === key ? "active" : ""}
              aria-current={current.key === key ? "page" : undefined}
              onClick={() => setPage(key)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="connection">
            <span className={ready ? "live" : "offline"} />
            {ready
              ? "Baza ulangan"
              : health
                ? "Baza tekshirilmoqda"
                : "Server tekshirilmoqda"}
          </div>
          <ShieldCheck size={16} /> Ruxsatlar bilan himoyalangan
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Ish muhiti <span className="slash">/</span>{" "}
            <strong>{current.label}</strong>
          </span>
          <div className="account">
            <div className="avatar">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{user.username}</strong>
              <small>{roles[user.role]}</small>
            </div>
            <button
              aria-label="Chiqish"
              onClick={() => logout().catch((e) => setError(e.message))}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <div className="content">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {current.key === "leads" ? (
            <Leads />
          ) : current.key === "residence" ? (
            <Residence />
          ) : current.key === "catalog" ? (
            <Catalog />
          ) : current.key === "team" ? (
            <Team />
          ) : current.key === "audit" ? (
            <Audit />
          ) : (
            <Public />
          )}
          <footer className="workspace-footer">
            <span>
              <Activity size={14} /> Qurilish CRM
            </span>
            <button
              className="text-button"
              onClick={() => {
                if (confirm("Barcha qurilmalardagi sessiyalarni tugatasizmi?"))
                  logout(true).catch((e) => setError(e.message));
              }}
            >
              Barcha qurilmalardan chiqish
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
