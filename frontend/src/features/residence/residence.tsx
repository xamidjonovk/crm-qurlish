"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Compass,
  Expand,
  ImageIcon,
  Layers3,
  LayoutGrid,
  Maximize2,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  availability,
  money,
  type Apartment,
  type Building,
  type Complex,
  type Residence,
} from "@/lib/types";
import { Badge, Resource } from "@/components/ui";
import { useSession } from "@/features/auth/session";
import { ApartmentEditor, BuildingEditor } from "./editors";
import { FloorPlan } from "./floor-plan";
import { DesignPreview } from "./design-preview";
import {
  facadeNames,
  orderedUnits,
  overview,
  type Selection,
} from "./geometry";
import type { SceneCommand } from "./scene";
import "./residence.css";

const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => (
    <div className="res-scene-loading" role="status">
      <Layers3 size={28} />
      3D maket tayyorlanmoqda…
    </div>
  ),
});
type Edit =
  | { kind: "building"; item?: Building }
  | { kind: "apartment"; item?: Apartment };

function Media({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="res-media-empty">
      <strong>Rasm yuklanmadi</strong>
      <span>Rasm manzilini tekshiring.</span>
    </div>
  ) : (
    <a href={src} target="_blank" rel="noreferrer" className="res-media-link">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <span>
        <Expand size={14} /> Kattalashtirish
      </span>
    </a>
  );
}

export default function ResidenceExplorer({
  slug,
  onApply,
}: {
  slug?: string;
  onApply?: (apartment: Apartment) => void;
}) {
  const { user } = useSession();
  const admin = !slug && !!user?.permissions.includes("inventory:write");
  const [complexId, setComplexId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(overview);
  const [status, setStatus] = useState("");
  const [rooms, setRooms] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("plan");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [designPreview, setDesignPreview] = useState(false);
  const [command, setCommand] = useState<SceneCommand | null>(null);
  const listUrl = slug
    ? `/api/v1/companies/${encodeURIComponent(slug)}/majmualar`
    : "/api/v1/crm/residence/complexes";
  const {
    data: complexes,
    error: listError,
    isLoading: listLoading,
    mutate: refreshList,
  } = useSWR<Complex[]>(listUrl, (path: string) =>
    api<Complex[]>(path, {}, !slug),
  );
  const activeId =
    complexId ??
    complexes?.find((c) => c.name.includes("3D namuna"))?.id ??
    complexes?.[0]?.id;
  const path = activeId
    ? slug
      ? `/api/v1/companies/${encodeURIComponent(slug)}/residence/${activeId}`
      : `/api/v1/crm/residence/complexes/${activeId}`
    : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<Residence>(
    path,
    (p: string) => api<Residence>(p, {}, !slug),
    {
      refreshInterval: 15000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      dedupingInterval: 3000,
    },
  );
  const building = data?.buildings.find((b) => b.id === selection.buildingId);
  const apartment = data?.apartments.find(
    (a) => a.id === selection.apartmentId,
  );
  const units = useMemo(
    () => orderedUnits(data?.apartments || []),
    [data?.apartments],
  );
  const scoped = useMemo(
    () =>
      units.filter(
        (a) =>
          (!building || a.building_id === building.id) &&
          (!selection.floor || a.floor === selection.floor),
      ),
    [units, building, selection.floor],
  );
  const filtered = useMemo(
    () =>
      scoped.filter(
        (a) =>
          (!status || a.availability === status) &&
          (!rooms || a.rooms === Number(rooms)) &&
          (!query ||
            a.number.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
      ),
    [scoped, status, rooms, query],
  );
  const index = filtered.findIndex((a) => a.id === apartment?.id);
  const stats = useMemo(() => {
    const result = { available: 0, reserved: 0, sold: 0 };
    for (const a of data?.apartments || [])
      if (a.availability in result)
        result[a.availability as keyof typeof result]++;
    return result;
  }, [data?.apartments]);
  function chooseApartment(a: Apartment) {
    setSelection({
      buildingId: a.building_id,
      floor: a.building_id ? a.floor : null,
      apartmentId: a.id,
    });
  }
  function selectBuilding(id: number) {
    setSelection({ buildingId: id, floor: null, apartmentId: null });
  }
  function issue(action: SceneCommand["action"]) {
    setCommand((c) => ({ action, tick: (c?.tick ?? 0) + 1 }));
  }
  function opposite() {
    if (!building || !selection.floor) {
      issue("rotate");
      return;
    }
    const oppositeFacade = {
      front: "back",
      back: "front",
      left: "right",
      right: "left",
    } as const;
    const target = filtered.find(
      (a) => a.facade === oppositeFacade[apartment?.facade ?? "front"],
    );
    if (target) chooseApartment(target);
    else issue("rotate");
  }
  const refresh = async () => {
    await mutate();
  };
  return (
    <section
      className={`residence ${expanded ? "res-expanded" : ""}`}
      aria-label="3D turar joy katalogi"
      onKeyDown={(e) => {
        if (e.key === "Escape") setExpanded(false);
      }}
    >
      <header className="res-header">
        <div>
          <div className="res-title-line">
            <Layers3 size={23} />
            <h1>Majmua 3D</h1>
            <span className="res-live">
              <i />
              Jonli katalog
            </span>
          </div>
          <p>Manzildan xonadongacha. Har bir tafsilot ko‘z oldingizda.</p>
        </div>
        <div className="res-header-actions">
          <button
            className="res-design-trigger"
            onClick={() => setDesignPreview(true)}
          >
            <ImageIcon size={16} /> Dizayn konsepsiyasi
          </button>
          <select
            aria-label="3D majmua"
            value={activeId ?? ""}
            onChange={(e) => {
              setComplexId(Number(e.target.value));
              setSelection(overview);
              setQuery("");
              setStatus("");
              setRooms("");
            }}
          >
            {!complexes?.length && <option value="">Majmua tanlang</option>}
            {complexes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {admin && activeId && (
            <button onClick={() => setEdit({ kind: "building" })}>
              <Plus size={16} /> Bino qo‘shish
            </button>
          )}
          <button
            aria-label={expanded ? "Odatdagi ko‘rinish" : "Kengaytirish"}
            aria-pressed={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <X size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>
      <Resource
        loading={listLoading || isLoading}
        error={listError || (!data ? error : undefined)}
        empty={!complexes?.length}
        retry={() => {
          refreshList();
          mutate();
        }}
      >
        {data && (
          <>
            {error && (
              <p className="res-stale" role="alert">
                Yangilanish amalga oshmadi. Oxirgi ma’lumot ko‘rsatilmoqda.{" "}
                <button onClick={() => mutate()}>Qayta urinish</button>
              </p>
            )}
            <div className="res-summary">
              <nav aria-label="3D navigatsiya" className="res-breadcrumb">
                <button onClick={() => setSelection(overview)}>
                  <Building2 size={16} />
                  {data.complex.name}
                </button>
                {building && (
                  <>
                    <ChevronRight size={13} />
                    <button onClick={() => selectBuilding(building.id)}>
                      {building.name}
                    </button>
                  </>
                )}
                {selection.floor && (
                  <>
                    <ChevronRight size={13} />
                    <button
                      onClick={() =>
                        setSelection((s) => ({ ...s, apartmentId: null }))
                      }
                    >
                      {selection.floor}-qavat
                    </button>
                  </>
                )}
              </nav>
              <div className="res-legend">
                {Object.entries(stats).map(([k, n]) => (
                  <span key={k}>
                    <i className={k} />
                    {availability[k]} <b>{n}</b>
                  </span>
                ))}
              </div>
            </div>
            <div className="res-workbench">
              <div className="res-viewport">
                {data.buildings.length ? (
                  <Scene
                    data={data}
                    selection={selection}
                    command={command}
                    onPick={(p) => {
                      if (p.buildingId !== selection.buildingId)
                        selectBuilding(p.buildingId);
                      else if (p.floor !== selection.floor && p.floor)
                        setSelection({
                          buildingId: p.buildingId,
                          floor: p.floor,
                          apartmentId: null,
                        });
                      else if (p.apartmentId)
                        setSelection({
                          buildingId: p.buildingId,
                          floor: p.floor ?? null,
                          apartmentId: p.apartmentId,
                        });
                      else selectBuilding(p.buildingId);
                    }}
                  />
                ) : (
                  <div className="res-scene-loading">
                    <Building2 size={42} />
                    <h2>Majmuaning 3D maketini yarating</h2>
                    <p>
                      Bino qo‘shing, so‘ng mavjud xonadonlarni bino va
                      qavatlarga biriktiring.
                    </p>
                    {admin && (
                      <button
                        className="primary"
                        onClick={() => setEdit({ kind: "building" })}
                      >
                        Birinchi binoni qo‘shish
                      </button>
                    )}
                  </div>
                )}
                <div className="res-view-caption">
                  <span>
                    {apartment
                      ? `${apartment.number} · 3D interyer`
                      : building
                        ? building.name
                        : "Bosh reja"}
                  </span>
                  <small>
                    {apartment
                      ? "Devorlar ochilgan · interyer konsepsiyasi"
                      : selection.floor
                        ? `${selection.floor}-qavat kesimi`
                        : `${data.buildings.length} ta bino · yopiq hovli`}
                  </small>
                </div>
                {building && (
                  <div className="res-floor-rail" aria-label="Qavatlar">
                    <span>
                      <Layers3 size={15} />
                    </span>
                    <div>
                      {Array.from(
                        { length: building.floors },
                        (_, i) => building.floors - i,
                      ).map((f) => (
                        <button
                          key={f}
                          aria-label={`${f}-qavat`}
                          aria-pressed={selection.floor === f}
                          onClick={() =>
                            setSelection({
                              buildingId: building.id,
                              floor: f,
                              apartmentId: null,
                            })
                          }
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      aria-label="Barcha qavatlar"
                      onClick={() => selectBuilding(building.id)}
                    >
                      <Building2 size={15} />
                    </button>
                  </div>
                )}
                <div className="res-camera-tools">
                  {apartment && (
                    <>
                      <button
                        aria-label="Yuqoridan ko‘rish"
                        title="Yuqoridan ko‘rish"
                        onClick={() => issue("top")}
                      >
                        <Layers3 size={17} />
                      </button>
                      <button
                        aria-label="Interyerni aylantirish"
                        title="Interyerni aylantirish"
                        onClick={() => issue("rotate")}
                      >
                        <RotateCw size={17} />
                      </button>
                      <button
                        aria-label="Ko‘rinishni tiklash"
                        title="Ko‘rinishni tiklash"
                        onClick={() => issue("reset")}
                      >
                        <Maximize2 size={17} />
                      </button>
                    </>
                  )}
                  <button
                    aria-label="Umumiy ko‘rinish"
                    onClick={() => {
                      setSelection(overview);
                      issue("home");
                    }}
                  >
                    <LayoutGrid size={17} />
                  </button>
                  <button
                    aria-label="Yaqinlashtirish"
                    onClick={() => issue("zoomIn")}
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    aria-label="Uzoqlashtirish"
                    onClick={() => issue("zoomOut")}
                  >
                    <Minus size={18} />
                  </button>
                  <button aria-label="Narigi tomonga o‘tish" onClick={opposite}>
                    <RotateCw size={17} />
                  </button>
                </div>
                <div className="res-compass" title="Kamerani erkin aylantirish">
                  <Compass size={25} />
                  <span>360°</span>
                </div>
                <div className="res-view-bottom">
                  <span>
                    <MousePointer2 size={14} />
                    Aylantirish uchun torting · yaqinlashish uchun aylantiring
                  </span>
                  <span>
                    {apartment
                      ? "3D interyer konsepsiyasi"
                      : building
                        ? "Tanlangan bino"
                        : "3D maket"}
                  </span>
                </div>
              </div>
              <aside
                className="res-inspector"
                aria-label="Xonadon tafsilotlari"
              >
                {apartment ? (
                  <>
                    <div className="res-inspector-head">
                      <button
                        className="res-back"
                        onClick={() =>
                          setSelection((s) => ({ ...s, apartmentId: null }))
                        }
                      >
                        <ArrowLeft size={15} /> Xonadonlar
                      </button>
                      <Badge
                        value={apartment.availability}
                        label={
                          availability[apartment.availability] ||
                          apartment.availability
                        }
                      />
                    </div>
                    <div className="res-apartment-heading">
                      <h2>{apartment.number}</h2>
                      <span>
                        {building?.name || "Binoga biriktirilmagan"}
                        {apartment.building_id
                          ? ` / ${apartment.floor}-qavat`
                          : ""}
                      </span>
                    </div>
                    <div className="res-metrics">
                      <div>
                        <strong>{apartment.rooms}</strong>
                        <span>xona</span>
                      </div>
                      <div>
                        <strong>{apartment.area_m2 ?? "—"}</strong>
                        <span>m² maydon</span>
                      </div>
                      <div>
                        <strong>
                          {apartment.building_id ? apartment.floor : "—"}
                        </strong>
                        <span>qavat</span>
                      </div>
                    </div>
                    <div
                      className="res-media-tabs"
                      role="tablist"
                      aria-label="Xonadon ko‘rinishi"
                    >
                      <button
                        role="tab"
                        aria-selected={tab === "plan"}
                        onClick={() => setTab("plan")}
                      >
                        Planirovka
                      </button>
                      <button
                        role="tab"
                        aria-selected={tab === "interior"}
                        onClick={() => setTab("interior")}
                      >
                        Interyer
                      </button>
                    </div>
                    <div
                      role="tabpanel"
                      aria-label={tab === "plan" ? "Planirovka" : "Interyer"}
                    >
                      {tab === "plan" ? (
                        apartment.floor_plan_url ? (
                          <Media
                            key={apartment.floor_plan_url}
                            src={apartment.floor_plan_url}
                            alt={`${apartment.number} xonadon planirovkasi`}
                          />
                        ) : (
                          <FloorPlan apartment={apartment} />
                        )
                      ) : apartment.interior_url ? (
                        <Media
                          key={apartment.interior_url}
                          src={apartment.interior_url}
                          alt={`${apartment.number} xonadon interyer vizualizatsiyasi`}
                        />
                      ) : (
                        <div className="res-media-empty">
                          <Building2 size={30} />
                          <strong>Interyer rasmi kiritilmagan</strong>
                          <span>
                            {admin
                              ? "Tahrirlash orqali rasm manzilini kiriting."
                              : "Tafsilotlar uchun savdo bo‘limiga murojaat qiling."}
                          </span>
                        </div>
                      )}
                    </div>
                    {apartment.visualization_note && (
                      <p className="res-note">{apartment.visualization_note}</p>
                    )}
                    <div className="res-price">
                      <span>Xonadon narxi</span>
                      <strong>{money(apartment.price_uzs)}</strong>
                      {apartment.area_m2 && (
                        <small>
                          {money(
                            Math.round(apartment.price_uzs / apartment.area_m2),
                          )}{" "}
                          / m²
                        </small>
                      )}
                    </div>
                    {apartment.building_id && (
                      <div className="res-facing">
                        <span>{facadeNames[apartment.facade]}</span>
                        <button onClick={opposite}>
                          <RotateCw size={14} />
                          Narigi tomon
                        </button>
                      </div>
                    )}
                    {admin && (
                      <button
                        disabled={apartment.availability !== "available"}
                        onClick={() =>
                          setEdit({ kind: "apartment", item: apartment })
                        }
                      >
                        <Pencil size={15} />
                        Xonadonni tahrirlash
                      </button>
                    )}
                    {onApply && (
                      <button
                        className="primary"
                        disabled={
                          apartment.availability !== "available" || !!error
                        }
                        onClick={() => onApply(apartment)}
                      >
                        Ariza qoldirish <ArrowRight size={16} />
                      </button>
                    )}
                    <div className="res-unit-navigation">
                      <button
                        aria-label="Oldingi xonadon"
                        disabled={index <= 0}
                        onClick={() => chooseApartment(filtered[index - 1])}
                      >
                        <ArrowLeft size={17} />
                      </button>
                      <span>
                        {index >= 0
                          ? `${index + 1} / ${filtered.length}`
                          : "Filtrdan tashqarida"}
                      </span>
                      <button
                        aria-label="Keyingi xonadon"
                        disabled={index < 0 || index >= filtered.length - 1}
                        onClick={() => chooseApartment(filtered[index + 1])}
                      >
                        Keyingi <ArrowRight size={17} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="res-inspector-heading">
                      <div>
                        <span>
                          {building ? "Bino bo‘yicha" : "Majmua bo‘yicha"}
                        </span>
                        <h2>
                          {building
                            ? selection.floor
                              ? `${selection.floor}-qavat`
                              : building.name
                            : "Xonadon tanlang"}
                        </h2>
                      </div>
                      <Layers3 size={23} />
                    </div>
                    <p className="res-helper">
                      {building
                        ? "Qavat yoki xonadonni tanlab, uning tafsilotlarini oching."
                        : "Maketdagi binoni yoki quyidagi ro‘yxatdan xonadonni tanlang."}
                    </p>
                    <div className="res-filter-row">
                      <label className="res-search">
                        <Search size={16} />
                        <input
                          aria-label="Xonadon raqami bo‘yicha qidirish"
                          placeholder="Xonadon raqami…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="res-filter-row">
                      <select
                        aria-label="3D holat filtri"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">Barcha holatlar</option>
                        {Object.entries(availability).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="3D xonalar filtri"
                        value={rooms}
                        onChange={(e) => setRooms(e.target.value)}
                      >
                        <option value="">Xonalar</option>
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1} xona
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="res-list-title">
                      <span>{filtered.length} ta xonadon</span>
                      {admin && (
                        <button
                          onClick={() => setEdit({ kind: "apartment" })}
                          aria-label="3D xonadon qo‘shish"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                    <div className="res-unit-list">
                      {filtered.slice(0, 300).map((a) => (
                        <button
                          key={a.id}
                          className="res-unit-row"
                          onClick={() => chooseApartment(a)}
                        >
                          <i className={a.availability} />
                          <span>
                            <strong>{a.number}</strong>
                            <small>
                              {a.rooms} xona ·{" "}
                              {a.area_m2
                                ? `${a.area_m2} m²`
                                : "Maydon kiritilmagan"}
                            </small>
                          </span>
                          <span>
                            <small>
                              {a.building_id
                                ? `${a.floor}-qavat`
                                : "Biriktirilmagan"}
                            </small>
                            <small>{availability[a.availability]}</small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))}
                      {!filtered.length && (
                        <p className="res-empty">
                          Mos xonadon topilmadi. Filtrlarni o‘zgartiring yoki
                          xonadon qo‘shing.
                        </p>
                      )}
                      {filtered.length > 300 && (
                        <p className="res-note">
                          Dastlabki 300 ta xonadon. Bino, qavat yoki qidirish
                          orqali ro‘yxatni qisqartiring.
                        </p>
                      )}
                    </div>
                    {building && admin && (
                      <button
                        onClick={() =>
                          setEdit({ kind: "building", item: building })
                        }
                      >
                        <Pencil size={15} />
                        Bino parametrlarini tahrirlash
                      </button>
                    )}
                  </>
                )}
              </aside>
            </div>
            <div className="res-buildings" aria-label="Binolarni tanlash">
              <button
                className={`res-building-card res-all ${!building ? "selected" : ""}`}
                onClick={() => setSelection(overview)}
              >
                <LayoutGrid size={24} />
                <span>
                  <strong>Barcha binolar</strong>
                  <small>{data.apartments.length} ta xonadon</small>
                </span>
              </button>
              {data.buildings.map((b) => {
                const total = data.apartments.filter(
                    (a) => a.building_id === b.id,
                  ),
                  free = total.filter(
                    (a) => a.availability === "available",
                  ).length;
                return (
                  <button
                    key={b.id}
                    className={`res-building-card ${building?.id === b.id ? "selected" : ""}`}
                    aria-pressed={building?.id === b.id}
                    onClick={() => selectBuilding(b.id)}
                  >
                    <Building2 size={27} />
                    <span>
                      <strong>{b.name}</strong>
                      <small>
                        {b.floors} qavat · {free} ta bo‘sh
                      </small>
                    </span>
                    <div className="res-stock">
                      <span
                        style={{
                          width: `${total.length ? (free / total.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <footer className="res-footer">
              <span>
                Holatlar har 15 soniyada yangilanadi
                {isValidating ? " · yangilanmoqda…" : ""}
              </span>
              <button onClick={() => mutate()} disabled={isValidating}>
                <RefreshCw size={13} />
                Yangilash
              </button>
            </footer>
            {edit?.kind === "building" && (
              <BuildingEditor
                data={data}
                building={edit.item}
                onClose={() => setEdit(null)}
                onSaved={refresh}
              />
            )}
            {edit?.kind === "apartment" && (
              <ApartmentEditor
                data={data}
                apartment={edit.item}
                building={building}
                floor={selection.floor}
                onClose={() => setEdit(null)}
                onSaved={refresh}
              />
            )}
          </>
        )}
      </Resource>
      {designPreview && (
        <DesignPreview onClose={() => setDesignPreview(false)} />
      )}
    </section>
  );
}
