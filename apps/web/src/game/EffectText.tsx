import "./EffectText.css";
import { inlineInspectorKeywordLines } from "./arenaInspectorModel";
import { KEYWORD_GLOSSARY } from "./keywordGlossary";
import { keywordBaseName, keywordRuleHintLink, normalizeKeywordBrackets } from "./keywordReminders";
import { BadgeHint } from "./piece/BadgeHint";

/** A printed keyword, explained on tap when the Comprehensive Rules define it. */
function KeywordMark({ keyword }: { keyword: string }) {
  const entry = KEYWORD_GLOSSARY[keywordBaseName(keyword)];
  if (!entry) return <mark data-kind="keyword">{keyword}</mark>;
  return (
    <BadgeHint
      className="card-effect-text__keyword"
      hint={{
        title: normalizeKeywordBrackets(keyword),
        description: entry.reminder,
        link: keywordRuleHintLink(keyword),
      }}
    >
      <mark data-kind="keyword">{keyword}</mark>
    </BadgeHint>
  );
}

/**
 * Printed timing and keyword markers shared by card details and effect notices.
 * `asciiBrackets` prints the card data's full-width ＜Keyword＞ brackets as <Keyword>.
 */
export function EffectText({ text, asciiBrackets = false }: { text: string; asciiBrackets?: boolean }) {
  const lines = inlineInspectorKeywordLines(text);
  return (
    <span className="card-effect-text">
      {(asciiBrackets ? normalizeKeywordBrackets(lines) : lines)
        .split(/(\[[^\]]+\]|＜[^＞]+＞|<[^<>\r\n]+>)/g)
        .map((part, index) =>
          /^\[/.test(part) ? (
            <mark key={index} data-kind="timing">
              {part}
            </mark>
          ) : /^[＜<].+[＞>]$/.test(part) ? (
            <KeywordMark key={index} keyword={part} />
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
    </span>
  );
}
