import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Flag, Layers, ShieldMinus } from "lucide-react";
import type { MatchReplay } from "@aegis/shared/replays";
import { useTranslation } from "@/i18n/useTranslation";
import { buildReplayTimelineEvents } from "@/replays/buildReplayTimelineEvents";
import type { ReplayTimelineEvent } from "@/replays/ReplayTimelineEvent";
import { ReplayTimelineEventKind } from "@/replays/ReplayTimelineEventKind";

type Props = { replay: MatchReplay; index: number; onSeek: (index: number) => void };
type Group = { position: number; events: ReplayTimelineEvent[] };
type GroupParams = { events: ReplayTimelineEvent[]; last: number; width: number };

function groupNearbyEvents({ events, last, width }: GroupParams): Group[] {
  const groups: Group[] = [];
  for (const event of events) {
    const position = event.index / Math.max(1, last);
    const previous = groups.at(-1);
    if (previous && (position - previous.position) * width < 28) {
      previous.events.push(event);
    } else {
      groups.push({ position, events: [event] });
    }
  }
  return groups;
}

export function ReplayTimeline({ replay, index, onSeek }: Props) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [width, setWidth] = useState(200);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const popupId = useId();
  const positionId = useId();
  const events = useMemo(() => buildReplayTimelineEvents({ replay }), [replay]);
  const groups = useMemo(
    () => groupNearbyEvents({ events, last: replay.frames.length - 1, width }),
    [events, replay.frames.length, width],
  );

  const selected = groups.find((group) => group.events[0]!.index === selectedIndex);

  useEffect(() => {
    const element = track.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const current = root.current?.querySelector<HTMLButtonElement>(".replay-timeline__events button[aria-current]");
    const first = root.current?.querySelector<HTMLButtonElement>(".replay-timeline__events button");
    (current ?? first)?.focus();
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setSelectedIndex(undefined);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [selected]);

  function getEventLabel(event: ReplayTimelineEvent) {
    const definition = Object.values(ReplayTimelineEventKind).find((entry) => entry.value === event.kind)!;
    return t(definition.label, {
      name: replay.players[event.seat],
      turn: event.turn,
      amount: event.amount,
      action: event.index + 1,
    });
  }

  function seekToEvent(event: ReplayTimelineEvent) {
    onSeek(event.index);
    setSelectedIndex(undefined);
    trigger.current?.focus();
  }

  return (
    <div
      ref={root}
      className="replay-timeline"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selected) {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex(undefined);
          trigger.current?.focus();
        }
      }}
    >
      <label htmlFor={positionId}>{t("replay.action", { current: index + 1, total: replay.frames.length })}</label>
      <div className="replay-timeline__legend" aria-hidden="true">
        <Flag size={12} />
        {t("replay.turn")}
        <ShieldMinus size={12} />
        {t("replay.timeline.securityShort")}
      </div>
      <div ref={track} className="replay-timeline__track" role="group" aria-label={t("replay.timeline.events")}>
        {groups.map((group) => {
          const first = group.events[0]!;
          const grouped = group.events.length > 1;
          let Icon = ShieldMinus;
          if (grouped) {
            Icon = Layers;
          } else if (first.kind === ReplayTimelineEventKind.TURN.value) {
            Icon = Flag;
          }
          const label = grouped
            ? t("replay.timeline.group", { count: group.events.length, action: first.index + 1 })
            : getEventLabel(first);
          return (
            <button
              key={`${first.index}-${first.kind}-${first.seat}`}
              type="button"
              className="replay-timeline__marker"
              style={{ left: `${group.position * 100}%` }}
              title={label}
              aria-label={label}
              aria-current={group.events.some((event) => event.index === index) ? "step" : undefined}
              aria-expanded={selected === group}
              aria-controls={selected === group ? popupId : undefined}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                onSeek(first.index);
                setSelectedIndex((current) => (current === first.index ? undefined : first.index));
              }}
            >
              <Icon size={14} aria-hidden="true" />
              {grouped ? <small>{group.events.length}</small> : null}
            </button>
          );
        })}
      </div>
      <input
        id={positionId}
        type="range"
        min={0}
        max={replay.frames.length - 1}
        value={index}
        aria-label={t("replay.position")}
        onChange={(event) => {
          setSelectedIndex(undefined);
          onSeek(Number(event.target.value));
        }}
      />
      {selected ? (
        <div id={popupId} className="replay-timeline__events" role="group" aria-label={t("replay.timeline.events")}>
          {selected.events.map((event) => (
            <div className="replay-timeline__event" key={`${event.index}-${event.kind}-${event.seat}`}>
              <strong>{getEventLabel(event)}</strong>
              <span>
                {t("replay.timeline.detail", {
                  turn: event.turn,
                  time: new Date(Math.max(0, replay.frames[event.index]!.atMs)).toISOString().slice(11, 19),
                })}
              </span>
              <button
                type="button"
                aria-current={event.index === index ? "step" : undefined}
                onClick={() => seekToEvent(event)}
              >
                {t("replay.timeline.seek", { action: event.index + 1 })}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
