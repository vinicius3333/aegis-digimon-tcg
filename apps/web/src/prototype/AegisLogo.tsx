import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export const EMBLEMS = [{ id: "pixel", label: "Pixel egg", src: "/branding/aegis-emblem.png" }] as const;

export type EmblemId = (typeof EMBLEMS)[number]["id"];

const EMBLEM_KEY = "aegis.uiPreview.emblem";
const EMBLEM_CHANGE = "aegis-ui-preview-emblem";

function readEmblem(): EmblemId {
  try {
    const saved = localStorage.getItem(EMBLEM_KEY);
    return EMBLEMS.find((emblem) => emblem.id === saved)?.id ?? "pixel";
  } catch {
    return "pixel";
  }
}

export function chooseEmblem(id: EmblemId) {
  try {
    localStorage.setItem(EMBLEM_KEY, id);
  } catch {
    // Remembering the choice is a convenience; the event below still updates this page.
  }
  window.dispatchEvent(new Event(EMBLEM_CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EMBLEM_CHANGE, onChange);
  return () => window.removeEventListener(EMBLEM_CHANGE, onChange);
}

export function useEmblem() {
  const id = useSyncExternalStore(subscribe, readEmblem);
  return EMBLEMS.find((emblem) => emblem.id === id) ?? EMBLEMS[0];
}

export function AegisEmblem({ id, className }: { id?: EmblemId; className?: string }) {
  const chosen = useEmblem();
  const emblem = EMBLEMS.find((candidate) => candidate.id === id) ?? chosen;
  return <img src={emblem.src} alt="" className={cn("size-9 shrink-0 object-contain", className)} />;
}

export function AegisLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AegisEmblem />
      <span className="grid leading-none">
        <span
          className="bg-gradient-to-b from-white to-[#9cc6ff] bg-clip-text font-display text-[22px] font-extrabold tracking-[0.08em] text-transparent"
          style={{ fontFamily: "var(--ds-font-brand)" }}
        >
          AEGIS
        </span>
        <span className="text-[9px] font-semibold tracking-[0.32em] text-on-ink-muted">CARD GAME</span>
      </span>
    </span>
  );
}
