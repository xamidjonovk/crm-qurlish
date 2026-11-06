"use client";

import { useState } from "react";
import { Editor, Field } from "@/components/ui";
import { api, json } from "@/lib/api";
import type { Apartment, Building, Residence } from "@/lib/types";
import { facadeNames } from "./geometry";

export function BuildingEditor({
  data,
  building,
  onClose,
  onSaved,
}: {
  data: Residence;
  building?: Building;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  return (
    <Editor
      title={building ? "Binoni tahrirlash" : "Bino qo‘shish"}
      onClose={onClose}
      onSave={async (f) => {
        const body = Object.fromEntries(
          ["floors", "x", "z", "rotation", "width", "depth"].map((k) => [
            k,
            Number(f.get(k)),
          ]),
        );
        await api(
          building
            ? `/api/v1/crm/residence/buildings/${building.id}`
            : `/api/v1/crm/residence/complexes/${data.complex.id}/buildings`,
          json(building ? "PUT" : "POST", {
            ...body,
            name: f.get("name"),
            color: f.get("color"),
          }),
        );
        await onSaved();
      }}
    >
      <Field label="Bino nomi">
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={building?.name}
          placeholder="A bino"
        />
      </Field>
      <div className="res-form-grid">
        <Field label="Qavatlar soni">
          <input
            name="floors"
            type="number"
            min={1}
            max={60}
            required
            defaultValue={building?.floors ?? 7}
          />
        </Field>
        <Field label="Fasad rangi">
          <input
            name="color"
            type="color"
            required
            defaultValue={building?.color ?? "#e5dfd2"}
          />
        </Field>
        <Field label="Eni (metr)">
          <input
            name="width"
            type="number"
            min={8}
            max={100}
            step="0.1"
            required
            defaultValue={building?.width ?? 22}
          />
        </Field>
        <Field label="Chuqurligi (metr)">
          <input
            name="depth"
            type="number"
            min={8}
            max={100}
            step="0.1"
            required
            defaultValue={building?.depth ?? 14}
          />
        </Field>
        <Field label="X joylashuv (metr)">
          <input
            name="x"
            type="number"
            min={-500}
            max={500}
            step="0.1"
            required
            defaultValue={building?.x ?? (data.buildings.length % 2 ? 21 : -21)}
          />
        </Field>
        <Field label="Z joylashuv (metr)">
          <input
            name="z"
            type="number"
            min={-500}
            max={500}
            step="0.1"
            required
            defaultValue={
              building?.z ?? Math.floor(data.buildings.length / 2) * 36 - 18
            }
          />
        </Field>
      </div>
      <Field label="Burilish (gradus)">
        <input
          name="rotation"
          type="number"
          min={-180}
          max={180}
          step="0.1"
          required
          defaultValue={building?.rotation ?? 0}
        />
      </Field>
      <p className="res-note">
        Joylashuv va o‘lchamlar 3D maketni belgilaydi. Binolar bir-birini
        to‘smasligi uchun ular orasida masofa qoldiring.
      </p>
    </Editor>
  );
}

export function ApartmentEditor({
  data,
  apartment,
  building,
  floor,
  onClose,
  onSaved,
}: {
  data: Residence;
  apartment?: Apartment;
  building?: Building;
  floor?: number | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [buildingId, setBuildingId] = useState(
    apartment?.building_id ?? building?.id ?? "",
  );
  const chosen = data.buildings.find((b) => b.id === Number(buildingId));
  return (
    <Editor
      title={apartment ? "Xonadon va 3D joylashuvi" : "Xonadon qo‘shish"}
      onClose={onClose}
      onSave={async (f) => {
        const body = {
          number: f.get("number"),
          rooms: Number(f.get("rooms")),
          building_id: buildingId ? Number(buildingId) : null,
          floor: Number(f.get("floor")),
          facade: f.get("facade"),
          position: Number(f.get("position")) - 1,
          area_m2: f.get("area_m2") ? Number(f.get("area_m2")) : null,
          interior_url: String(f.get("interior_url") || "").trim() || null,
          floor_plan_url: String(f.get("floor_plan_url") || "").trim() || null,
          visualization_note:
            String(f.get("visualization_note") || "").trim() || null,
          ...(!apartment
            ? {
                complex_id: data.complex.id,
                price_uzs: Number(f.get("price_uzs")),
              }
            : {}),
        };
        await api(
          `/api/v1/crm/catalog/apartments${apartment ? `/${apartment.id}` : ""}`,
          json(apartment ? "PATCH" : "POST", body),
        );
        await onSaved();
      }}
    >
      <div className="res-form-grid">
        <Field label="Xonadon raqami">
          <input
            name="number"
            required
            maxLength={30}
            defaultValue={apartment?.number}
          />
        </Field>
        <Field label="Xonalar soni">
          <input
            name="rooms"
            type="number"
            min={1}
            max={10}
            required
            defaultValue={apartment?.rooms ?? 2}
          />
        </Field>
        <Field label="Maydoni (m²)">
          <input
            name="area_m2"
            type="number"
            min={0.1}
            max={10000}
            step="0.1"
            defaultValue={apartment?.area_m2 ?? ""}
          />
        </Field>
        {!apartment && (
          <Field label="Narx (so‘m)">
            <input
              name="price_uzs"
              type="number"
              min={1}
              max={1e15}
              step={1}
              required
            />
          </Field>
        )}
      </div>
      <Field label="Bino">
        <select
          name="building_id"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
        >
          <option value="">Hali biriktirilmagan</option>
          {data.buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="res-form-grid">
        <Field label="Qavat">
          <input
            name="floor"
            type="number"
            min={1}
            max={chosen?.floors ?? 60}
            required
            defaultValue={apartment?.floor ?? floor ?? 1}
          />
        </Field>
        <Field label="Fasad">
          <select name="facade" defaultValue={apartment?.facade ?? "front"}>
            {Object.entries(facadeNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fasaddagi o‘rni">
          <input
            name="position"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={(apartment?.position ?? 0) + 1}
          />
        </Field>
      </div>
      <p className="res-note">
        O‘rin fasadga tashqaridan qaraganda chapdan o‘ngga sanaladi. Bir qavat
        va fasaddagi har bir o‘ringa bitta xonadon biriktiriladi.
      </p>
      <Field label="Interyer rasmi manzili">
        <input
          name="interior_url"
          maxLength={1000}
          defaultValue={apartment?.interior_url ?? ""}
          placeholder="https://… yoki /assets/…"
        />
      </Field>
      <Field label="Planirovka rasmi manzili">
        <input
          name="floor_plan_url"
          maxLength={1000}
          defaultValue={apartment?.floor_plan_url ?? ""}
          placeholder="https://… yoki /assets/…"
        />
      </Field>
      <Field label="Vizualizatsiya izohi">
        <input
          name="visualization_note"
          maxLength={300}
          defaultValue={apartment?.visualization_note ?? ""}
          placeholder="Masalan: dizayn namunasi, loyiha chizmasi…"
        />
      </Field>
    </Editor>
  );
}
