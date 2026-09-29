import "./EffectText.css";
import { inlineInspectorKeywordLines } from "./arenaInspectorModel";
import { normalizeKeywordBrackets } from "./keywordReminders";

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
            <mark key={index} data-kind="keyword">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
    </span>
  );
}
