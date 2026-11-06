import * as T from "three";
import type { Apartment } from "@/lib/types";
import { interiorLayout, type Room } from "./interior-layout";
import { MeshKit, type Vec } from "./mesh-kit";
import type { Materials } from "./materials";

export type InteriorModel = ReturnType<typeof buildInterior>;

export function buildInterior(apartment: Apartment, materials: Materials) {
  const layout = interiorLayout(apartment),
    { width: w, depth: d } = layout;
  const kit = new MeshKit(materials),
    root = new T.Group();
  const walls: { kit: MeshKit; normal: T.Vector3 }[] = [];
  const cream = "#e8e2d5",
    oak = "#b79c76",
    graphite = "#343c3c",
    linen = "#dfd9ca";
  kit.add("concrete", "#69736e", [0, -0.18, 0], [w + 0.22, 0.34, d + 0.22]);
  // Individually jointed oak floorboards read at apartment scale rather than a stretched bitmap.
  for (let x = -w / 2 + 0.12; x < w / 2; x += 0.24) {
    const start = -d / 2 - (Math.round((x + w / 2) / 0.24) % 3) * 0.52;
    for (let z = start; z < d / 2; z += 1.56) {
      const from = Math.max(z, -d / 2),
        to = Math.min(z + 1.55, d / 2);
      if (to <= from) continue;
      kit.add(
        "wood",
        ["#bfa57e", "#b69b77", "#c7ad88", "#b9a080"][
          Math.abs(Math.round((x + z) * 7)) % 4
        ],
        [Math.min(x, w / 2 - 0.12), 0.015, (from + to) / 2],
        [0.235, 0.03, to - from],
      );
    }
  }
  const plant = (x: number, z: number, size = 1, base = 0.03) => {
    kit.add(
      "ceramic",
      "#c5bba7",
      [x, base + 0.24 * size, z],
      [0.21 * size, 0.46 * size, 0.21 * size],
      [0, 0, 0],
      "cone",
    );
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4,
        yy = base + (0.6 + i * 0.045) * size;
      const tx = x + Math.cos(angle) * 0.32 * size,
        tz = z + Math.sin(angle) * 0.32 * size;
      kit.beam(
        "leaf",
        "#506647",
        [x, base + 0.4 * size, z],
        [tx, yy, tz],
        0.012 * size,
      );
      kit.add(
        "leaf",
        i % 2 ? "#4b6449" : "#6a7c58",
        [tx, yy, tz],
        [0.18 * size, 0.045 * size, 0.29 * size],
        [0.3, angle, 0.3],
        "leaf",
      );
    }
  };
  function chair(x: number, z: number, angle = 0, scale = 1) {
    const previous = kit.parent.clone();
    kit.parent = new T.Matrix4().makeRotationY(angle).setPosition(x, 0, z);
    kit.add(
      "fabric",
      "#aaa38e",
      [0, 0.52 * scale, 0],
      [0.55 * scale, 0.15 * scale, 0.57 * scale],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "fabric",
      "#aaa38e",
      [0, 0.85 * scale, 0.23 * scale],
      [0.55 * scale, 0.65 * scale, 0.12 * scale],
      [-0.12, 0, 0],
      "round",
    );
    for (const dx of [-0.2, 0.2])
      for (const dz of [-0.2, 0.2])
        kit.beam(
          "metal",
          graphite,
          [dx * scale, 0.48 * scale, dz * scale],
          [dx * 1.2 * scale, 0.03, dz * 1.2 * scale],
          0.018 * scale,
        );
    kit.parent.copy(previous);
  }
  const living = layout.rooms.find((r) => r.kind === "living")!;
  const sx = living.x,
    sofaZ = d / 2 - 0.85,
    sofaW = Math.min(3.1, living.width - 0.75);
  const furnitureScale = Math.min(1, living.width / 4);
  kit.add(
    "rug",
    "#c7c2b2",
    [sx, 0.047, living.z + 0.18],
    [living.width - 0.45, 0.035, living.depth - 0.65],
  );
  kit.add(
    "walnut",
    "#665440",
    [sx, 0.2, sofaZ],
    [sofaW, 0.2, 0.95],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "fabric",
    linen,
    [sx, 0.48, sofaZ],
    [sofaW, 0.42, 0.95],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "fabric",
    linen,
    [sx, 0.86, sofaZ + 0.37],
    [sofaW, 0.72, 0.24],
    [-0.08, 0, 0],
    "round",
  );
  for (const side of [-1, 1])
    kit.add(
      "fabric",
      linen,
      [sx + side * (sofaW / 2 - 0.12), 0.7, sofaZ],
      [0.24, 0.53, 1],
      [0, 0, 0],
      "round",
    );
  for (let i = 0; i < 3; i++) {
    kit.add(
      "fabric",
      "#e2dcce",
      [sx + (i - 1) * sofaW * 0.285, 0.72, sofaZ - 0.05],
      [sofaW * 0.28, 0.13, 0.74],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "fabric",
      i === 1 ? "#8b9383" : "#b9ab92",
      [sx + (i - 1) * sofaW * 0.3, 0.98, sofaZ + 0.15],
      [0.49, 0.43, 0.16],
      [-0.25, 0, i === 1 ? 0.12 : -0.1],
      "round",
    );
  }
  const tableZ = sofaZ - 1.35;
  kit.add(
    "walnut",
    "#67543c",
    [sx, 0.25, tableZ],
    [0.62, 0.45, 0.42],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "marble",
    "#e0d8c8",
    [sx, 0.49, tableZ],
    [0.84, 0.09, 0.58],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "fabric",
    "#526361",
    [sx - 0.23, 0.56, tableZ],
    [0.34, 0.05, 0.24],
    [0, 0.2, 0],
  );
  kit.add(
    "ceramic",
    "#b4a286",
    [sx + 0.25, 0.62, tableZ + 0.08],
    [0.11, 0.19, 0.11],
    [0, 0, 0],
    "cone",
  );
  kit.add(
    "leaf",
    "#596e4d",
    [sx + 0.25, 0.8, tableZ + 0.08],
    [0.19, 0.17, 0.14],
    [0, 0.4, 0],
    "sphere",
  );
  chair(-w / 2 + 0.7, living.z - 0.2, -0.7, furnitureScale);
  const tvZ = living.z - living.depth / 2 + 0.28;
  kit.add(
    "walnut",
    "#795e43",
    [sx, 0.29, tvZ],
    [Math.min(2.8, sofaW), 0.48, 0.4],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "screen",
    "#ffffff",
    [sx, 1.03, tvZ],
    [Math.min(1.9, sofaW * 0.75), 1.03, 0.065],
    [0, 0, 0],
    "round",
  );
  kit.add("metal", graphite, [sx, 0.55, tvZ], [0.42, 0.08, 0.27]);
  plant(-w / 2 + 0.5, d / 2 - 0.45, 0.9);
  // Sculptural reading light, bulb and a thin stem.
  const lampX = sx + sofaW / 2 + 0.25;
  kit.add(
    "metal",
    "#665e4e",
    [lampX, 0.08, sofaZ + 0.2],
    [0.18, 0.07, 0.18],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "metal",
    "#665e4e",
    [lampX, 0.95, sofaZ + 0.2],
    [0.018, 1.8, 0.018],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "fabric",
    "#e0d3b9",
    [lampX, 1.87, sofaZ + 0.2],
    [0.27, 0.32, 0.27],
    [0, 0, 0],
    "cone",
  );
  kit.add(
    "light",
    "#fff1ce",
    [lampX, 1.7, sofaZ + 0.2],
    [0.2, 0.02, 0.2],
    [0, 0, 0],
    "cylinder",
  );
  const kitchen = layout.rooms.find((r) => r.kind === "kitchen")!;
  const kW = kitchen.width - 0.5,
    back = -d / 2 + 0.4;
  kit.add("walnut", "#84705a", [kitchen.x, 0.48, back], [kW, 0.88, 0.64]);
  kit.add("marble", "#dfdfd4", [kitchen.x, 0.95, back], [kW + 0.06, 0.07, 0.7]);
  kit.add(
    "marble",
    "#dfdfd4",
    [kitchen.x, 1.34, -d / 2 + 0.08],
    [kW, 0.72, 0.08],
  );
  const cabinetN = Math.max(3, Math.floor(kW / 0.6));
  for (let i = 0; i < cabinetN; i++) {
    const x = kitchen.x - kW / 2 + ((i + 0.5) * kW) / cabinetN;
    kit.add(
      "walnut",
      i % 2 ? "#88735d" : "#8e7961",
      [x, 0.5, back + 0.335],
      [kW / cabinetN - 0.025, 0.76, 0.045],
    );
    kit.add("metal", "#4f574f", [x, 0.8, back + 0.37], [0.25, 0.018, 0.025]);
    kit.add(
      "ceramic",
      "#c5c4b9",
      [x, 2.05, -d / 2 + 0.26],
      [kW / cabinetN - 0.025, 0.78, 0.44],
    );
  }
  kit.add(
    "light",
    "#fff4da",
    [kitchen.x, 1.64, -d / 2 + 0.42],
    [kW - 0.1, 0.025, 0.07],
  );
  kit.add(
    "screen",
    "#ffffff",
    [kitchen.x - 0.65, 0.998, back],
    [0.65, 0.02, 0.44],
  );
  for (const dx of [-0.18, 0.18])
    for (const dz of [-0.12, 0.12])
      kit.add(
        "metal",
        "#666d6d",
        [kitchen.x - 0.65 + dx, 1.012, back + dz],
        [0.09, 0.005, 0.09],
        [0, 0, 0],
        "cylinder",
      );
  kit.add(
    "metal",
    "#9da7a4",
    [kitchen.x + 0.6, 0.99, back],
    [0.52, 0.035, 0.4],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "metal",
    "#354347",
    [kitchen.x + 0.6, 1.18, back - 0.18],
    [0.022, 0.4, 0.022],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "metal",
    "#354347",
    [kitchen.x + 0.6, 1.37, back - 0.08],
    [0.022, 0.22, 0.022],
    [Math.PI / 2, 0, 0],
    "cylinder",
  );
  const islandZ = kitchen.z + kitchen.depth * 0.28;
  if (kitchen.depth > 2) {
    kit.add(
      "walnut",
      "#73604c",
      [kitchen.x, 0.46, islandZ],
      [Math.min(1.9, kW * 0.6), 0.87, 0.7],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "marble",
      "#e2e0d5",
      [kitchen.x, 0.94, islandZ],
      [Math.min(2.1, kW * 0.65), 0.08, 0.95],
      [0, 0, 0],
      "round",
    );
    for (const side of [-1, 1])
      chair(kitchen.x + side * 0.47, islandZ + 0.7, 0, 0.82);
    for (const side of [-1, 1]) {
      kit.add(
        "metal",
        "#3d4441",
        [kitchen.x + side * 0.5, 2.3, islandZ],
        [0.008, 0.8, 0.008],
        [0, 0, 0],
        "cylinder",
      );
      kit.add(
        "metal",
        "#998367",
        [kitchen.x + side * 0.5, 1.9, islandZ],
        [0.19, 0.18, 0.19],
        [0, 0, 0],
        "cone",
      );
      kit.add(
        "light",
        "#fff2d3",
        [kitchen.x + side * 0.5, 1.8, islandZ],
        [0.16, 0.025, 0.16],
        [0, 0, 0],
        "cylinder",
      );
    }
  }
  plant(kitchen.x + kW / 2 - 0.25, back, 0.35, 0.99);
  function bedroom(room: Room, index: number) {
    const bw = Math.min(1.75, room.width * 0.55),
      length = Math.min(2.1, room.depth * 0.62);
    const bx = room.x,
      bz = room.z + 0.1,
      scale = Math.min(1, room.width / 3, room.depth / 3);
    kit.add(
      "rug",
      index % 2 ? "#b4b5a5" : "#d1c8b5",
      [bx, 0.05, bz + 0.25],
      [
        Math.min(room.width - 0.3, bw + 0.85),
        0.03,
        Math.min(room.depth - 0.2, length + 0.6),
      ],
    );
    kit.add(
      "walnut",
      "#8c7254",
      [bx, 0.22, bz],
      [bw + 0.17, 0.3, length + 0.15],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "fabric",
      "#eeebe1",
      [bx, 0.44, bz],
      [bw, 0.29, length],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "fabric",
      index % 2 ? "#8e9a92" : "#c4b8a2",
      [bx, 0.615, bz + length * 0.18],
      [bw - 0.03, 0.1, length * 0.62],
      [0, 0, 0],
      "round",
    );
    kit.add(
      "fabric",
      "#b9ad96",
      [bx, 0.78, bz - length / 2],
      [bw + 0.2, 1.13, 0.12],
      [0, 0, 0],
      "round",
    );
    for (const side of [-1, 1]) {
      kit.add(
        "fabric",
        "#f4f0e5",
        [bx + side * bw * 0.23, 0.67, bz - length * 0.32],
        [bw * 0.4, 0.16, length * 0.23],
        [-0.1, 0, side * 0.07],
        "round",
      );
      kit.add(
        "walnut",
        "#987e5e",
        [bx + side * (bw / 2 + 0.31 * scale), 0.29, bz - length * 0.34],
        [0.46 * scale, 0.5, 0.43 * scale],
        [0, 0, 0],
        "round",
      );
      kit.add(
        "ceramic",
        "#c1b393",
        [bx + side * (bw / 2 + 0.31 * scale), 0.65, bz - length * 0.34],
        [0.11 * scale, 0.25, 0.11 * scale],
        [0, 0, 0],
        "cone",
      );
      kit.add(
        "fabric",
        "#e5ddc9",
        [bx + side * (bw / 2 + 0.31 * scale), 0.83, bz - length * 0.34],
        [0.17 * scale, 0.2, 0.17 * scale],
        [0, 0, 0],
        "cone",
      );
    }
    // Slim built-in storage stays below the cutaway sight line.
    const storageX = room.x + room.width / 2 - 0.25;
    kit.add(
      "walnut",
      "#aa967b",
      [storageX, 0.45, room.z],
      [0.4, 0.85, Math.min(1.4, room.depth - 0.35)],
    );
    for (let i = 0; i < 3; i++)
      kit.add(
        "ceramic",
        ["#7b8a7d", "#c9b38c", "#cfc9b6"][i],
        [storageX, 0.93 + i * 0.015, room.z + (i - 1) * 0.16],
        [0.15, 0.07, 0.12],
      );
  }
  let bedroomIndex = 0;
  for (const room of layout.rooms)
    if (room.kind === "bedroom") {
      bedroom(room, bedroomIndex++);
      if (!layout.studio) {
        const left = room.x - room.width / 2,
          rear = room.z - room.depth / 2;
        kit.add(
          "stone",
          cream,
          [left, 0.48, room.z - 0.32],
          [0.12, 0.92, Math.max(0.2, room.depth - 0.85)],
        );
        kit.add("stone", cream, [room.x, 0.48, rear], [room.width, 0.92, 0.12]);
        kit.add(
          "walnut",
          oak,
          [left, 0.08, room.z - 0.32],
          [0.14, 0.1, Math.max(0.2, room.depth - 0.85)],
        );
      }
    }
  const bath = layout.rooms.find((r) => r.kind === "bathroom")!;
  kit.add(
    "tile",
    "#b9beb7",
    [bath.x, 0.05, bath.z],
    [bath.width, 0.07, bath.depth],
  );
  kit.add(
    "stone",
    cream,
    [layout.splitX, 0.48, bath.z],
    [0.12, 0.92, bath.depth],
  );
  const showerX = w / 2 - 0.65,
    showerZ = -d / 2 + 0.7;
  kit.add(
    "ceramic",
    "#ebece6",
    [showerX, 0.12, showerZ],
    [1.12, 0.12, 1.22],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "clearGlass",
    "#b9d0cf",
    [showerX - 0.59, 1.12, showerZ],
    [0.03, 2, 1.2],
  );
  kit.add(
    "metal",
    "#4b5a5b",
    [showerX - 0.6, 2.13, showerZ],
    [0.025, 0.025, 1.24],
  );
  kit.add(
    "metal",
    "#536564",
    [showerX, 1.45, -d / 2 + 0.1],
    [0.022, 1.45, 0.022],
    [0, 0, 0],
    "cylinder",
  );
  kit.add(
    "metal",
    "#536564",
    [showerX, 2.15, -d / 2 + 0.35],
    [0.18, 0.025, 0.18],
    [0, 0, 0],
    "cylinder",
  );
  const sinkX = bath.x - bath.width / 2 + 0.65;
  kit.add(
    "walnut",
    "#85745b",
    [sinkX, 0.5, -d / 2 + 0.45],
    [0.9, 0.6, 0.57],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "ceramic",
    "#f1f0e7",
    [sinkX, 0.88, -d / 2 + 0.45],
    [0.68, 0.18, 0.44],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "glass",
    "#a9babb",
    [sinkX, 1.58, -d / 2 + 0.09],
    [0.72, 0.9, 0.03],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "ceramic",
    "#eceee8",
    [bath.x + 0.05, 0.3, bath.z + 0.35],
    [0.38, 0.5, 0.58],
    [0, 0, 0],
    "round",
  );
  kit.add(
    "ceramic",
    "#eceee8",
    [bath.x + 0.05, 0.64, bath.z + 0.1],
    [0.38, 0.45, 0.18],
    [0, 0, 0],
    "round",
  );
  kit.finish();
  root.add(kit.root);
  // Exterior walls are separate batches. Camera-facing walls disappear in every orbit direction.
  for (let side = 0; side < 4; side++) {
    const wall = new MeshKit(materials),
      wide = side % 2 === 0,
      span = wide ? w : d;
    const angle = (side * Math.PI) / 2,
      normal = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const position: Vec = [(normal.x * w) / 2, 0, (normal.z * d) / 2];
    wall.parent = new T.Matrix4().makeRotationY(angle).setPosition(...position);
    if (side === 0 || side === 1) {
      // Glazed facade with slim aluminum jambs and linen curtains.
      wall.add("stone", cream, [0, 0.16, 0], [span, 0.32, 0.16]);
      wall.add("stone", cream, [0, 2.63, 0], [span, 0.2, 0.16]);
      for (let x = -span / 2; x <= span / 2; x += span / 3)
        wall.add("metal", "#39494a", [x, 1.4, -0.02], [0.055, 2.5, 0.08]);
      wall.add(
        "clearGlass",
        "#a9c7cd",
        [0, 1.4, 0.01],
        [span - 0.1, 2.4, 0.02],
      );
      for (const sign of [-1, 1])
        for (let fold = 0; fold < 7; fold++)
          wall.add(
            "fabric",
            "#e1ddce",
            [sign * (span / 2 - 0.1 - fold * 0.065), 1.4, -0.15],
            [0.05, 2.38, 0.07],
            [0, 0, 0],
            "cylinder",
          );
    } else {
      wall.add("stone", cream, [0, 1.38, 0], [span, 2.76, 0.14]);
      wall.add("walnut", oak, [0, 0.1, -0.09], [span, 0.16, 0.025]);
      if (side === 3) {
        // Framed three-piece artwork on the living-room wall.
        for (let i = 0; i < 3; i++) {
          const x = -span * 0.18 + i * 0.63;
          wall.add("walnut", "#6d5d48", [x, 1.73, -0.1], [0.53, 0.84, 0.045]);
          wall.add(
            "fabric",
            ["#b4b9a7", "#c8b59a", "#7f8f86"][i],
            [x, 1.73, -0.129],
            [0.47, 0.78, 0.012],
          );
          wall.add(
            "fabric",
            "#dfd9c8",
            [x + 0.05, 1.7, -0.14],
            [0.16, 0.43, 0.008],
            [0, 0, 0.25],
          );
        }
      }
    }
    wall.finish();
    root.add(wall.root);
    walls.push({ kit: wall, normal });
  }
  root.name = "furnished-apartment-cutaway";
  return {
    root,
    kit,
    walls,
    layout,
    bounds: new T.Box3(
      new T.Vector3(-w / 2, -0.35, -d / 2),
      new T.Vector3(w / 2, 2.8, d / 2),
    ),
    dispose() {
      kit.dispose();
      walls.forEach((wall) => wall.kit.dispose());
      root.removeFromParent();
    },
  };
}
