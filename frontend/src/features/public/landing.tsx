"use client";
import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { ArrowDownRight, ArrowUpRight, Building2, Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import "./landing.css";
const PublicCatalog = dynamic(() => import("./catalog"));

export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [catalog, setCatalog] = useState(false),
    [menu, setMenu] = useState(false);
  const { data: site, error } = useSWR<{ name: string; slug: string }>(
    "/api/v1/site",
    (p: string) => api<{ name: string; slug: string }>(p, {}, false),
  );
  const openCatalog = () => {
    setCatalog(true);
    setMenu(false);
    requestAnimationFrame(() =>
      document
        .getElementById("tanlash")
        ?.scrollIntoView({ behavior: "smooth" }),
    );
  };
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="landing-brand" href="#bosh">
          <Building2 size={25} />
          <span>
            {site?.name || "Qurilish"}
            <small>residence</small>
          </span>
        </a>
        <button
          className="landing-menu"
          aria-label={menu ? "Menyuni yopish" : "Menyuni ochish"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "open" : ""} aria-label="Sayt menyusi">
          <a href="#loyiha" onClick={() => setMenu(false)}>
            Loyiha
          </a>
          <a href="#afzalliklar" onClick={() => setMenu(false)}>
            Qulayliklar
          </a>
          <button onClick={openCatalog}>Xonadon tanlash</button>
          <button className="landing-login" onClick={onLogin}>
            Xodimlar uchun kirish <ArrowUpRight size={16} />
          </button>
        </nav>
      </header>
      <section className="landing-hero" id="bosh">
        <div className="landing-hero-image" />
        <div className="landing-hero-content">
          <span className="landing-kicker">Yangi hayot uchun yangi manzil</span>
          <h1>
            O‘zingizni
            <br />
            <em>uyda his qiling.</em>
          </h1>
          <p>
            Me’morchilik, tabiat va qulaylik birlashgan makonda o‘zingizga mos
            xonadonni kashf eting.
          </p>
          <button onClick={openCatalog}>
            Xonadon tanlash <ArrowDownRight size={19} />
          </button>
          <small>Arxitektura vizualizatsiyasi · loyiha konsepsiyasi</small>
        </div>
        <div className="landing-hero-side">Turar joy · 3D sayohat</div>
      </section>
      <section className="landing-intro" id="loyiha">
        <div>
          <span className="landing-kicker dark">
            Turar joyga yangicha qarash
          </span>
          <h2>Hayotning har bir lahzasi uchun o‘ylangan makon.</h2>
        </div>
        <div>
          <p>
            Zamonaviy arxitektura va ko‘kalamzor hovli uyga qaytishni yanada
            yoqimli qiladi. Majmuani 3D ko‘ring, qavat va xonadonlarni tanlang.
          </p>
          <button onClick={openCatalog}>
            Majmuani 3D ko‘rish <ArrowUpRight size={18} />
          </button>
        </div>
      </section>
      <section className="landing-features" id="afzalliklar">
        <div
          className="landing-feature-image"
          role="img"
          aria-label="Ko‘kalamzor hovli va zamonaviy binolar konsepsiyasi"
        />
        <div className="landing-feature-copy">
          <span className="landing-kicker">Siz uchun yaratilgan</span>
          <h2>Shahar ichida o‘z makoningiz.</h2>
          <p>
            Yashil hovli, sokin dam olish joylari va zamonaviy fasadlar yagona
            me’moriy g‘oyada.
          </p>
          <div className="landing-feature-lines">
            <span>Ko‘kalamzor ichki hovli</span>
            <span>Zamonaviy arxitektura</span>
            <span>Interaktiv xonadon tanlovi</span>
          </div>
        </div>
      </section>
      <section id="tanlash" className="landing-catalog">
        <div className="landing-catalog-heading">
          <div>
            <span className="landing-kicker dark">Interaktiv tanlov</span>
            <h2>O‘zingizga mos xonadonni toping.</h2>
          </div>
          <p>
            Bino, qavat va xonadonni tanlang. Ma’qul variant uchun murojaat
            qoldiring.
          </p>
        </div>
        <p className="landing-disclaimer">
          Ko‘rsatilgan majmua va narxlar namunaviy ma’lumotlar; aniq shartlarni
          menejer bilan tasdiqlang.
        </p>
        {error ? (
          <p role="alert">Katalog vaqtincha yuklanmadi. Sahifani yangilang.</p>
        ) : catalog && site ? (
          <PublicCatalog key={site.slug} initialSlug={site.slug} embedded />
        ) : (
          <button className="landing-choose" onClick={openCatalog}>
            3D katalogni ochish <ArrowUpRight size={18} />
          </button>
        )}
      </section>
      <footer className="landing-footer">
        <span>{site?.name || "Qurilish"} · Turar joy</span>
        <button onClick={onLogin}>Xodimlar uchun kirish</button>
      </footer>
    </div>
  );
}
