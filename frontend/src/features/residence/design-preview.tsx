"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function DesignPreview({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="res-design-preview"
      aria-labelledby="res-design-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <header>
        <div>
          <h2 id="res-design-title">Business-class arxitektura</h2>
          <p>Mis fasadlar, klinker va ko‘kalamzor ichki hovli</p>
        </div>
        <button aria-label="Konsepsiyani yopish" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <img
        src="/assets/residence/business-class-exterior-v2.webp"
        alt="To‘rtta yetti qavatli bino: mis rangli fasad ramkalari, klinker, pergolalar va yashil hovli konsepsiyasi"
        width={1536}
        height={1024}
        decoding="async"
      />
      <footer>
        <span>
          4 bino · 7 qavat uchun AI dizayn konsepsiyasi. Sotuv holatlari
          interaktiv 3D maketda ko‘rsatiladi.
        </span>
        <a
          href="/assets/residence/business-class-exterior-v2.webp"
          target="_blank"
          rel="noreferrer"
        >
          To‘liq o‘lchamda ochish
        </a>
      </footer>
    </dialog>
  );
}
