import * as T from "three";
import type { Building } from "@/lib/types";
import { MeshKit, type Vec } from "./mesh-kit";

export type Site = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
};

/** Batched landscape elements, inspired by the generated business-class concept. */
export function buildLandscape(
  kit: MeshKit,
  site: Site,
  buildings: Building[],
) {
  const { minX, maxX, minZ, maxZ, cx, cz } = site;
  const sw = maxX - minX,
    sd = maxZ - minZ;
  const free = (x: number, z: number, margin = 1) =>
    !buildings.some((b) => {
      const a = (-b.rotation * Math.PI) / 180;
      const dx = x - b.x,
        dz = z - b.z;
      return (
        Math.abs(dx * Math.cos(a) + dz * Math.sin(a)) < b.width / 2 + margin &&
        Math.abs(-dx * Math.sin(a) + dz * Math.cos(a)) < b.depth / 2 + margin
      );
    });
  kit.role = "ground";
  kit.add("concrete", "#a8aaa1", [cx, -0.55, cz], [sw + 2000, 0.6, sd + 2000]);
  kit.add("stone", "#9d9b8d", [cx, -0.12, cz], [sw + 0.8, 0.3, sd + 0.8]);
  kit.add("paving", "#c3b69d", [cx, 0.08, cz], [sw, 0.12, sd]);
  kit.add("asphalt", "#333c3d", [cx, -0.1, maxZ + 6], [sw + 120, 0.16, 10]);
  for (let x = minX - 40; x < maxX + 40; x += 9)
    kit.add("concrete", "#d4ceba", [x, 0.002, maxZ + 7], [4, 0.008, 0.12]);
  kit.role = "site";

  function shrub(
    x: number,
    z: number,
    radius = 0.7,
    color = "#456039",
    base = 0.35,
  ) {
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4,
        r = Math.sqrt(i / 12) * radius;
      kit.add(
        "leaf",
        i % 3 ? color : "#69764a",
        [
          x + Math.cos(a) * r,
          base + 0.25 + (i % 3) * 0.09,
          z + Math.sin(a) * r,
        ],
        [radius * 0.45, 0.28, radius * 0.4],
        [0.1, a, 0],
        "leaf",
      );
    }
  }
  function tree(x: number, z: number, seed: number, scale = 1) {
    const h = (5 + Math.sin(seed * 7) * 0.55) * scale;
    kit.beam("bark", "#695341", [x, 0.2, z], [x + 0.1, h, z], 0.14 * scale);
    for (let branch = 0; branch < 6; branch++) {
      const angle = branch * 2.399 + seed,
        reach = (0.85 + (branch % 3) * 0.3) * scale;
      const bx = x + Math.cos(angle) * reach,
        bz = z + Math.sin(angle) * reach,
        by = h - 1 + (branch % 3) * 0.55;
      kit.beam("bark", "#716047", [x, h * 0.55, z], [bx, by, bz], 0.05 * scale);
      for (let l = 0; l < 26; l++) {
        const theta = l * 2.399,
          radius = Math.sqrt(l / 26) * scale;
        kit.add(
          "leaf",
          ["#344e28", "#526537", "#738049", "#405b30"][l % 4],
          [
            bx + Math.cos(theta) * radius,
            by + Math.sin(l * 1.7) * 0.7 * scale,
            bz + Math.sin(theta) * radius,
          ],
          [0.43 * scale, 0.14 * scale, 0.32 * scale],
          [l, theta, seed],
          "leaf",
        );
      }
    }
  }
  function bench(x: number, z: number, angle = 0) {
    const previous = kit.parent.clone();
    kit.parent = new T.Matrix4().makeRotationY(angle).setPosition(x, 0, z);
    kit.add(
      "stone",
      "#bfb298",
      [0, 0.4, 0],
      [2.8, 0.55, 0.7],
      [0, 0, 0],
      "round",
    );
    for (let i = 0; i < 5; i++)
      kit.add(
        "walnut",
        "#89613e",
        [0, 0.72, -0.28 + i * 0.14],
        [2.65, 0.09, 0.12],
      );
    kit.parent.copy(previous);
  }
  function pergola(x: number, z: number, turn: number) {
    kit.add(
      "walnut",
      "#9a7352",
      [x, 0.25, z],
      [2.8, 0.18, 2.8],
      [0, 0, 0],
      "cylinder",
    );
    kit.add(
      "metal",
      "#303835",
      [x, 3.1, z],
      [3, 0.18, 3],
      [0, 0, 0],
      "cylinder",
    );
    kit.add(
      "wood",
      "#c09c6c",
      [x, 2.99, z],
      [2.88, 0.04, 2.88],
      [0, 0, 0],
      "cylinder",
    );
    for (let i = 0; i < 27; i++) {
      const a = turn + 0.65 + i * ((Math.PI * 1.65) / 27);
      kit.add(
        "copper",
        "#a96d3d",
        [x + Math.sin(a) * 2.76, 1.65, z + Math.cos(a) * 2.76],
        [0.105, 2.8, 0.18],
        [0, a, 0],
      );
    }
    bench(x, z - 1.5);
    bench(x - 1.3, z + 0.1, Math.PI / 2);
    kit.add(
      "stone",
      "#a29880",
      [x + 0.3, 0.55, z + 0.25],
      [0.65, 0.5, 0.65],
      [0, 0, 0],
      "cylinder",
    );
  }

  // Raised garden islands keep the crossing paths open, with no cars in the courtyard.
  for (const x of [cx - 5.7, cx + 5.7])
    for (const z of [cz - 5.3, cz + 5.3]) {
      if (!free(x, z, 3)) continue;
      kit.add(
        "stone",
        "#a79d87",
        [x, 0.33, z],
        [2.8, 0.48, 3.4],
        [0, 0, 0],
        "cylinder",
      );
      kit.add(
        "grass",
        "#536440",
        [x, 0.59, z],
        [2.65, 0.035, 3.2],
        [0, 0, 0],
        "cylinder",
      );
      tree(x - 0.4, z, x + z, 1.3);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        shrub(
          x + Math.cos(a) * 1.9,
          z + Math.sin(a) * 2.35,
          0.62,
          i % 2 ? "#5c6943" : "#535d44",
          0.55,
        );
      }
      // Small flowering clusters with no added draw call per plant.
      for (let i = 0; i < 10; i++) {
        const a = i * 2.4;
        kit.add(
          "leaf",
          i % 2 ? "#b8b4a1" : "#7b7482",
          [x + Math.cos(a) * 2.2, 0.96, z + Math.sin(a) * 2.7],
          [0.15, 0.18, 0.15],
          [0, 0, 0],
          "leaf",
        );
      }
    }
  if (free(cx, cz, 9)) {
    kit.add(
      "concrete",
      "#a26248",
      [cx, 0.155, cz],
      [10, 12, 1],
      [-Math.PI / 2, 0, 0],
      "ring",
    );
  }
  for (const z of [cz - 15, cz + 15])
    if (free(cx, z, 3.2)) pergola(cx, z, z > cz ? Math.PI : 0);
  for (const x of [cx - 8.5, cx + 8.5])
    if (free(x, cz, 1)) bench(x, cz, Math.PI / 2);

  // Perimeter garden ribbon, pedestrian gate and four-sided railing.
  let seed = 1;
  for (let x = minX + 4; x < maxX - 3; x += 7)
    for (const z of [minZ + 2.5, maxZ - 2.5]) {
      if (z > cz && Math.abs(x - cx) < 5) continue;
      if (free(x, z, 0.8)) {
        tree(x, z, seed++, 1.2);
        shrub(x + 1.4, z, 0.9);
      }
    }
  for (let z = minZ + 9; z < maxZ - 5; z += 9)
    for (const x of [minX + 2.8, maxX - 2.8])
      if (free(x, z, 0.8)) {
        tree(x, z, seed++, 1.15);
        shrub(x, z + 2, 0.8);
      }
  for (let side = 0; side < 4; side++) {
    const wide = side % 2 === 0,
      length = wide ? sw : sd;
    const normal = new T.Vector3(
      Math.sin((side * Math.PI) / 2),
      0,
      Math.cos((side * Math.PI) / 2),
    );
    kit.parent = new T.Matrix4()
      .makeRotationY((side * Math.PI) / 2)
      .setPosition(cx + (normal.x * sw) / 2, 0, cz + (normal.z * sd) / 2);
    for (let p = -length / 2 + 1.2; p < length / 2; p += 2.4) {
      if (side === 0 && Math.abs(p) < 4) continue;
      kit.add("stone", "#a39a87", [p, 0.53, 0], [2.4, 0.85, 0.3]);
      kit.add("metal", "#303934", [p, 1.45, 0], [0.06, 2.1, 0.06]);
      kit.add("metal", "#303934", [p, 2.2, 0], [2.4, 0.06, 0.06]);
      for (let i = -2; i <= 2; i++)
        kit.add("metal", "#303934", [p + i * 0.4, 1.55, 0], [0.03, 1.3, 0.03]);
    }
  }
  kit.parent.identity();
  for (const sign of [-1, 1]) {
    kit.add(
      "copper",
      "#9c643e",
      [cx + sign * 3.25, 2.1, maxZ],
      [0.55, 4.2, 0.9],
    );
    kit.add(
      "light",
      "#ffe0b1",
      [cx + sign * 3.25, 1.9, maxZ + 0.46],
      [0.035, 1.6, 0.012],
    );
  }
  kit.add("copper", "#9c643e", [cx, 4.1, maxZ], [7, 0.4, 0.9]);
  for (const x of [cx - 2, cx + 2])
    for (let z = minZ + 4; z < maxZ - 2; z += 8)
      if (free(x, z, 0.4)) {
        kit.add("metal", "#2d3732", [x, 0.8, z], [0.13, 1.4, 0.13]);
        kit.add("light", "#ffe9c5", [x, 1.39, z], [0.14, 0.12, 0.14]);
      }
  // Compact muted play corner, only where the configured footprint leaves space.
  const px = minX + 8,
    pz = cz;
  if (free(px, pz, 4)) {
    kit.add(
      "concrete",
      "#a18b5e",
      [px, 0.17, pz],
      [3.2, 0.03, 3.2],
      [0, 0, 0],
      "cylinder",
    );
    for (const dx of [-1.1, 1.1])
      for (const dz of [-0.8, 0.8])
        kit.add("wood", "#9f7850", [px + dx, 1.25, pz + dz], [0.12, 2.2, 0.12]);
    kit.add("wood", "#b19668", [px, 1.4, pz], [2.2, 0.12, 1.6]);
    kit.add(
      "metal",
      "#b4ada0",
      [px, 0.95, pz + 1.8],
      [0.8, 0.12, 2.7],
      [0.35, 0, 0],
    );
  }
  for (let i = 0; i < Math.min(10, sw / 8); i++) {
    const x = minX + 5 + i * 7,
      z = maxZ + 3;
    kit.add(
      "metal",
      ["#b9b9ad", "#303b3f", "#646b68"][i % 3],
      [x, 0.65, z],
      [2, 0.8, 4.2],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "facadeGlass",
      "#26332f",
      [x, 1.18, z],
      [1.7, 0.65, 2.2],
      [0, 0, 0],
      "round",
    );
    for (const dx of [-0.96, 0.96])
      for (const dz of [-1.3, 1.3])
        kit.add(
          "metal",
          "#202526",
          [x + dx, 0.42, z + dz],
          [0.34, 0.18, 0.34],
          [0, 0, Math.PI / 2],
          "cylinder",
        );
  }
}
