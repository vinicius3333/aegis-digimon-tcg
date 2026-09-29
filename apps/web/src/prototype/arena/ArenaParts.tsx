import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Ban, Egg, Layers, ScrollText, ShieldCheck, Swords, Trash2 } from "lucide-react";
import { getCardDefinition } from "@aegis/shared";
import { cn } from "@/lib/utils";
import { COLORS, colorKey } from "@/design/theme";
import { CardArt } from "../panels";
import { badgeDetails, type BadgeDetail } from "./badgeDetails";
import { useInspect, type InspectZone } from "./CardInspector";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CARD_BACK,
  EGG_BACK,
  FIELD_STATUSES,
  GAUGE_MAX,
  PHASES,
  TURN_SECONDS,
  cardKeywords,
  type FieldStatus,
  type Permanent,
  type Phase,
  type Side,
  type SideName,
} from "./arenaData";

function cardAura(cardId: string): CSSProperties {
  const color = getCardDefinition(cardId)?.colors[0];
  return { "--arena-aura": COLORS[colorKey(color)].base } as CSSProperties;
}

export function Zone({
  label,
  side,
  className,
  children,
}: {
  label: string;
  side: SideName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-side={side} className={cn("arena-zone relative grid place-items-center rounded-lg p-2 pt-5", className)}>
      <span className="arena-zone-label absolute top-1.5 left-2 font-display text-[10px] font-bold tracking-[0.14em] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export function CardBack({ src = CARD_BACK, className }: { src?: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      className={cn(
        "aspect-[63/88] w-[var(--arena-card)] rounded-[6%/4.3%] object-cover shadow-[0_6px_14px_rgba(0,0,0,0.35)] ring-1 ring-black/20",
        className,
      )}
    />
  );
}

const STATUS_ICONS: Record<FieldStatus, { icon: typeof Layers; tone: string }> = {
  protected: { icon: ShieldCheck, tone: "arena-status-protect" },
  mustAttack: { icon: Swords, tone: "arena-status-attack" },
  cannotAttack: { icon: Ban, tone: "arena-status-block" },
};

const MAX_KEYWORDS = 2;
const MAX_STACK_EDGES = 3;

/* Radix tooltips open on hover and focus only, so the badge also toggles
   its tooltip on tap for phones. Badges are tiny, so the tap target reaches
   8px past the visible edge. */
function BadgeButton({
  label,
  detail,
  className,
  children,
}: {
  label: string;
  detail: BadgeDetail;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
          className={cn("relative before:absolute before:-inset-2 before:content-['']", className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-left">
        <p className="font-semibold">{detail.title}</p>
        <p className="opacity-80">{detail.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatDp(dp: number) {
  return `${dp % 1000 === 0 ? dp / 1000 : (dp / 1000).toFixed(1)}K`;
}

/* A card on the field with the same information the real board shows: stack
   size, level, status icons, printed keywords, and DP including any change.
   Badges are sized from --arena-card so they scale down on phones. The
   frame keeps the card's footprint, so a suspended card rotates inside it
   and its badges stay on the visible corners. */
export function FieldCard({
  cardId,
  permanent,
  owner,
  zone = "field",
  className,
}: {
  cardId: string;
  permanent?: Omit<Permanent, "cardId">;
  /** Set to let the card open the details overlay. */
  owner?: SideName;
  zone?: InspectZone;
  className?: string;
}) {
  const inspect = useInspect();
  const card = getCardDefinition(cardId);
  const suspended = permanent?.suspended ?? false;
  const dpDelta = permanent?.dpDelta ?? 0;
  const statuses = permanent?.statuses ?? [];
  const keywords = cardKeywords(card?.effectText).slice(0, MAX_KEYWORDS);
  const summary = [
    card?.nameEn ?? cardId,
    card?.level ? `level ${card.level}` : undefined,
    card?.dp ? `${card.dp + dpDelta} DP` : undefined,
    permanent?.sources ? `${permanent.sources} cards in stack` : undefined,
    suspended ? "suspended" : undefined,
    ...statuses.map((status) => FIELD_STATUSES[status]),
    ...keywords,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <figure className={cn("arena-field-card relative", className)} style={cardAura(cardId)} title={summary}>
      <div
        className={cn(
          "relative isolate",
          suspended ? "h-[var(--arena-card)] w-[calc(var(--arena-card)*1.397)]" : "w-[var(--arena-card)]",
        )}
      >
        {suspended
          ? null
          : Array.from({ length: Math.min(permanent?.sources ?? 0, MAX_STACK_EDGES) }, (_, index) => (
              <span
                key={index}
                aria-hidden
                className="arena-stack-edge absolute inset-0 rounded-[6%/4.3%]"
                style={{ translate: `${-(index + 1) * 3}px ${(index + 1) * 3}px`, zIndex: -(index + 1) }}
              />
            ))}
        <CardArt
          cardId={cardId}
          className={cn(
            "w-[var(--arena-card)] shadow-[0_10px_22px_rgba(0,0,0,0.45)]",
            suspended && "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 saturate-50",
            permanent?.ready && "arena-ready",
          )}
        />
        {inspect && owner ? (
          <button
            type="button"
            aria-label={`Details for ${card?.nameEn ?? cardId}`}
            onClick={() => inspect({ cardId, owner, zone, permanent })}
            className="absolute inset-0 rounded-[6%/4.3%] focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : null}
        {permanent && permanent.sources > 0 ? (
          <BadgeButton
            label={`${permanent.sources} digivolution cards`}
            detail={badgeDetails.stack(permanent.sources)}
            className="arena-badge arena-badge-stack absolute -top-1.5 -left-1.5 inline-flex items-center gap-0.5"
          >
            <Layers className="arena-badge-icon" aria-hidden />
            {permanent.sources}
          </BadgeButton>
        ) : null}
        {card?.level ? <span className="arena-badge absolute -top-1.5 -right-1.5">Lv{card.level}</span> : null}
        {statuses.length > 0 ? (
          <span className="absolute top-[22%] -right-2 flex flex-col gap-0.5">
            {statuses.map((status) => {
              const { icon: Icon, tone } = STATUS_ICONS[status];
              return (
                <BadgeButton
                  key={status}
                  label={FIELD_STATUSES[status]}
                  detail={badgeDetails.status(status)}
                  className={cn("arena-status grid place-items-center rounded-full", tone)}
                >
                  <Icon className="arena-badge-icon" aria-hidden />
                </BadgeButton>
              );
            })}
          </span>
        ) : null}
        {keywords.length > 0 ? (
          <span className="absolute inset-x-0 bottom-[calc(var(--arena-card)*0.26)] flex flex-wrap justify-center gap-0.5 px-0.5">
            {keywords.map((keyword) => (
              <BadgeButton
                key={keyword}
                label={keyword}
                detail={badgeDetails.keyword(keyword)}
                className="arena-keyword truncate"
              >
                {keyword}
              </BadgeButton>
            ))}
          </span>
        ) : null}
        <figcaption
          className={cn(
            "arena-nameplate absolute flex items-center gap-1",
            suspended
              ? "-bottom-2 left-1/2 -translate-x-1/2 rounded px-1.5 whitespace-nowrap"
              : "inset-x-0 bottom-0 justify-between rounded-b-[inherit] px-1 py-0.5",
          )}
        >
          <span className="sr-only">{summary}</span>
          {suspended ? null : (
            <span aria-hidden className="min-w-0 truncate font-sans font-semibold">
              {card?.nameEn ?? cardId}
            </span>
          )}
          {card && card.dp > 0 ? (
            <span className="shrink-0 font-mono font-bold tabular-nums">
              <span aria-hidden>{formatDp(card.dp + dpDelta)}</span>
              {dpDelta !== 0 ? (
                <BadgeButton
                  label={`DP ${dpDelta > 0 ? "raised" : "lowered"} by ${Math.abs(dpDelta)}`}
                  detail={badgeDetails.dp(card.dp, dpDelta)}
                  className={cn("ml-0.5", dpDelta > 0 ? "arena-dp-up" : "arena-dp-down")}
                >
                  {dpDelta > 0 ? "+" : "−"}
                  {formatDp(Math.abs(dpDelta))}
                </BadgeButton>
              ) : null}
            </span>
          ) : null}
        </figcaption>
      </div>
    </figure>
  );
}

export function TrashTop({ cardId, owner }: { cardId: string; owner: SideName }) {
  const inspect = useInspect();
  const art = <CardArt cardId={cardId} className="w-[var(--arena-card)] opacity-75 grayscale-[40%]" />;
  if (!inspect) return art;
  return (
    <button
      type="button"
      aria-label={`Details for ${getCardDefinition(cardId)?.nameEn ?? cardId} in trash`}
      onClick={() => inspect({ cardId, owner, zone: "trash" })}
      className="rounded-[6%/4.3%]"
    >
      {art}
    </button>
  );
}

export function OpponentHand({ count, compact }: { count: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Opponent has ${count} cards in hand`}>
      <div className={cn("flex", compact ? "-space-x-2" : "-space-x-3")}>
        {Array.from({ length: count }, (_, index) => (
          <CardBack
            key={index}
            className={compact ? "w-[calc(var(--arena-card)*0.46)]" : "w-[calc(var(--arena-card)*0.7)]"}
          />
        ))}
      </div>
      <span className="arena-chip inline-flex items-center gap-1 rounded px-1.5 font-mono text-[11px] tabular-nums">
        <ScrollText className="size-3" aria-hidden />
        {count}
      </span>
    </div>
  );
}

export function SecurityRow({ count, side }: { count: number; side: SideName }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${count} security cards`}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          data-side={side}
          className="arena-security h-[calc(var(--arena-card)*0.42)] w-[calc(var(--arena-card)*0.6)] rounded-sm bg-cover bg-center"
          style={{ backgroundImage: `url(${CARD_BACK})` }}
        />
      ))}
      <span className="arena-chip ml-1 rounded px-1.5 font-mono text-[11px] tabular-nums">{count}</span>
    </div>
  );
}

export function Counter({ icon: Icon, label, value }: { icon: typeof Layers; label: string; value: number }) {
  return (
    <span className="arena-chip inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
      <Icon className="size-3" aria-hidden />
      <span className="sr-only">{label}</span>
      {value}
    </span>
  );
}

export function useTurnClock(running: boolean) {
  const [remaining, setRemaining] = useState(TURN_SECONDS);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((seconds) => (seconds <= 1 ? TURN_SECONDS : seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function WaitingDots() {
  return (
    <span aria-hidden className="inline-flex gap-0.5">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="arena-waiting-dot size-1 rounded-full bg-current"
          style={{ animationDelay: `${dot * 0.2}s` }}
        />
      ))}
    </span>
  );
}

/* The active player's avatar sits inside a ring that drains with the turn
   clock; the waiting player shows animated dots instead. */
export function PlayerPlate({
  side,
  sideName,
  active,
  className,
}: {
  side: Side;
  sideName: SideName;
  active?: boolean;
  className?: string;
}) {
  const clock = useTurnClock(Boolean(active));
  return (
    <div
      data-side={sideName}
      className={cn(
        "arena-zone flex items-center gap-2.5 rounded-lg px-2 py-1.5",
        active && "arena-zone-active",
        className,
      )}
    >
      <span className={cn("arena-avatar-frame shrink-0 rounded-[10px] p-[3px]", active && "arena-timer-ring")}>
        <img
          src={`/avatars/digimon-world-1/${side.avatar}.png`}
          alt=""
          className="arena-avatar block size-9 rounded-md object-contain p-0.5 [image-rendering:pixelated]"
        />
      </span>
      <div className="grid min-w-0 gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{side.name}</span>
          <span className="arena-zone-label inline-flex items-center gap-1 font-mono text-[10px] tabular-nums">
            {active ? (
              <>
                <span className="sr-only">Time left</span>
                {clock}
              </>
            ) : (
              <>
                Waiting <WaitingDots />
              </>
            )}
          </span>
        </span>
        <span className="flex gap-1">
          <Counter icon={ScrollText} label="Hand" value={side.hand.length} />
          <Counter icon={Layers} label="Deck" value={side.deck} />
          <Counter icon={Trash2} label="Trash" value={side.trash} />
        </span>
      </div>
    </div>
  );
}

export function EggsZone({ side, sideName, className }: { side: Side; sideName: SideName; className?: string }) {
  return (
    <Zone label="Eggs" side={sideName} className={className}>
      <div className="relative grid justify-items-center gap-1">
        <CardBack src={EGG_BACK} className="arena-stack" />
        <Counter icon={Egg} label="Eggs" value={side.eggs} />
      </div>
    </Zone>
  );
}

export function RaisingZone({ side, sideName, className }: { side: Side; sideName: SideName; className?: string }) {
  return (
    <Zone label="Raising" side={sideName} className={className}>
      {side.raising ? <FieldCard cardId={side.raising} owner={sideName} zone="raising" /> : null}
    </Zone>
  );
}

export function DeckZone({ side, sideName, className }: { side: Side; sideName: SideName; className?: string }) {
  return (
    <Zone label="Deck" side={sideName} className={className}>
      <div className="grid justify-items-center gap-1">
        <CardBack className="arena-stack" />
        <Counter icon={Layers} label="Deck" value={side.deck} />
      </div>
    </Zone>
  );
}

export function TrashZone({ side, sideName, className }: { side: Side; sideName: SideName; className?: string }) {
  return (
    <Zone label="Trash" side={sideName} className={className}>
      <div className="grid justify-items-center gap-1">
        {side.trashTop ? <TrashTop cardId={side.trashTop} owner={sideName} /> : null}
        <Counter icon={Trash2} label="Trash" value={side.trash} />
      </div>
    </Zone>
  );
}

export function Field({ side, sideName }: { side: Side; sideName: SideName }) {
  const mine = sideName === "player";
  return (
    <div
      aria-label={mine ? "Your Digimon" : "Opponent's Digimon"}
      data-side={sideName}
      className="arena-field flex min-h-[calc(var(--arena-card)*1.5)] items-center justify-center gap-[clamp(12px,2.4vw,28px)]"
    >
      {side.field.map((permanent) => (
        <FieldCard key={permanent.cardId} cardId={permanent.cardId} permanent={permanent} owner={sideName} />
      ))}
    </div>
  );
}

export function MemoryGauge({ memory }: { memory: number }) {
  const cells = Array.from({ length: GAUGE_MAX * 2 + 1 }, (_, index) => index - GAUGE_MAX);
  return (
    <div
      className="arena-gauge-track flex items-center gap-1 rounded-full p-1"
      role="meter"
      aria-valuemin={-GAUGE_MAX}
      aria-valuemax={GAUGE_MAX}
      aria-valuenow={memory}
      aria-label="Memory"
    >
      {cells.map((cell) => (
        <span
          key={cell}
          data-side={cell < 0 ? "opponent" : cell > 0 ? "player" : "zero"}
          className={cn(
            "arena-gauge-cell grid size-7 place-items-center rounded-full font-mono text-[11px] font-semibold tabular-nums",
            cell === memory && "arena-gauge-current",
          )}
        >
          {Math.abs(cell)}
        </span>
      ))}
    </div>
  );
}

/* Below 1440px the full rail no longer fits beside the centered memory gauge,
   so only the active phase stays visible, as on mobile. */
export function PhaseRail({ active }: { active: Phase }) {
  return (
    <ol className="flex items-center gap-1">
      {PHASES.map((phase) => (
        <li
          key={phase}
          aria-current={phase === active ? "step" : undefined}
          className={cn(
            "arena-phase rounded-full px-2.5 py-1 font-display text-[10px] font-bold tracking-[0.1em] uppercase",
            phase === active ? "arena-phase-active" : "max-[1440px]:hidden",
          )}
        >
          {phase}
        </li>
      ))}
    </ol>
  );
}

export function Hand({
  cards,
  selected,
  onSelect,
  compact,
}: {
  cards: string[];
  selected?: string;
  onSelect: (cardId: string) => void;
  compact?: boolean;
}) {
  const middle = (cards.length - 1) / 2;
  return (
    <div className={cn("flex justify-center", compact && "-space-x-3 px-2")}>
      {cards.map((cardId, index) => {
        const offset = index - middle;
        const isSelected = selected === cardId;
        const resting = compact
          ? `translateY(${Math.abs(offset) * 3}px) rotate(${offset * 3}deg)`
          : `translateY(${offset * offset * 3}px) rotate(${offset * 4}deg)`;
        return (
          <button
            key={cardId}
            type="button"
            onClick={() => onSelect(cardId)}
            aria-pressed={isSelected}
            aria-label={getCardDefinition(cardId)?.nameEn ?? cardId}
            className={cn(
              "origin-bottom rounded-[6%/4.3%] transition-transform duration-200",
              !compact && "-mx-1.5",
              isSelected && "z-10 ring-2 ring-primary",
            )}
            style={{ transform: isSelected ? "translateY(-18px)" : resting }}
          >
            <CardArt
              cardId={cardId}
              className={cn(
                "shadow-[0_12px_24px_rgba(0,0,0,0.45)]",
                compact ? "w-[clamp(58px,19vw,86px)]" : "w-[calc(var(--arena-card)*1.15)]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
