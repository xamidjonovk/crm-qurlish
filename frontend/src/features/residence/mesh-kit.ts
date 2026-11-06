import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Materials, type Finish } from "./materials";

export type Pick = { buildingId: number; floor?: number; apartmentId?: number };
export type Part = {
  matrix: T.Matrix4;
  color: T.Color;
  pick?: Pick;
  role:
    "site" | "ground" | "wall" | "slab" | "roof" | "window" | "status" | "unit";
  statusMix?: number;
};
export type Batch = { mesh: T.InstancedMesh; parts: Part[] };
export type Shape =
  "box" | "round" | "cylinder" | "cone" | "sphere" | "leaf" | "ring";
export type Vec = [number, number, number];

export class MeshKit {
  root = new T.Group();
  batches: Batch[] = [];
  geometries = new Map<Shape, T.BufferGeometry>();
  private pools = new Map<
    string,
    { shape: Shape; finish: Finish; parts: Part[] }
  >();
  parent = new T.Matrix4();
  pick?: Pick;
  role: Part["role"] = "site";
  private dummy = new T.Object3D();
  constructor(public materials: Materials) {}
  geometry(shape: Shape) {
    let geo = this.geometries.get(shape);
    if (geo) return geo;
    geo =
      shape === "ring"
        ? new T.RingGeometry(0.83, 1, 64)
        : shape === "round"
          ? new RoundedBoxGeometry(1, 1, 1, 2, 0.09)
          : shape === "cylinder"
            ? new T.CylinderGeometry(1, 1, 1, 24)
            : shape === "cone"
              ? new T.CylinderGeometry(0.55, 1, 1, 12)
              : shape === "sphere"
                ? new T.SphereGeometry(1, 16, 10)
                : shape === "leaf"
                  ? new T.SphereGeometry(1, 8, 4)
                  : new T.BoxGeometry(1, 1, 1);
    this.geometries.set(shape, geo);
    return geo;
  }
  add(
    finish: Finish,
    color: string,
    p: Vec,
    size: Vec,
    rotation: Vec = [0, 0, 0],
    shape: Shape = "box",
    extra: Partial<Part> = {},
  ) {
    const key = `${finish}:${shape}`;
    if (!this.pools.has(key)) this.pools.set(key, { shape, finish, parts: [] });
    this.dummy.position.set(...p);
    this.dummy.rotation.set(...rotation);
    this.dummy.scale.set(...size);
    this.dummy.updateMatrix();
    this.pools.get(key)!.parts.push({
      matrix: this.parent.clone().multiply(this.dummy.matrix),
      color: new T.Color(color),
      pick: this.pick ? { ...this.pick } : undefined,
      role: this.role,
      ...extra,
    });
  }
  beam(finish: Finish, color: string, start: Vec, end: Vec, radius: number) {
    const a = new T.Vector3(...start),
      b = new T.Vector3(...end),
      delta = b.clone().sub(a);
    const q = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.clone().normalize(),
    );
    const euler = new T.Euler().setFromQuaternion(q);
    this.add(
      finish,
      color,
      a.add(b).multiplyScalar(0.5).toArray() as Vec,
      [radius, delta.length(), radius],
      [euler.x, euler.y, euler.z],
      "cone",
    );
  }
  finish() {
    for (const pool of this.pools.values()) {
      const mesh = new T.InstancedMesh(
        this.geometry(pool.shape),
        this.materials.get(pool.finish),
        pool.parts.length,
      );
      for (let i = 0; i < pool.parts.length; i++) {
        mesh.setMatrixAt(i, pool.parts[i].matrix);
        mesh.setColorAt(i, pool.parts[i].color);
      }
      mesh.castShadow = pool.finish !== "light";
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.userData.parts = pool.parts;
      this.root.add(mesh);
      this.batches.push({ mesh, parts: pool.parts });
    }
    this.pools.clear();
    return this;
  }
  dispose() {
    this.batches.forEach((b) => b.mesh.dispose());
    this.geometries.forEach((g) => g.dispose());
    this.root.removeFromParent();
  }
}
