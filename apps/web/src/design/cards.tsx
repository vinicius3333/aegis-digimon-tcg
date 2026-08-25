import { cardImageUrls, getCardDefinition, type CardDefinition } from "@aegis/shared";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCardSleeve } from "./sleeve";
import { COLORS, colorKey, emblemFor, paletteFor, palettePairFor, sigilPaths } from "./theme";

/** True on hover-capable (desktop) pointers; false on touch/responsive devices. */
function useHoverZoomEnabled(): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return enabled;
}

/** Inline geometric sigil (emblem derived from the card id unless given). */
export function Sigil({
  cardId,
  emblem,
  color = "Neutral",
  size = 84,
  faded = false,
}: {
  cardId?: string;
  emblem?: string;
  color?: string;
  size?: number;
  faded?: boolean;
}) {
  const c = COLORS[colorKey(color)];
  const body = sigilPaths(emblem ?? (cardId ? emblemFor(cardId) : "sigil"));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ color: c.base, opacity: faded ? 0.5 : 1, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

/** Level pips — filled dots up to level, hollow remainder (max 6). */
export function LevelPips({ level, color }: { level?: number; color: string }) {
  if (!level) return null;
  const c = COLORS[colorKey(color)];
  const dots = [];
  for (let i = 1; i <= 6; i += 1) {
    dots.push(
      <span
        key={i}
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: i <= level ? c.base : "transparent",
          border: `1px solid ${i <= level ? c.base : "rgba(120,130,150,0.4)"}`,
        }}
      />,
    );
  }
  return <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>{dots}</span>;
}

/** Card back — a faceted shield over a muted field (security / opponent cards). */
export function CardBack({
  width = 70,
  label,
  useSelectedSleeve = true,
}: {
  width?: number;
  label?: number | string;
  useSelectedSleeve?: boolean;
}) {
  const h = Math.round(width * 1.4);
  const selectedSleeve = useCardSleeve();
  const sleeve = useSelectedSleeve ? selectedSleeve : { src: null };
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: Math.max(6, width * 0.07),
        background: sleeve.src ? "#0b1020" : "linear-gradient(150deg, var(--ds-surface-muted), var(--ds-surface))",
        border: "1px solid var(--ds-border-strong)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {sleeve.src ? (
        <img
          src={sleeve.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
        />
      ) : (
        <svg
          width={width * 0.5}
          height={width * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ds-primary)"
          strokeWidth={1.4}
          style={{ opacity: 0.85 }}
        >
          <polygon points="12 2 21.5 7 21.5 17 12 22 2.5 17 2.5 7" />
          <polygon points="12 7 17 9.5 17 14.5 12 17 7 14.5 7 9.5" fill="var(--ds-primary)" opacity="0.25" />
        </svg>
      )}
      {label != null ? (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            right: 4,
            minWidth: Math.max(16, width * 0.25),
            padding: "1px 4px",
            borderRadius: 99,
            background: "rgb(8 15 30 / 82%)",
            color: "#fff",
            textAlign: "center",
            fontFamily: "var(--ds-font-mono)",
            fontSize: Math.max(9, width * 0.16),
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

const ZOOM_W = 380;
const ZOOM_H = Math.round(ZOOM_W * 1.4);
const ZOOM_GAP = 14;

/** Fixed-position large card image rendered into document.body via portal. */
function CardZoomPreview({
  cardId,
  x,
  y,
  fallbackIndex,
}: {
  cardId: string;
  x: number;
  y: number;
  fallbackIndex: number;
}) {
  const def = getCardDefinition(cardId);
  const urls = cardImageUrls(def?.imageId ?? cardId);
  const [extra, setExtra] = useState(0);
  const idx = fallbackIndex + extra;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = x + ZOOM_GAP + ZOOM_W > vw ? x - ZOOM_GAP - ZOOM_W : x + ZOOM_GAP;
  const top = Math.max(ZOOM_GAP, Math.min(y - ZOOM_H / 2, vh - ZOOM_H - ZOOM_GAP));

  return createPortal(
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: ZOOM_W,
        height: ZOOM_H,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 30px 70px rgba(15,23,42,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
        zIndex: 9999,
        pointerEvents: "none",
        animation: "aegis-pop 120ms ease-out",
      }}
    >
      {idx >= urls.length ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "var(--ds-surface-muted)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Sigil cardId={cardId} color={colorKey(def?.colors[0])} size={ZOOM_W * 0.5} />
        </div>
      ) : (
        <img
          src={urls[idx]}
          alt={def?.nameEn}
          onError={() => setExtra((e) => e + 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      )}
    </div>,
    document.body,
  );
}

/** Full card (≈200×280 baseline; scale via `width`). For grids and detail. */
export function CardFull({
  cardId,
  width = 200,
  selected = false,
  dim = false,
  onClick,
  count,
  zoomOnHover = true,
}: {
  cardId: string;
  width?: number;
  selected?: boolean;
  dim?: boolean;
  onClick?: () => void;
  count?: number;
  /**
   * Show the floating preview under the pointer. Off on the match screen, where a
   * card is inspected by clicking it rather than by growing under the cursor.
   */
  zoomOnHover?: boolean;
}) {
  const def = getCardDefinition(cardId);
  const urls = cardImageUrls(def?.imageId ?? cardId);
  const [urlIndex, setUrlIndex] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const zoomEnabled = useHoverZoomEnabled();
  if (!def) return <CardBack width={width} label={cardId} />;
  const c = paletteFor(def.colors);
  const key = colorKey(def.colors[0]);
  const h = Math.round(width * 1.4);

  return (
    <div
      onClick={onClick}
      onMouseMove={zoomEnabled && zoomOnHover ? (e) => setMousePos({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseLeave={zoomEnabled && zoomOnHover ? () => setMousePos(null) : undefined}
      style={{
        position: "relative",
        width,
        height: h,
        borderRadius: 10,
        border: `2px solid ${selected ? "var(--ds-primary)" : c.edge}`,
        boxShadow: selected ? "0 0 0 3px var(--ds-primary-light), var(--ds-shadow-md)" : "var(--ds-shadow-sm)",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        opacity: dim ? 0.4 : 1,
        transition: "box-shadow 150ms, opacity 150ms",
        flexShrink: 0,
        background: `radial-gradient(${c.soft}, var(--ds-surface-muted))`,
        display: "grid",
        placeItems: "center",
      }}
    >
      {urlIndex >= urls.length ? (
        <Sigil cardId={cardId} color={key} size={Math.round(h * 0.4)} />
      ) : (
        <img
          src={urls[urlIndex]}
          alt={def.nameEn}
          onError={() => setUrlIndex((i) => i + 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
      )}

      {count != null ? (
        <div
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            background: c.base,
            color: "#0b0d14",
            fontFamily: "var(--ds-font-mono)",
            fontWeight: 600,
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: "0 8px 0 8px",
          }}
        >
          ×{count}
        </div>
      ) : null}

      {zoomEnabled && zoomOnHover && mousePos ? (
        <CardZoomPreview cardId={cardId} x={mousePos.x} y={mousePos.y} fallbackIndex={urlIndex} />
      ) : null}
    </div>
  );
}

/**
 * Deck cover thumbnail — shows card art when a coverCardId is set, falls back
 * to the color Sigil. Mount with `key={coverCardId}` to reset on cover change.
 */
export function CoverThumb({
  coverCardId,
  sigilColor = "Neutral",
  sigilSize = 64,
}: {
  coverCardId?: string;
  sigilColor?: string;
  sigilSize?: number;
}) {
  const [urlIndex, setUrlIndex] = useState(0);
  if (!coverCardId) return <Sigil emblem="crest" color={sigilColor} size={sigilSize} />;
  const urls = cardImageUrls(coverCardId);
  if (urlIndex >= urls.length) return <Sigil emblem="crest" color={sigilColor} size={sigilSize} />;
  return (
    <img
      src={urls[urlIndex]}
      onError={() => setUrlIndex((i) => i + 1)}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
    />
  );
}

/** DP in compact k-notation (9000 → "9K"), full digits for non-round values. */
function formatDp(dp: number): string {
  return dp % 1000 === 0 ? `${dp / 1000}K` : `${dp}`;
}

/** Metadata scrim for a board token: play cost, level, name, traits, DP.
 *  Rendered over the art; scales with the token width and drops the least
 *  essential fields first as space shrinks. `dp` overrides the printed value
 *  so buffs/de-buffs show the live figure. */
function TokenInfo({ def, width, dp }: { def: CardDefinition; width: number; dp?: number }) {
  const scale = width / 92;
  const px = (n: number) => Math.round(n * scale);
  const c = paletteFor(def.colors);
  const dpChip = palettePairFor(def.colors);
  const cost = def.playCost;
  const dpValue = dp ?? def.dp;
  const traits = [def.forms?.[0], def.attributes?.[0], def.types?.[0]].filter((t) => t && t !== "-") as string[];
  const showTraits = width >= 84 && traits.length > 0;
  const showLevel = def.level != null && width >= 66;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {cost >= 0 ? (
        <span
          style={{
            position: "absolute",
            top: px(4),
            left: px(4),
            minWidth: px(20),
            height: px(20),
            padding: `0 ${px(4)}px`,
            borderRadius: px(20),
            background: `linear-gradient(150deg, ${c.base}, ${c.edge})`,
            color: c.on,
            border: "1.5px solid rgba(255,255,255,0.55)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
            fontFamily: "var(--ds-font-mono)",
            fontWeight: 700,
            fontSize: px(11),
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
          }}
        >
          {cost}
        </span>
      ) : null}
      {showLevel ? (
        <span
          style={{
            position: "absolute",
            top: px(4),
            right: px(4),
            padding: `${px(1)}px ${px(5)}px`,
            borderRadius: px(6),
            background: "rgba(11,13,20,0.72)",
            color: "#fff",
            fontFamily: "var(--ds-font-mono)",
            fontSize: px(8.5),
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Lv{def.level}
        </span>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${px(12)}px ${px(5)}px ${px(4)}px`,
          background: "linear-gradient(to top, rgba(8,10,16,0.92) 28%, rgba(8,10,16,0.55) 64%, transparent)",
        }}
      >
        {showTraits ? (
          <div
            style={{
              color: "rgba(226,232,240,0.82)",
              fontSize: px(7),
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: px(1),
            }}
          >
            {traits.join(" · ")}
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: px(3) }}>
          <span
            style={{
              color: "#fff",
              fontSize: px(9.5),
              fontWeight: 700,
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {def.nameEn}
          </span>
          {dpValue > 0 ? (
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--ds-font-mono)",
                fontSize: px(9),
                fontWeight: 700,
                color: "#fff",
                // A dual-colour Digimon carries both of its colours on the chip,
                // which is the fastest read of "this counts as red AND blue" the
                // board can give without a second badge.
                background: dpChip.split
                  ? `linear-gradient(90deg, ${dpChip.from.base} 0 50%, ${dpChip.to.base} 50% 100%)`
                  : "rgba(255,255,255,0.14)",
                border: `1px solid ${dpChip.split ? dpChip.to.edge : c.edge}`,
                borderRadius: px(5),
                padding: `${px(1)}px ${px(4)}px`,
                lineHeight: 1.25,
              }}
            >
              {formatDp(dpValue)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Compact board card (top of a permanent, or a hand card on the board).
 *  Pass `info` to overlay the token's name, play cost, level, traits and DP. */
/** The reference client's Stand_Rest / Rest_Stand clips are 200 ms with flat tangents. */
const SUSPEND_ROTATE_MS = 200;

export function CardMini({
  cardId,
  width = 88,
  suspended = false,
  suspendDelayMs = 0,
  selected = false,
  attackable = false,
  onClick,
  faceDown = false,
  info = false,
  dp,
  zoomOnHover = true,
}: {
  cardId?: string;
  width?: number;
  suspended?: boolean;
  /** Staggers the rotation, so an unsuspend phase sweeps the board instead of snapping. */
  suspendDelayMs?: number;
  selected?: boolean;
  attackable?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  info?: boolean;
  dp?: number;
  /** Show the floating full-card preview on hover. */
  zoomOnHover?: boolean;
}) {
  const def = cardId ? getCardDefinition(cardId) : undefined;
  const urls = cardImageUrls(def?.imageId ?? cardId ?? "");
  const [urlIndex, setUrlIndex] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const zoomEnabled = useHoverZoomEnabled();
  if (faceDown || !def) return <CardBack width={width} />;
  const c = paletteFor(def.colors);
  const key = colorKey(def.colors[0]);
  const h = Math.round(width * 1.4);
  return (
    <div
      data-state={suspended ? "suspended" : "active"}
      onClick={onClick}
      onMouseMove={zoomEnabled && zoomOnHover ? (e) => setMousePos({ x: e.clientX, y: e.clientY }) : undefined}
      onMouseLeave={zoomEnabled && zoomOnHover ? () => setMousePos(null) : undefined}
      title={def.nameEn}
      style={{
        width,
        height: h,
        borderRadius: 9,
        position: "relative",
        flexShrink: 0,
        border: `1.5px solid ${selected ? "var(--ds-primary)" : attackable ? "var(--ds-warning)" : c.edge}`,
        boxShadow: selected
          ? "0 0 0 2px var(--ds-primary-light), 0 6px 14px rgba(15,23,42,0.32)"
          : attackable
            ? "0 0 0 2px var(--ds-warning-light), 0 6px 14px rgba(15,23,42,0.32)"
            : "inset 0 0 0 1px rgba(255,255,255,0.06), 0 4px 10px rgba(15,23,42,0.26)",
        // The individual `rotate` property rather than `transform`, so a caller that already
        // owns the card's transform (the board's selection lift) cannot cancel the rotation.
        rotate: suspended ? "90deg" : "0deg",
        transformOrigin: "center",
        transition: `rotate ${SUSPEND_ROTATE_MS}ms ease-in-out ${suspendDelayMs}ms, box-shadow 150ms, border-color 150ms`,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      {urlIndex >= urls.length ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `radial-gradient(${c.soft}, var(--ds-surface-muted))`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Sigil cardId={def.cardId} color={key} size={width * 0.5} />
        </div>
      ) : (
        <img
          src={urls[urlIndex]}
          alt={def.nameEn}
          onError={() => setUrlIndex((i) => i + 1)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      )}

      {info ? <TokenInfo def={def} width={width} dp={dp} /> : null}

      {zoomEnabled && zoomOnHover && mousePos ? (
        <CardZoomPreview cardId={def.cardId} x={mousePos.x} y={mousePos.y} fallbackIndex={urlIndex} />
      ) : null}
    </div>
  );
}
