import type { Apartment, Building } from "@/lib/types";

export const FLOOR_HEIGHT = 3.2;
export const statusColors: Record<string, string> = {
  available: "#42b888",
  reserved: "#e7ae48",
  sold: "#da6867",
};
export const facadeNames = {
  front: "Old tomon",
  right: "O‘ng tomon",
  back: "Orqa tomon",
  left: "Chap tomon",
};
export const facadeOrder = ["front", "right", "back", "left"] as const;
export type Selection = {
  buildingId: number | null;
  floor: number | null;
  apartmentId: number | null;
};
export const overview: Selection = {
  buildingId: null,
  floor: null,
  apartmentId: null,
};

export function facadeSlots(apartments: Apartment[], building: Building) {
  const slots = { front: 3, back: 3, left: 1, right: 1 };
  for (const a of apartments)
    if (a.building_id === building.id)
      slots[a.facade] = Math.max(slots[a.facade], a.position + 1);
  return slots;
}

export function unitLocation(
  building: Building,
  floor: number,
  facade: Apartment["facade"],
  position: number,
  slots: number,
) {
  const wide = facade === "front" || facade === "back";
  const span = wide ? building.width : building.depth;
  const step = (span - 2) / slots;
  const along = -span / 2 + 1 + step * (position + 0.5);
  const depth = (wide ? building.depth : building.width) / 2 + 0.22;
  const local: [number, number, number] =
    facade === "front"
      ? [along, 0, depth]
      : facade === "back"
        ? [-along, 0, -depth]
        : facade === "right"
          ? [depth, 0, -along]
          : [-depth, 0, along];
  local[1] = 0.8 + (floor - 0.5) * FLOOR_HEIGHT;
  const rotation = (building.rotation * Math.PI) / 180;
  const world: [number, number, number] = [
    building.x + local[0] * Math.cos(rotation) + local[2] * Math.sin(rotation),
    local[1],
    building.z - local[0] * Math.sin(rotation) + local[2] * Math.cos(rotation),
  ];
  const angle =
    rotation +
    { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 }[facade];
  return { local, world, angle, width: step * 0.76 };
}

export function orderedUnits(apartments: Apartment[]) {
  return [...apartments].sort(
    (a, b) =>
      a.floor - b.floor ||
      facadeOrder.indexOf(a.facade) - facadeOrder.indexOf(b.facade) ||
      a.position - b.position ||
      a.id - b.id,
  );
}
