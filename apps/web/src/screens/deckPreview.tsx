import { effectiveCopyLimit as banlistLimit, getCardDefinition, isBanned, restrictionLabel } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { ColorDot } from "../design/primitives";
import { colorKey, kindOf } from "../design/theme";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { sortCardIds } from "./cardLibrary";

type CountMap = Record<string, number>;

interface DeckPreviewSectionsProps {
  main: CountMap;
  egg: CountMap;
  coverCardId?: string;
  pairConflictCardIds?: ReadonlySet<string>;
  onSetCover?: (cardId: string) => void;
  onAdd: (cardId: string) => void;
  onRemove: (cardId: string) => void;
}

interface DeckSection {
  id: string;
  label: string;
  cardIds: string[];
}

function countCards(cards: CountMap): number {
  return Object.values(cards).reduce((sum, count) => sum + count, 0);
}

/** Current-deck preview, arranged around how a player builds an evolution line. */
export function DeckPreviewSections({
  main,
  egg,
  coverCardId,
  pairConflictCardIds = new Set<string>(),
  onSetCover,
  onAdd,
  onRemove,
}: DeckPreviewSectionsProps) {
  const { t } = useTranslation();
  const byLevel = new Map<number, string[]>();
  const tamers: string[] = [];
  const options: string[] = [];
  const other: string[] = [];

  for (const cardId of Object.keys(main)) {
    const definition = getCardDefinition(cardId);
    if (!definition) {
      other.push(cardId);
      continue;
    }
    const kind = kindOf(definition);
    if (kind === "Tamer") tamers.push(cardId);
    else if (kind === "Option") options.push(cardId);
    else if (kind === "Digimon" && definition.level != null) {
      const cards = byLevel.get(definition.level) ?? [];
      cards.push(cardId);
      byLevel.set(definition.level, cards);
    } else other.push(cardId);
  }

  const eggCardIds = sortCardIds(Object.keys(egg));
  const sections: DeckSection[] = [
    ...[...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, cardIds]) => ({
        id: `level-${level}`,
        label: t("deck.levelSection", { level, count: countCardsFromIds(main, cardIds) }),
        cardIds: sortCardIds(cardIds),
      })),
    {
      id: "tamers",
      label: t("deck.tamerSection", { count: countCardsFromIds(main, tamers) }),
      cardIds: sortCardIds(tamers),
    },
    {
      id: "options",
      label: t("deck.optionSection", { count: countCardsFromIds(main, options) }),
      cardIds: sortCardIds(options),
    },
    {
      id: "other",
      label: t("deck.otherSection", { count: countCardsFromIds(main, other) }),
      cardIds: sortCardIds(other),
    },
  ].filter((section) => section.cardIds.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section>
        <DeckPreviewLabel>{t("deck.eggSection", { count: countCards(egg) })}</DeckPreviewLabel>
        {eggCardIds.length === 0 ? (
          <DeckPreviewEmpty>{t("deck.noEggs")}</DeckPreviewEmpty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {eggCardIds.map((cardId) => (
              <DeckPreviewCard
                key={cardId}
                cardId={cardId}
                count={egg[cardId]!}
                isCover={coverCardId === cardId}
                pairConflict={pairConflictCardIds.has(cardId)}
                onSetCover={onSetCover ? () => onSetCover(cardId) : undefined}
                onAdd={() => onAdd(cardId)}
                onRemove={() => onRemove(cardId)}
              />
            ))}
          </div>
        )}
      </section>
      {sections.map((section) => (
        <section key={section.id}>
          <DeckPreviewLabel>{section.label}</DeckPreviewLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {section.cardIds.map((cardId) => (
              <DeckPreviewCard
                key={cardId}
                cardId={cardId}
                count={(section.id === "eggs" ? egg : main)[cardId]!}
                isCover={coverCardId === cardId}
                pairConflict={pairConflictCardIds.has(cardId)}
                onSetCover={onSetCover ? () => onSetCover(cardId) : undefined}
                onAdd={() => onAdd(cardId)}
                onRemove={() => onRemove(cardId)}
              />
            ))}
          </div>
        </section>
      ))}
      {sections.length === 0 ? <DeckPreviewEmpty>{t("deck.addFromPool")}</DeckPreviewEmpty> : null}
    </div>
  );
}

function countCardsFromIds(cards: CountMap, cardIds: readonly string[]): number {
  return cardIds.reduce((sum, cardId) => sum + (cards[cardId] ?? 0), 0);
}

function DeckPreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--ds-foreground-muted)",
        padding: "0 4px 6px",
      }}
    >
      {children}
    </div>
  );
}

function DeckPreviewEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 6px", fontSize: 12.5, color: "var(--ds-foreground-disabled)", fontStyle: "italic" }}>
      {children}
    </div>
  );
}

function DeckPreviewCard({
  cardId,
  count,
  isCover,
  pairConflict,
  onSetCover,
  onAdd,
  onRemove,
}: {
  cardId: string;
  count: number;
  isCover: boolean;
  pairConflict: boolean;
  onSetCover?: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const definition = getCardDefinition(cardId);
  if (!definition) return null;
  const kind = kindOf(definition);
  const cap = Math.min(definition.maxCountInDeck, banlistLimit(cardId));
  const banLabel = pairConflict ? t("deck.pairBadge") : restrictionLabel(cardId);
  const disabled = isBanned(cardId) || pairConflict;
  const typeLabel = kind === "Digimon" && definition.level != null ? `Lv. ${definition.level}` : kind;
  const StarIcon = isCover ? Icons.Star : Icons.StarOutline;

  return (
    <div
      style={{
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: 5,
        borderRadius: 10,
        background: "var(--ds-surface-muted)",
        border: "1px solid var(--ds-border)",
      }}
    >
      <div style={{ width: 38, height: 53, flexShrink: 0, overflow: "hidden", borderRadius: 5 }}>
        <CardFull cardId={cardId} width={38} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <ColorDot color={colorKey(definition.colors[0])} size={8} />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12.5,
              fontWeight: 650,
              color: "var(--ds-foreground)",
            }}
          >
            {definition.nameEn}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
          <span
            style={{
              padding: "1px 5px",
              borderRadius: 4,
              background: "var(--ds-surface)",
              border: "1px solid var(--ds-border)",
              color: "var(--ds-foreground-muted)",
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {typeLabel}
          </span>
          {banLabel ? (
            <span
              style={{
                padding: "1px 5px",
                borderRadius: 4,
                background: disabled ? "#dc2626" : "#f59e0b",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {banLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        {onSetCover ? (
          <button
            onClick={onSetCover}
            aria-label={isCover ? t("deck.coverCard") : t("deck.setAsCover")}
            title={isCover ? t("deck.coverCard") : t("deck.setAsCover")}
            style={{
              ...stepButton,
              color: isCover ? "var(--ds-primary)" : "var(--ds-foreground-muted)",
              borderColor: isCover ? "var(--ds-primary)" : "var(--ds-border)",
            }}
          >
            <StarIcon size={11} />
          </button>
        ) : null}
        <button onClick={onRemove} aria-label={t("common.remove")} style={stepButton}>
          –
        </button>
        <span
          style={{
            width: 16,
            textAlign: "center",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ds-foreground)",
          }}
        >
          {count}
        </span>
        <button
          onClick={onAdd}
          aria-label={t("common.add")}
          disabled={disabled || count >= cap}
          style={{
            ...stepButton,
            opacity: disabled || count >= cap ? 0.4 : 1,
            cursor: disabled || count >= cap ? "not-allowed" : "pointer",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

const stepButton: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: "1px solid var(--ds-border-strong)",
  background: "var(--ds-surface)",
  color: "var(--ds-foreground-secondary)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  display: "grid",
  placeItems: "center",
  fontWeight: 600,
};

/** Evolution curve: only Digimon are represented, never play cost. */
export function DeckLevelCurve({ main }: { main: CountMap }) {
  const { t } = useTranslation();
  const counts = new Map<number, number>();
  for (const [cardId, count] of Object.entries(main)) {
    const definition = getCardDefinition(cardId);
    if (!definition || kindOf(definition) !== "Digimon" || definition.level == null) continue;
    counts.set(definition.level, (counts.get(definition.level) ?? 0) + count);
  }
  const levels = [...new Set([2, 3, 4, 5, 6, 7, ...counts.keys()])].sort((a, b) => a - b);
  const peak = Math.max(1, ...counts.values());

  return (
    <div>
      <div style={statLabel}>{t("deck.levelCurve")}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
        {levels.map((level) => {
          const count = counts.get(level) ?? 0;
          return (
            <div
              key={level}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
            >
              <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 10, color: "var(--ds-foreground-muted)" }}>
                {count || ""}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${(count / peak) * 52}px`,
                  minHeight: count ? 4 : 0,
                  borderRadius: 4,
                  background: "var(--ds-primary)",
                  opacity: count ? 1 : 0,
                }}
              />
              <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 10, color: "var(--ds-foreground-muted)" }}>
                Lv.{level}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ds-foreground-muted)",
  marginBottom: 12,
};
