import "./EffectText.css";
import { inlineInspectorKeywordLines } from "./arenaInspectorModel";

/** Printed timing and keyword markers shared by card details and effect notices. */
export function EffectText({ text }: { text: string }) {
  return (
    <span className="card-effect-text">
      {inlineInspectorKeywordLines(text)
        .split(/(\[[^\]]+\]|＜[^＞]+＞)/g)
        .map((part, index) =>
          /^\[|^＜/.test(part) ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
        )}
    </span>
  );
}
