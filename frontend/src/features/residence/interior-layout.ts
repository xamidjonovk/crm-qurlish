import type { Apartment } from "@/lib/types";

export type Room = {
  kind: "living" | "kitchen" | "bedroom" | "bathroom";
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
};

/** A furnishing concept from inventory metadata, never a claim of an as-built plan. */
export function interiorLayout(
  apartment: Pick<Apartment, "rooms" | "area_m2">,
) {
  const area = Math.max(
    20,
    Math.min(300, apartment.area_m2 ?? 28 + apartment.rooms * 19),
  );
  const width = Math.sqrt(area * 1.24),
    depth = area / width;
  const split = apartment.rooms > 4 ? 0.43 : 0.56;
  const leftW = width * split,
    rightW = width - leftW;
  const bathD = Math.min(2.35, depth * 0.28),
    kitchenD = depth * 0.36;
  const rooms: Room[] = [
    {
      kind: "living",
      label: "Mehmonxona",
      x: -width / 2 + leftW / 2,
      z: kitchenD / 2,
      width: leftW,
      depth: depth - kitchenD,
    },
    {
      kind: "kitchen",
      label: "Oshxona",
      x: -width / 2 + leftW / 2,
      z: -depth / 2 + kitchenD / 2,
      width: leftW,
      depth: kitchenD,
    },
    {
      kind: "bathroom",
      label: "Hammom",
      x: width / 2 - rightW / 2,
      z: -depth / 2 + bathD / 2,
      width: rightW,
      depth: bathD,
    },
  ];
  const bedrooms = Math.max(1, Math.min(9, apartment.rooms - 1));
  const columns = bedrooms > 3 ? 2 : 1,
    rows = Math.ceil(bedrooms / columns);
  for (let i = 0; i < bedrooms; i++) {
    const w = rightW / columns,
      d = (depth - bathD) / rows;
    rooms.push({
      kind: "bedroom",
      label: apartment.rooms === 1 ? "Uyqu zonasi" : `Yotoqxona ${i + 1}`,
      x: -width / 2 + leftW + w * ((i % columns) + 0.5),
      z: -depth / 2 + bathD + d * (Math.floor(i / columns) + 0.5),
      width: w,
      depth: d,
    });
  }
  return {
    width,
    depth,
    rooms,
    splitX: -width / 2 + leftW,
    studio: apartment.rooms === 1,
  };
}
