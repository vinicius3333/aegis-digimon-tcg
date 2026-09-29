/* Card details overlay for the arena. Any card on the board can open it; a
   context carries the opener down so zones don't pass it through props. On
   phones it rises from the bottom as a sheet; on wide screens it is centered
   with the card beside the text. */

import { createContext, useContext, type ReactNode } from "react";
import { Layers, Swords } from "lucide-react";
import { getCardDefinition, type CardDefinition } from "@aegis/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { COLORS, colorKey } from "@/design/theme";
import { CardArt } from "../panels";
import { cardKeywords, FIELD_STATUSES, normalizeBrackets, type Permanent, type SideName } from "./arenaData";
import { badgeDetails } from "./badgeDetails";

export type InspectZone = "field" | "raising" | "hand" | "trash";

export interface InspectTarget {
  cardId: string;
  owner: SideName;
  zone: InspectZone;
  permanent?: Omit<Permanent, "cardId">;
}

const InspectContext = createContext<((target: InspectTarget) => void) | undefined>(undefined);

export const InspectProvider = InspectContext.Provider;

export function useInspect() {
  return useContext(InspectContext);
}

/* Timing tags like [On Play] and keywords like <Blocker> read as chips. */
function EffectText({ text }: { text: string }) {
  const parts = normalizeBrackets(text)
    .split(/(\[[^\]]+\]|<[^>]+>)/g)
    .filter(Boolean);
  return (
    <p className="text-sm leading-relaxed">
      {parts.map((part, index) =>
        /^\[.+\]$/.test(part) ? (
          <span key={index} className="mr-0.5 rounded bg-primary/25 px-1 py-px text-xs font-semibold text-signal">
            {part.slice(1, -1)}
          </span>
        ) : /^<.+>$/.test(part) ? (
          <span key={index} className="rounded bg-white/10 px-1 py-px text-xs font-semibold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h3 className="font-display text-[10px] font-bold tracking-[0.14em] text-on-ink-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 rounded-md bg-white/5 px-2.5 py-1.5">
      <dt className="text-[10px] tracking-[0.12em] text-on-ink-muted uppercase">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function kindLabel(card: CardDefinition) {
  return card.kinds.join(" / ");
}

function primaryAction(target: InspectTarget, card: CardDefinition) {
  if (target.owner !== "player") return undefined;
  if (target.zone === "hand") {
    return card.playCost >= 0 ? `Play for ${card.playCost} memory` : undefined;
  }
  if (target.zone === "field" && target.permanent?.ready) return "Attack";
  return undefined;
}

export function CardDetailsOverlay({ target, onClose }: { target?: InspectTarget; onClose: () => void }) {
  const card = target ? getCardDefinition(target.cardId) : undefined;
  return (
    <Dialog open={Boolean(target && card)} onOpenChange={(open) => (open ? null : onClose())}>
      {target && card ? (
        <DialogContent
          className={cn(
            "max-h-[88dvh] gap-0 overflow-y-auto border-white/10 bg-ink p-0 text-on-ink sm:max-w-3xl",
            "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none",
          )}
        >
          <CardDetails target={target} card={card} onClose={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function CardDetails({ target, card, onClose }: { target: InspectTarget; card: CardDefinition; onClose: () => void }) {
  const permanent = target.permanent;
  const dpDelta = permanent?.dpDelta ?? 0;
  const keywords = cardKeywords([card.effectText, card.inheritedEffectText].filter(Boolean).join(" "));
  const traits = [...(card.forms ?? []), ...(card.attributes ?? []), ...(card.types ?? [])];
  const action = primaryAction(target, card);

  return (
    <div className="grid gap-5 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
      <div className="mx-auto grid w-40 content-start gap-3 sm:w-full">
        <CardArt cardId={card.cardId} className="w-full shadow-[0_18px_40px_rgba(0,0,0,0.5)]" />
        {permanent && permanent.sourceIds.length > 0 ? (
          <Section title="Digivolution stack">
            <div className="flex gap-1.5">
              {permanent.sourceIds.map((cardId) => (
                <CardArt key={cardId} cardId={cardId} className="w-12" />
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <header className="grid gap-1 pr-8">
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-on-ink-muted">
            <span>{card.cardId}</span>
            <span aria-hidden>·</span>
            <span>{kindLabel(card)}</span>
            {card.rarity ? (
              <>
                <span aria-hidden>·</span>
                <span>{card.rarity}</span>
              </>
            ) : null}
          </p>
          <DialogTitle className="font-display text-2xl font-extrabold">{card.nameEn}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 text-on-ink-muted">
            {card.colors.map((color) => (
              <span key={color} className="inline-flex items-center gap-1 text-xs">
                <span className="size-2.5 rounded-full" style={{ background: COLORS[colorKey(color)].base }} />
                {color}
              </span>
            ))}
            {traits.length > 0 ? <span className="text-xs">· {traits.join(" · ")}</span> : null}
          </DialogDescription>
        </header>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {card.level ? <Stat label="Level" value={card.level} /> : null}
          {card.dp > 0 ? (
            <Stat
              label="DP"
              value={
                <>
                  {card.dp + dpDelta}
                  {dpDelta !== 0 ? (
                    <span className={cn("ml-1 text-xs", dpDelta > 0 ? "arena-dp-up" : "arena-dp-down")}>
                      ({dpDelta > 0 ? "+" : "−"}
                      {Math.abs(dpDelta)})
                    </span>
                  ) : null}
                </>
              }
            />
          ) : null}
          {card.playCost >= 0 ? <Stat label="Play cost" value={card.playCost} /> : null}
          {card.evoCosts.map((cost) => (
            <Stat
              key={`${cost.color}-${cost.level}`}
              label={`Digivolve · ${cost.color} Lv${cost.level}`}
              value={cost.memoryCost}
            />
          ))}
        </dl>

        {permanent && (permanent.statuses.length > 0 || permanent.suspended || permanent.sources > 0) ? (
          <Section title="On the field now">
            <ul className="grid gap-1 text-sm">
              {permanent.suspended ? <li>Suspended</li> : null}
              {permanent.sources > 0 ? (
                <li className="inline-flex items-center gap-1.5">
                  <Layers className="size-3.5" aria-hidden /> {badgeDetails.stack(permanent.sources).description}
                </li>
              ) : null}
              {permanent.statuses.map((status) => (
                <li key={status}>{FIELD_STATUSES[status]}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {card.effectText ? (
          <Section title="Effect">
            <EffectText text={card.effectText} />
          </Section>
        ) : null}
        {card.inheritedEffectText ? (
          <Section title="Inherited effect">
            <EffectText text={card.inheritedEffectText} />
          </Section>
        ) : null}
        {card.securityEffectText ? (
          <Section title="Security effect">
            <EffectText text={card.securityEffectText} />
          </Section>
        ) : null}

        {keywords.length > 0 ? (
          <Section title="Keywords">
            <dl className="grid gap-2">
              {keywords.map((keyword) => {
                const detail = badgeDetails.keyword(keyword);
                return (
                  <div key={keyword} className="grid gap-0.5">
                    <dt className="text-sm font-semibold">{detail.title}</dt>
                    <dd className="text-sm text-on-ink-muted">{detail.description}</dd>
                  </div>
                );
              })}
            </dl>
          </Section>
        ) : null}

        {action ? (
          <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-white/10 bg-ink px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-on-ink hover:bg-white/10 hover:text-on-ink"
              onClick={onClose}
            >
              Close
            </Button>
            <Button onClick={onClose}>
              {target.zone === "field" ? <Swords /> : null}
              {action}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
