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
        top: -9,
        zIndex: 4,
        transform: "translateX(-50%)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 2,
        width: width + 24,
        pointerEvents: "none",
      }}
    >
      {visibleKeywords.map((keyword) => (
        <span
          key={keyword}
          style={{
            padding: "1px 4px",
            borderRadius: 5,
            background: "var(--ds-foreground)",
            color: "var(--ds-background)",
            boxShadow: "var(--ds-shadow-sm)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 8,
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
            padding: "1px 4px",
            borderRadius: 5,
            background: "var(--ds-foreground-muted)",
            color: "var(--ds-background)",
            boxShadow: "var(--ds-shadow-sm)",
            fontFamily: "var(--ds-font-mono)",
            fontSize: 8,
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
