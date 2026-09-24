/** How many keyword pills show before the rest collapse into a "+N" chip. */
const VISIBLE_KEYWORD_COUNT = 3;

/** The resolved keyword pills floating above a permanent's card. */
export function PermanentKeywordBadges({ keywords, width }: { keywords: readonly string[]; width: number }) {
  const visibleKeywords = keywords.slice(0, VISIBLE_KEYWORD_COUNT);
  const hiddenKeywordCount = keywords.length - visibleKeywords.length;
  return (
    <div
      aria-label={`Active keywords: ${keywords.join(", ")}`}
      style={{
        position: "absolute",
        left: "50%",
        bottom: "calc(100% - 6px)",
        zIndex: 8,
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap-reverse",
        justifyContent: "center",
        gap: 3,
        width: width + 24,
        pointerEvents: "none",
      }}
    >
      {visibleKeywords.map((keyword) => (
        <span
          key={keyword}
          style={{
            padding: "2px 6px",
            borderRadius: 999,
            background: "linear-gradient(135deg, var(--ds-accent), var(--ds-brand-interactive-strong))",
            color: "var(--ds-accent-on)",
            border: "1px solid color-mix(in srgb, var(--ds-accent-on) 35%, transparent)",
            boxShadow: "0 2px 6px color-mix(in srgb, var(--ds-accent) 45%, transparent)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 9,
            letterSpacing: "0.02em",
            fontWeight: 700,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {keyword}
        </span>
      ))}
      {hiddenKeywordCount > 0 ? (
        <span
          aria-label={`${hiddenKeywordCount} more keywords`}
          style={{
            padding: "2px 6px",
            borderRadius: 999,
            background: "var(--ds-brand-ink)",
            color: "var(--ds-brand-on-ink)",
            border: "1px solid color-mix(in srgb, var(--ds-accent) 60%, transparent)",
            boxShadow: "var(--ds-shadow-sm)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 9,
            fontWeight: 700,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
          }}
        >
          +{hiddenKeywordCount}
        </span>
      ) : null}
    </div>
  );
}
