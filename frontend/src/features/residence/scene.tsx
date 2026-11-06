"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Residence } from "@/lib/types";
import {
  facadeSlots,
  FLOOR_HEIGHT,
  statusColors,
  unitLocation,
  type Selection,
} from "./geometry";
import { Materials } from "./materials";
import { buildExterior } from "./exterior";
import { buildInterior, type InteriorModel } from "./interior";
import type { Pick, Part } from "./mesh-kit";

export type SceneCommand = {
  action: "home" | "rotate" | "zoomIn" | "zoomOut" | "top" | "reset";
  tick: number;
};
type Props = {
  data: Residence;
  selection: Selection;
  command: SceneCommand | null;
  onPick: (pick: Pick) => void;
};
type Flight = {
  started: number;
  from: T.Spherical;
  to: T.Spherical;
  targetFrom: T.Vector3;
  targetTo: T.Vector3;
};

class ResidenceRenderer {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(40, 1, 0.06, 2500);
  controls: OrbitControls;
  materials: Materials;
  exterior: ReturnType<typeof buildExterior>;
  interior: InteriorModel | null = null;
  interiorKey = "";
  outdoor: T.WebGLRenderTarget;
  indoor: T.WebGLRenderTarget;
  composer: EffectComposer;
  ao: GTAOPass;
  output: OutputPass;
  sun = new T.DirectionalLight("#fff0d8", 3);
  fill = new T.HemisphereLight("#d8e4ed", "#8c8a7c", 0.65);
  labels: { id: number; element: HTMLButtonElement; point: T.Vector3 }[] = [];
  raycaster = new T.Raycaster();
  pointer = new T.Vector2();
  frame = 0;
  frames = 0;
  width = 1;
  height = 1;
  disposed = false;
  visible = true;
  selection: Selection = { buildingId: null, floor: null, apartmentId: null };
  scope = new T.Box3();
  animation: Flight | null = null;
  observer: ResizeObserver;
  visibility: IntersectionObserver;
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  down = { x: 0, y: 0 };
  hover: HTMLDivElement;
  hoverAt = 0;

  constructor(
    public host: HTMLDivElement,
    public data: Residence,
    public onPick: (pick: Pick) => void,
    public onFailure: () => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor("#dce2e2");
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = T.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.info.autoReset = false;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interaktiv 3D maket. Bino, qavat va xonadon tanlash uchun yon paneldan ham foydalaning.",
    );
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.materials = new Materials(
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const pmrem = new T.PMREMGenerator(this.renderer);
    const sky = new Sky();
    sky.scale.setScalar(1000);
    sky.material.uniforms.turbidity.value = 3;
    sky.material.uniforms.rayleigh.value = 1.6;
    sky.material.uniforms.sunPosition.value.set(-0.6, 0.8, 0.45);
    const skyScene = new T.Scene();
    skyScene.add(sky);
    this.outdoor = pmrem.fromScene(skyScene, 0.05);
    const room = new RoomEnvironment();
    this.indoor = pmrem.fromScene(room, 0.04);
    room.dispose();
    sky.geometry.dispose();
    sky.material.dispose();
    pmrem.dispose();
    this.scene.environment = this.outdoor.texture;
    this.scene.environmentIntensity = 0.65;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.11;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = 1.42;
    this.controls.addEventListener("change", this.invalidate);
    this.controls.addEventListener("start", this.interrupt);
    this.exterior = buildExterior(data, this.materials);
    this.scene.add(
      this.exterior.kit.root,
      this.sun,
      this.sun.target,
      this.fill,
    );
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00008;
    this.sun.shadow.normalBias = 0.025;
    this.composer = new EffectComposer(
      this.renderer,
      new T.WebGLRenderTarget(1, 1, {
        type: T.HalfFloatType,
        samples: 4,
      }),
    );
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, 512, 512);
    this.ao.updateGtaoMaterial({
      radius: 0.65,
      thickness: 1,
      distanceExponent: 2,
      samples: 8,
      screenSpaceRadius: false,
    });
    this.ao.updatePdMaterial({ radius: 4, samples: 8 });
    this.ao.blendIntensity = 0.7;
    this.composer.addPass(this.ao);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.hover = document.createElement("div");
    this.hover.className = "res-scene-tooltip";
    this.hover.hidden = true;
    host.appendChild(this.hover);
    for (const b of data.buildings) {
      const button = document.createElement("button");
      button.className = "res-building-label";
      button.textContent = b.name;
      button.setAttribute("aria-label", `${b.name}ni tanlash`);
      button.onclick = () => this.onPick({ buildingId: b.id });
      host.appendChild(button);
      this.labels.push({
        id: b.id,
        element: button,
        point: new T.Vector3(b.x, b.floors * FLOOR_HEIGHT + 3, b.z),
      });
    }
    this.resize(false);
    this.focus(this.selection, false);
    this.fit(new T.Vector3(0.9, 0.82, 1.2), false);
    host.addEventListener("pointerdown", this.pointerDown);
    host.addEventListener("pointerup", this.pointerUp);
    host.addEventListener("pointermove", this.pointerMove);
    host.addEventListener("pointerleave", this.pointerLeave);
    document.addEventListener("visibilitychange", this.documentVisibility);
    this.observer = new ResizeObserver(() => this.resize(true));
    this.observer.observe(host);
    this.visibility = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.invalidate();
    });
    this.visibility.observe(host);
  }

  resize(refit = true) {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h || (w === this.width && h === this.height)) return;
    const direction = this.camera.position.clone().sub(this.controls.target);
    this.width = w;
    this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.ao.setSize(Math.min(w, 1000), Math.min(h, 800));
    this.ao.enabled = w >= 560;
    if (refit && !this.scope.isEmpty())
      this.fit(
        direction.lengthSq() > 0 ? direction : new T.Vector3(1, 1, 1),
        false,
      );
    this.invalidate();
  }
  contextLost = (e: Event) => {
    e.preventDefault();
    this.onFailure();
  };
  documentVisibility = () => {
    if (!document.hidden) this.invalidate();
  };
  interrupt = () => {
    this.animation = null;
    this.invalidate();
  };
  invalidate = () => {
    if (!this.frame && !this.disposed && this.visible && !document.hidden)
      this.frame = requestAnimationFrame(this.render);
  };

  setLighting(bounds: T.Box3, interior: boolean) {
    const center = bounds.getCenter(new T.Vector3()),
      size = bounds.getSize(new T.Vector3());
    const range = Math.max(size.x, size.y, size.z) * 0.75 + 3;
    this.sun.position
      .copy(center)
      .add(
        new T.Vector3(
          -range * 0.65,
          range * (interior ? 1.6 : 1.2),
          range * 1.1,
        ),
      );
    this.sun.target.position.copy(center);
    Object.assign(this.sun.shadow.camera, {
      left: -range,
      right: range,
      top: range,
      bottom: -range,
      near: 0.1,
      far: range * 5,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.normalBias = interior ? 0.007 : 0.035;
    this.sun.intensity = interior ? 3 : 3.2;
    this.fill.intensity = interior ? 0.65 : 0.35;
    this.scene.environment = interior
      ? this.indoor.texture
      : this.outdoor.texture;
    this.scene.environmentIntensity = interior ? 0.45 : 0.18;
    this.renderer.toneMappingExposure = interior ? 0.92 : 0.82;
    this.renderer.setClearColor(interior ? "#e5e4df" : "#dce2e2");
    this.ao.updateGtaoMaterial({
      radius: interior ? 0.35 : 0.9,
      thickness: interior ? 0.6 : 2,
    });
    this.renderer.shadowMap.needsUpdate = true;
  }

  updateInventory(data: Residence) {
    this.data = data;
    const statuses = new Map(
      data.apartments.map((a) => [a.id, a.availability]),
    );
    for (const { mesh, parts } of this.exterior.kit.batches) {
      parts.forEach((p, i) => {
        if (p.statusMix === undefined || !p.pick?.apartmentId) return;
        p.color.set(
          statusColors[statuses.get(p.pick.apartmentId) || ""] || "#7a8b83",
        );
        if (p.statusMix) p.color.lerp(new T.Color("#334955"), p.statusMix);
        mesh.setColorAt(i, p.color);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const a = data.apartments.find((a) => a.id === this.selection.apartmentId);
    if (a && `${a.id}:${a.rooms}:${a.area_m2}` !== this.interiorKey)
      this.focus(this.selection, false);
    this.invalidate();
  }

  focus(selection: Selection, moveCamera = true) {
    this.selection = selection;
    const b = this.data.buildings.find((b) => b.id === selection.buildingId);
    const a = this.data.apartments.find((a) => a.id === selection.apartmentId);
    const zero = new T.Matrix4().makeScale(0, 0, 0);
    const visibleBuildings = new Set<number>();
    for (const { mesh, parts } of this.exterior.kit.batches) {
      let visible = false;
      parts.forEach((p, i) => {
        let show = !a && p.role !== "unit";
        if (!a && b) {
          show =
            p.role !== "unit" &&
            (p.pick?.buildingId === b.id ||
              (!selection.floor && p.role === "ground"));
          if (selection.floor)
            show =
              p.pick?.buildingId === b.id &&
              p.pick?.floor === selection.floor &&
              ["slab", "unit", "status"].includes(p.role);
        }
        mesh.setMatrixAt(i, show ? p.matrix : zero);
        if (show) {
          visible = true;
          if (p.pick) visibleBuildings.add(p.pick.buildingId);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = visible;
    }
    this.exterior.kit.root.visible = !a;
    this.host.dataset.visibleBuildings = [...visibleBuildings].join(",");
    this.host.dataset.occludingBuildings = b
      ? String([...visibleBuildings].filter((id) => id !== b.id).length)
      : "0";
    this.host.dataset.mode = a
      ? "interior"
      : selection.floor
        ? "floor"
        : b
          ? "building"
          : "overview";
    this.host.dataset.apartment = a ? String(a.id) : "";
    let angle = b ? (b.rotation * Math.PI) / 180 : 0;
    if (a) {
      const key = `${a.id}:${a.rooms}:${a.area_m2}`;
      if (this.interiorKey !== key) {
        this.interior?.dispose();
        this.interior = buildInterior(a, this.materials);
        this.interiorKey = key;
        this.scene.add(this.interior.root);
      }
      const model = this.interior!;
      model.root.visible = true;
      if (b) {
        const loc = unitLocation(
          b,
          a.floor,
          a.facade,
          a.position,
          facadeSlots(this.data.apartments, b)[a.facade],
        );
        angle = loc.angle;
        model.root.position.set(
          loc.world[0] - (Math.sin(angle) * model.layout.depth) / 2,
          0.7 + (a.floor - 1) * FLOOR_HEIGHT,
          loc.world[2] - (Math.cos(angle) * model.layout.depth) / 2,
        );
        model.root.rotation.y = angle;
      } else {
        model.root.position.set(0, 0.4, 0);
        model.root.rotation.y = 0;
      }
      model.root.updateMatrixWorld(true);
      this.scope.copy(model.bounds).applyMatrix4(model.root.matrixWorld);
      this.controls.minPolarAngle = 0.06;
      this.controls.maxPolarAngle = 1.12;
      this.host.dataset.furnishedRooms = String(model.layout.rooms.length);
    } else {
      if (this.interior) this.interior.root.visible = false;
      this.host.dataset.furnishedRooms = "0";
      if (b) {
        const low = selection.floor
          ? 0.7 + (selection.floor - 1) * FLOOR_HEIGHT
          : 0;
        const high = selection.floor
          ? low + FLOOR_HEIGHT
          : b.floors * FLOOR_HEIGHT + 2;
        const matrix = new T.Matrix4()
          .makeRotationY(angle)
          .setPosition(b.x, 0, b.z);
        this.scope
          .set(
            new T.Vector3(-b.width / 2 - 1.5, low, -b.depth / 2 - 1.5),
            new T.Vector3(b.width / 2 + 1.5, high, b.depth / 2 + 1.5),
          )
          .applyMatrix4(matrix);
      } else this.scope.copy(this.exterior.bounds);
      this.controls.minPolarAngle = 0.08;
      this.controls.maxPolarAngle = selection.floor ? 1.15 : 1.42;
    }
    this.setLighting(this.scope, !!a);
    if (moveCamera)
      this.fit(
        new T.Vector3(
          Math.sin(angle + 0.55),
          a ? 1.25 : selection.floor ? 1.3 : 0.85,
          Math.cos(angle + 0.55),
        ),
      );
    this.invalidate();
  }

  fit(direction: T.Vector3, animate = true) {
    const center = this.scope.getCenter(new T.Vector3());
    const half = this.scope.getSize(new T.Vector3()).multiplyScalar(0.5);
    const forward = direction.clone().normalize(),
      right = new T.Vector3()
        .crossVectors(new T.Vector3(0, 1, 0), forward)
        .normalize();
    const up = new T.Vector3().crossVectors(forward, right).normalize();
    const tanY = Math.tan(T.MathUtils.degToRad(this.camera.fov / 2)),
      tanX = tanY * this.camera.aspect;
    let distance = 1;
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1]) {
          const corner = new T.Vector3(x * half.x, y * half.y, z * half.z);
          distance = Math.max(
            distance,
            Math.abs(corner.dot(right)) / tanX + corner.dot(forward),
            Math.abs(corner.dot(up)) / tanY + corner.dot(forward),
          );
        }
    distance *= this.selection.apartmentId ? 1.17 : 1.12;
    this.controls.minDistance = Math.max(2.5, distance * 0.38);
    this.controls.maxDistance = distance * 2.3;
    this.move(
      center.clone().addScaledVector(forward, distance),
      center,
      animate,
    );
  }
  move(to: T.Vector3, target: T.Vector3, animate = true) {
    this.host.dataset.moving = "true";
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
    if (!animate || this.reduced.matches) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.animation = null;
    } else {
      const from = new T.Spherical().setFromVector3(
        this.camera.position.clone().sub(this.controls.target),
      );
      const end = new T.Spherical().setFromVector3(to.clone().sub(target));
      end.theta =
        from.theta +
        T.MathUtils.euclideanModulo(
          end.theta - from.theta + Math.PI,
          Math.PI * 2,
        ) -
        Math.PI;
      this.animation = {
        started: performance.now(),
        from,
        to: end,
        targetFrom: this.controls.target.clone(),
        targetTo: target,
      };
    }
    this.invalidate();
  }
  command(action: SceneCommand["action"]) {
    if (action === "home") {
      this.focus({ buildingId: null, floor: null, apartmentId: null });
      return;
    }
    if (action === "reset") {
      this.focus(this.selection);
      return;
    }
    if (action === "top") {
      this.fit(new T.Vector3(0.001, 1, 0.001));
      return;
    }
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (action === "rotate")
      offset.applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 2);
    else
      offset
        .multiplyScalar(action === "zoomIn" ? 0.8 : 1.25)
        .clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.move(
      this.controls.target.clone().add(offset),
      this.controls.target.clone(),
    );
  }

  render = (time: number) => {
    this.frame = 0;
    if (this.disposed || !this.visible || document.hidden) return;
    if (this.animation) {
      const a = this.animation,
        t = Math.min(1, (time - a.started) / 850),
        k = t * t * (3 - 2 * t);
      const spherical = new T.Spherical(
        T.MathUtils.lerp(a.from.radius, a.to.radius, k),
        T.MathUtils.lerp(a.from.phi, a.to.phi, k),
        T.MathUtils.lerp(a.from.theta, a.to.theta, k),
      );
      this.controls.target.lerpVectors(a.targetFrom, a.targetTo, k);
      this.camera.position
        .setFromSpherical(spherical)
        .add(this.controls.target);
      if (t === 1) this.animation = null;
      else this.invalidate();
    }
    this.controls.update();
    if (this.selection.buildingId || this.selection.apartmentId) {
      const target = this.controls.target
        .clone()
        .clamp(this.scope.min, this.scope.max);
      this.camera.position.add(target.clone().sub(this.controls.target));
      this.controls.target.copy(target);
    }
    if (this.interior?.root.visible) {
      const localCamera = this.interior.root.worldToLocal(
        this.camera.position.clone(),
      );
      for (const wall of this.interior.walls) {
        const show = localCamera.dot(wall.normal) < -0.25;
        if (wall.kit.root.visible !== show) {
          wall.kit.root.visible = show;
          this.renderer.shadowMap.needsUpdate = true;
        }
      }
      this.host.dataset.openWalls = String(
        this.interior.walls.filter((w) => !w.kit.root.visible).length,
      );
    } else this.host.dataset.openWalls = "0";
    this.renderer.info.reset();
    this.composer.render();
    this.frames++;
    this.host.dataset.frames = String(this.frames);
    this.host.dataset.drawCalls = String(this.renderer.info.render.calls);
    this.host.dataset.triangles = String(this.renderer.info.render.triangles);
    this.host.dataset.camera = this.camera.position
      .toArray()
      .map((v) => v.toFixed(2))
      .join(",");
    this.host.dataset.moving = String(!!this.animation);
    this.host.dataset.polar = this.controls.getPolarAngle().toFixed(3);
    const point = new T.Vector3();
    for (const label of this.labels) {
      point.copy(label.point).project(this.camera);
      label.element.hidden =
        !!this.selection.floor ||
        !!this.selection.apartmentId ||
        (!!this.selection.buildingId &&
          label.id !== this.selection.buildingId) ||
        point.z > 1 ||
        Math.abs(point.x) > 0.94 ||
        Math.abs(point.y) > 0.94;
      label.element.style.transform = `translate(-50%,-50%) translate(${(point.x * 0.5 + 0.5) * this.width}px,${(-point.y * 0.5 + 0.5) * this.height}px)`;
    }
  };
  hit(e: PointerEvent): Pick | undefined {
    if (this.selection.apartmentId || e.target !== this.renderer.domElement)
      return;
    const rect = this.host.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObjects(
      this.exterior.kit.batches
        .filter((b) => b.mesh.visible)
        .map((b) => b.mesh),
      false,
    )) {
      const part: Part | undefined =
        hit.object.userData.parts?.[hit.instanceId ?? -1];
      if (part?.pick)
        return {
          ...part.pick,
          floor: part.role === "roof" ? undefined : part.pick.floor,
        };
      if (part) return;
    }
  }
  pointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };
  pointerUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5)
      return;
    const hit = this.hit(e);
    if (hit) this.onPick(hit);
  };
  pointerMove = (e: PointerEvent) => {
    if (e.buttons || e.pointerType === "touch" || this.selection.apartmentId) {
      this.hover.hidden = true;
      return;
    }
    if (performance.now() - this.hoverAt < 40) return;
    this.hoverAt = performance.now();
    const hit = this.hit(e);
    this.host.style.cursor = hit ? "pointer" : "grab";
    this.hover.hidden = !hit;
    if (!hit) return;
    const b = this.data.buildings.find((b) => b.id === hit.buildingId),
      a = this.data.apartments.find((a) => a.id === hit.apartmentId);
    this.hover.textContent = a
      ? `${a.number} · ${a.rooms} xona · ${{ available: "Bo‘sh", reserved: "Bron", sold: "Sotilgan" }[a.availability] || a.availability}`
      : `${b?.name}${hit.floor ? ` · ${hit.floor}-qavat` : ""}`;
    const rect = this.host.getBoundingClientRect();
    this.hover.style.left = `${Math.max(8, Math.min(e.clientX - rect.left + 14, this.width - 220))}px`;
    this.hover.style.top = `${Math.max(8, e.clientY - rect.top - 38)}px`;
  };
  pointerLeave = () => {
    this.hover.hidden = true;
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.visibility.disconnect();
    this.controls.dispose();
    this.host.removeEventListener("pointerdown", this.pointerDown);
    this.host.removeEventListener("pointerup", this.pointerUp);
    this.host.removeEventListener("pointermove", this.pointerMove);
    this.host.removeEventListener("pointerleave", this.pointerLeave);
    document.removeEventListener("visibilitychange", this.documentVisibility);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.labels.forEach((l) => l.element.remove());
    this.hover.remove();
    this.exterior.kit.dispose();
    this.interior?.dispose();
    this.materials.dispose();
    this.outdoor.dispose();
    this.indoor.dispose();
    this.sun.dispose();
    this.ao.dispose();
    this.output.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export default function Scene({ data, selection, command, onPick }: Props) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<ResidenceRenderer | null>(null);
  const latest = useRef({ data, selection, onPick });
  latest.current = { data, selection, onPick };
  const key = useMemo(
    () =>
      JSON.stringify([
        data.buildings,
        data.apartments.map((a) => [
          a.id,
          a.building_id,
          a.floor,
          a.facade,
          a.position,
        ]),
      ]),
    [data],
  );
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const element = host.current!;
    let instance: ResidenceRenderer | null = null;
    try {
      instance = new ResidenceRenderer(
        element,
        latest.current.data,
        (p) => latest.current.onPick(p),
        () => setFailed(true),
      );
      engine.current = instance;
      instance.focus(latest.current.selection);
    } catch (error) {
      console.error("3D renderer initialization failed", error);
      setFailed(true);
    }
    return () => {
      instance?.dispose();
      engine.current = null;
      element.replaceChildren();
    };
  }, [key, retry]);
  useEffect(() => {
    engine.current?.updateInventory(data);
  }, [data]);
  useEffect(() => {
    engine.current?.focus(selection);
  }, [selection]);
  useEffect(() => {
    if (command) engine.current?.command(command.action);
  }, [command]);
  return (
    <>
      <div className="res-canvas" ref={host} data-testid="residence-canvas" />
      {failed && (
        <div className="res-webgl-fallback" role="alert">
          <strong>3D ko‘rinish ochilmadi</strong>
          <p>
            Brauzerda grafik tezlashtirishni yoqing. Bino, qavat va xonadonlarni
            yon paneldan tanlash davom etadi.
          </p>
          <button
            onClick={() => {
              setFailed(false);
              setRetry((v) => v + 1);
            }}
          >
            Qayta yuklash
          </button>
        </div>
      )}
    </>
  );
}
