import * as T from "three";

export type Finish =
  | "stone"
  | "clinker"
  | "paving"
  | "copper"
  | "facadeGlass"
  | "concrete"
  | "metal"
  | "glass"
  | "clearGlass"
  | "status"
  | "wood"
  | "walnut"
  | "fabric"
  | "rug"
  | "marble"
  | "tile"
  | "grass"
  | "asphalt"
  | "leaf"
  | "bark"
  | "ceramic"
  | "screen"
  | "light";

function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

/** Small, deterministic, locally generated material maps. No remote texture requests. */
export class Materials {
  textures: T.Texture[] = [];
  cache = new Map<Finish, T.MeshStandardMaterial>();
  constructor(private anisotropy: number) {}
  texture(kind: Finish) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const rand = random(kind.length * 531 + kind.charCodeAt(0));
    const image = ctx.createImageData(256, 256);
    const wood = kind === "wood" || kind === "walnut";
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        let value = 225 + rand() * 26;
        if (wood)
          value =
            195 +
            20 * Math.sin(x * 0.6 + Math.sin(y * 0.023) * 3) +
            rand() * 22;
        if (kind === "fabric" || kind === "rug")
          value =
            196 + (x % 3 === 0 ? 22 : 0) + (y % 3 === 0 ? 22 : 0) + rand() * 20;
        if (kind === "grass") value = 130 + rand() * 100;
        if (kind === "asphalt") value = 170 + rand() * 65;
        if (kind === "marble") {
          const vein = Math.abs(
            Math.sin(x * 0.018 + y * 0.009 + Math.sin(y * 0.025) * 0.45),
          );
          value = (vein < 0.035 ? 140 : vein < 0.08 ? 200 : 240) + rand() * 12;
        }
        const i = (y * 256 + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
        image.data[i + 3] = 255;
      }
    ctx.putImageData(image, 0, 0);
    if (kind === "clinker") {
      ctx.fillStyle = "#a9a49a";
      ctx.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 12; row++) {
        for (let col = -1; col < 5; col++) {
          const gray = Math.round(195 + rand() * 53);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          const x = col * 64 + (row % 2) * 32;
          ctx.fillRect(x + 1.5, row * 22 + 1, 61, 20);
          for (let n = 0; n < 45; n++) {
            ctx.fillStyle = `rgba(65,60,50,${rand() * 0.16})`;
            ctx.fillRect(x + rand() * 60, row * 22 + rand() * 19, 2, 1);
          }
        }
      }
    }
    if (kind === "paving") {
      ctx.strokeStyle = "#aaa99f";
      ctx.lineWidth = 1.2;
      for (let row = 0; row < 4; row++) {
        for (let col = -1; col < 3; col++) {
          ctx.strokeRect(col * 128 + (row % 2) * 64, row * 64, 128, 64);
        }
      }
    }
    if (wood) {
      ctx.strokeStyle = "#75654d";
      ctx.lineWidth = 0.8;
      for (let x = 0; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
        const y = ((x / 32) % 3) * 80;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 32, y);
        ctx.stroke();
      }
    }
    if (kind === "tile" || kind === "stone") {
      ctx.strokeStyle = "#b6b9b4";
      ctx.lineWidth = 1;
      for (let n = 0; n < 256; n += 64) {
        ctx.beginPath();
        ctx.moveTo(n, 0);
        ctx.lineTo(n, 256);
        ctx.moveTo(0, n);
        ctx.lineTo(256, n);
        ctx.stroke();
      }
    }
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = Math.min(this.anisotropy, 8);
    if (kind === "paving") map.repeat.set(18, 18);
    this.textures.push(map);
    return map;
  }
  get(name: Finish) {
    let material = this.cache.get(name);
    if (material) return material;
    material = new T.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.7,
      metalness: 0,
    });
    if (
      [
        "stone",
        "clinker",
        "paving",
        "concrete",
        "wood",
        "walnut",
        "fabric",
        "rug",
        "marble",
        "tile",
        "grass",
        "asphalt",
        "bark",
      ].includes(name)
    ) {
      const map = this.texture(name);
      material.map = map;
      material.bumpMap = map;
      material.bumpScale =
        name === "rug" ? 0.025 : name === "grass" ? 0.03 : 0.012;
    }
    if (name === "metal") {
      material.metalness = 0.45;
      material.roughness = 0.28;
    }
    if (name === "copper") {
      material.metalness = 0.35;
      material.roughness = 0.38;
      material.envMapIntensity = 0.2;
    }
    if (name === "facadeGlass") {
      material.metalness = 0.35;
      material.roughness = 0.12;
      material.envMapIntensity = 0.15;
    }
    if (name === "glass") {
      material.metalness = 0.22;
      material.roughness = 0.14;
      material.envMapIntensity = 0.65;
    }
    if (name === "clearGlass") {
      material.transparent = true;
      material.opacity = 0.2;
      material.depthWrite = false;
      material.roughness = 0.08;
      material.metalness = 0.18;
      material.side = T.DoubleSide;
    }
    if (name === "marble") {
      material.roughness = 0.24;
      material.metalness = 0.05;
    }
    if (name === "wood" || name === "walnut") material.roughness = 0.43;
    if (name === "ceramic") {
      material.roughness = 0.24;
      material.metalness = 0.08;
    }
    if (name === "fabric" || name === "rug" || name === "grass")
      material.roughness = 0.95;
    if (name === "leaf") {
      material.roughness = 0.86;
      material.side = T.DoubleSide;
    }
    if (name === "screen") {
      material.color.set("#18202a");
      material.roughness = 0.14;
      material.metalness = 0.3;
    }
    if (name === "light") {
      material.emissive.set("#ffe0b0");
      material.emissiveIntensity = 2;
    }
    if (name === "status") {
      material.roughness = 0.46;
      material.emissive.set("#ffffff");
      material.emissiveIntensity = 0.06;
    }
    this.cache.set(name, material);
    return material;
  }
  dispose() {
    this.cache.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
