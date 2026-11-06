import * as T from "three";
import type { Residence } from "@/lib/types";
import {
  facadeSlots,
  FLOOR_HEIGHT,
  statusColors,
  unitLocation,
} from "./geometry";
import { Materials } from "./materials";
import { MeshKit } from "./mesh-kit";
import { buildLandscape } from "./landscape";

export function buildExterior(data: Residence, materials: Materials) {
  const kit = new MeshKit(materials);
  let minX = -40,
    maxX = 40,
    minZ = -35,
    maxZ = 35,
    maxH = 22;
  for (const b of data.buildings) {
    const r = Math.hypot(b.width, b.depth) / 2 + 6;
    minX = Math.min(minX, b.x - r);
    maxX = Math.max(maxX, b.x + r);
    minZ = Math.min(minZ, b.z - r);
    maxZ = Math.max(maxZ, b.z + r);
    maxH = Math.max(maxH, b.floors * FLOOR_HEIGHT);
  }
  const cx = (minX + maxX) / 2,
    cz = (minZ + maxZ) / 2;
  buildLandscape(kit, { minX, maxX, minZ, maxZ, cx, cz }, data.buildings);
  const copper = "#aa6838",
    limestone = "#c5b695",
    graphite = "#26302c";
  for (const b of data.buildings) {
    const rot = (b.rotation * Math.PI) / 180,
      h = b.floors * FLOOR_HEIGHT;
    const base = new T.Matrix4().makeRotationY(rot).setPosition(b.x, 0, b.z);
    // Retain the configured facade tint while grounding it in warm clinker masonry.
    const brick = new T.Color(b.color)
      .multiply(new T.Color("#a48a6e"))
      .getStyle();
    kit.parent = base.clone();
    kit.pick = { buildingId: b.id };
    kit.role = "slab";
    kit.add("stone", "#918a78", [0, 0.3, 0], [b.width + 1, 0.6, b.depth + 1]);
    const slots = facadeSlots(data.apartments, b);
    const units = new Map(
      data.apartments
        .filter((a) => a.building_id === b.id)
        .map((a) => [`${a.floor}:${a.facade}:${a.position}`, a]),
    );
    for (let f = 1; f <= b.floors; f++) {
      const y = 0.7 + (f - 0.5) * FLOOR_HEIGHT;
      kit.parent = base.clone();
      kit.pick = { buildingId: b.id, floor: f };
      kit.role = "wall";
      kit.add(
        "clinker",
        brick,
        [0, y, 0],
        [b.width - 0.35, FLOOR_HEIGHT - 0.04, b.depth - 0.35],
      );
      kit.role = "slab";
      kit.add(
        "stone",
        "#bcb29c",
        [0, y - 1.5, 0],
        [b.width + 0.1, 0.16, b.depth + 0.1],
      );
      for (const facade of ["front", "back", "left", "right"] as const) {
        for (let p = 0; p < slots[facade]; p++) {
          const a = units.get(`${f}:${facade}:${p}`),
            loc = unitLocation(b, f, facade, p, slots[facade]);
          kit.parent = base
            .clone()
            .multiply(
              new T.Matrix4()
                .makeRotationY(loc.angle - rot)
                .setPosition(...loc.local),
            );
          kit.pick = { buildingId: b.id, floor: f, apartmentId: a?.id };
          const w = loc.width,
            accent = slots[facade] === 1 || p % 3 === 1;
          if (a) {
            kit.role = "unit";
            const depth =
              (facade === "front" || facade === "back" ? b.depth : b.width) *
              0.43;
            kit.add(
              "stone",
              new T.Color(statusColors[a.availability] || "#6a8593")
                .lerp(new T.Color("#334955"), 0.4)
                .getStyle(),
              [0, -1.38, -depth / 2],
              [w + 0.35, 0.12, depth],
              [0, 0, 0],
              "box",
              { statusMix: 0.4 },
            );
          }
          // Recessed bays and tall frames create depth instead of stacked white balcony ribbons.
          kit.role = "window";
          kit.add("metal", "#242923", [0, 0, 0.06], [w + 0.24, 2.88, 0.16]);
          kit.add(
            "facadeGlass",
            p % 2 ? "#28332f" : "#1c2c2c",
            [0, 0.03, 0.17],
            [w - 0.38, 2.58, 0.05],
          );
          // Alternating interior blinds and lower spandrels give each bay a believable scale.
          for (const sign of [-1, 1]) {
            kit.add(
              "fabric",
              (p + f) % 3 ? "#a79c83" : "#807b69",
              [sign * w * 0.37, 0.05, 0.205],
              [w * 0.09, 2.5, 0.016],
            );
            kit.add(
              "metal",
              graphite,
              [sign * w * 0.23, 0.03, 0.22],
              [0.045, 2.66, 0.06],
            );
          }
          kit.add("metal", graphite, [0, 0.03, 0.23], [0.055, 2.68, 0.06]);
          kit.add(
            "facadeGlass",
            "#667069",
            [w * 0.17, 0.45, 0.21],
            [0.08, 1.5, 0.014],
          );
          kit.role = "wall";
          const finish = accent ? "copper" : "stone";
          for (const sign of [-1, 1]) {
            kit.add(
              finish,
              accent ? copper : limestone,
              [sign * (w / 2 + 0.24), 0, 0.34],
              [accent ? 0.48 : 0.38, FLOOR_HEIGHT, 0.7],
            );
            kit.add(
              "metal",
              "#4d493c",
              [sign * (w / 2 - 0.03), 0, 0.36],
              [0.055, 2.85, 0.4],
            );
          }
          // Copper portals span two stories; limestone frames cap the other bays.
          if (!accent || f % 2 === 0 || f === b.floors)
            kit.add(
              finish,
              accent ? copper : limestone,
              [0, 1.46, 0.34],
              [w + 0.9, accent ? 0.24 : 0.16, 0.72],
            );
          kit.role = "slab";
          kit.add("stone", "#8c8473", [0, -1.4, 0.32], [w + 0.1, 0.11, 0.85]);
          // Dark glass loggia rails remain within the vertical facade frame.
          kit.add(
            "facadeGlass",
            "#3b4036",
            [0, -0.92, 0.65],
            [w - 0.18, 0.82, 0.035],
          );
          kit.add("metal", graphite, [0, -0.49, 0.67], [w, 0.045, 0.045]);
          for (const x of [-w / 2, w / 2])
            kit.add("metal", graphite, [x, -0.93, 0.67], [0.04, 0.92, 0.04]);
          if (a) {
            kit.role = "status";
            kit.add(
              "status",
              statusColors[a.availability] || "#8c9e99",
              [0, -1.29, 0.7],
              [w - 0.04, 0.12, 0.035],
              [0, 0, 0],
              "box",
              { statusMix: 0 },
            );
          }
        }
      }
    }
    kit.parent = base.clone();
    kit.pick = { buildingId: b.id };
    kit.role = "roof";
    kit.add(
      "concrete",
      "#89877d",
      [0, h + 0.82, 0],
      [b.width + 0.4, 0.25, b.depth + 0.4],
    );
    kit.add(
      "stone",
      "#7e7e73",
      [0, h + 0.98, 0],
      [b.width - 0.6, 0.08, b.depth - 0.6],
    );
    for (const z of [-b.depth / 2, b.depth / 2]) {
      kit.add("stone", limestone, [0, h + 1.25, z], [b.width + 0.4, 0.65, 0.2]);
      kit.add(
        "copper",
        "#8d7657",
        [0, h + 1.6, z],
        [b.width + 0.5, 0.07, 0.26],
      );
      kit.add(
        "grass",
        "#516039",
        [0, h + 1.06, z - Math.sign(z) * 0.7],
        [b.width - 1.2, 0.08, 0.85],
      );
      for (let x = -b.width / 2 + 1.2; x < b.width / 2 - 0.6; x += 1.15)
        kit.add(
          "leaf",
          "#5d6944",
          [x, h + 1.32, z - Math.sign(z) * 0.7],
          [0.48, 0.29, 0.36],
          [0, x, 0],
          "leaf",
        );
    }
    for (const x of [-b.width / 2, b.width / 2]) {
      kit.add("stone", limestone, [x, h + 1.25, 0], [0.2, 0.65, b.depth]);
      kit.add("copper", "#8d7657", [x, h + 1.6, 0], [0.26, 0.07, b.depth]);
    }
    kit.add(
      "metal",
      "#66695f",
      [0, h + 1.25, -1.6],
      [Math.min(4, b.width * 0.4), 0.6, Math.min(2.4, b.depth * 0.3)],
    );
    for (let i = 0; i < 8; i++)
      kit.add(
        "metal",
        "#454c44",
        [-1.7 + i * 0.48, h + 1.65, -1.6],
        [0.07, 0.04, 2],
      );
    // Entry canopy is building-owned, so it also disappears in isolated floor views.
    kit.role = "wall";
    kit.add(
      "copper",
      "#9e653a",
      [0, 3.02, b.depth / 2 + 0.75],
      [Math.min(5, b.width * 0.5), 0.24, 2],
    );
    for (const sign of [-1, 1]) {
      kit.add(
        "copper",
        copper,
        [sign * Math.min(2.4, b.width * 0.23), 1.7, b.depth / 2 + 0.42],
        [0.22, 2.7, 0.5],
      );
      kit.add(
        "light",
        "#ffe3b1",
        [sign * Math.min(2.4, b.width * 0.23), 1.65, b.depth / 2 + 0.69],
        [0.025, 1.8, 0.01],
      );
    }
  }
  kit.finish();
  return {
    kit,
    bounds: new T.Box3(
      new T.Vector3(minX, 0, minZ),
      new T.Vector3(maxX, maxH + 2, maxZ),
    ),
    center: new T.Vector3(cx, maxH * 0.28, cz),
  };
}
