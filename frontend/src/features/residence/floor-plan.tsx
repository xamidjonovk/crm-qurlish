import type { Apartment } from "@/lib/types";
import { interiorLayout } from "./interior-layout";

/** Both 2D and 3D use the same concept layout; an uploaded plan is shown separately. */
export function FloorPlan({ apartment }: { apartment: Apartment }) {
  const { width, depth, rooms } = interiorLayout(apartment);
  const scale = 280 / width,
    height = depth * scale;
  return (
    <div className="res-plan">
      <svg
        viewBox={`0 0 316 ${height + 40}`}
        role="img"
        aria-label={`${apartment.rooms} xonali xonadonning namunaviy sxemasi`}
      >
        <rect x="0" y="0" width="316" height={height + 40} fill="#f1f1e9" />
        <g transform="translate(18,18)">
          {rooms.map((room, i) => {
            const x = (room.x - room.width / 2 + width / 2) * scale,
              y = (room.z - room.depth / 2 + depth / 2) * scale;
            const w = room.width * scale,
              h = room.depth * scale;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={
                    room.kind === "bathroom"
                      ? "#d3dedb"
                      : room.kind === "kitchen"
                        ? "#d9d9cc"
                        : "#e3d6bc"
                  }
                  stroke="#717c70"
                  strokeWidth="1.5"
                />
                {room.kind === "bedroom" ? (
                  <>
                    <rect
                      x={x + w * 0.24}
                      y={y + h * 0.19}
                      width={w * 0.52}
                      height={h * 0.59}
                      rx="3"
                      fill="#fbf8ee"
                      stroke="#a69d88"
                    />
                    <rect
                      x={x + w * 0.25}
                      y={y + h * 0.43}
                      width={w * 0.5}
                      height={h * 0.33}
                      fill="#b9b5a1"
                    />
                    <rect
                      x={x + w * 0.29}
                      y={y + h * 0.24}
                      width={w * 0.18}
                      height={h * 0.1}
                      rx="2"
                      fill="white"
                    />
                    <rect
                      x={x + w * 0.53}
                      y={y + h * 0.24}
                      width={w * 0.18}
                      height={h * 0.1}
                      rx="2"
                      fill="white"
                    />
                  </>
                ) : room.kind === "living" ? (
                  <>
                    <rect
                      x={x + w * 0.12}
                      y={y + h * 0.2}
                      width={w * 0.76}
                      height={h * 0.58}
                      rx="3"
                      fill="#c8c5b6"
                    />
                    <rect
                      x={x + w * 0.19}
                      y={y + h * 0.66}
                      width={w * 0.62}
                      height={h * 0.2}
                      rx="4"
                      fill="#f1ede2"
                      stroke="#b3ad9b"
                    />
                    <ellipse
                      cx={x + w * 0.5}
                      cy={y + h * 0.48}
                      rx={w * 0.16}
                      ry={h * 0.1}
                      fill="#ece6d8"
                      stroke="#a69d88"
                    />
                  </>
                ) : room.kind === "kitchen" ? (
                  <>
                    <rect
                      x={x + 5}
                      y={y + 5}
                      width={w - 10}
                      height={h * 0.25}
                      fill="#b4a386"
                      stroke="#8e8d7e"
                    />
                    <rect
                      x={x + w * 0.29}
                      y={y + h * 0.54}
                      width={w * 0.42}
                      height={h * 0.21}
                      rx="2"
                      fill="#efece1"
                      stroke="#aaa493"
                    />
                  </>
                ) : (
                  <>
                    <rect
                      x={x + w * 0.62}
                      y={y + 5}
                      width={w * 0.3}
                      height={h * 0.55}
                      rx="3"
                      fill="#f4f5ed"
                      stroke="#a7b9b4"
                    />
                    <ellipse
                      cx={x + w * 0.28}
                      cy={y + h * 0.35}
                      rx={w * 0.12}
                      ry={h * 0.13}
                      fill="#f8f8ef"
                    />
                  </>
                )}
                <text
                  x={x + w / 2}
                  y={y + h - 6}
                  textAnchor="middle"
                  fontSize={Math.min(9, w / 9)}
                  fill="#45554f"
                >
                  {room.label}
                </text>
              </g>
            );
          })}
          <rect
            width="280"
            height={height}
            fill="none"
            stroke="#495c53"
            strokeWidth="3"
          />
        </g>
      </svg>
      <span>3D interyerga mos konsepsiya · aniq loyiha chizmasi emas</span>
    </div>
  );
}
