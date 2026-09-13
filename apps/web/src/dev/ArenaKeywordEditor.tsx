import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition, type Permanent } from "@aegis/shared";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import {
  DEMO_KEYWORDS,
  NUMERIC_KEYWORDS,
  TEXT_KEYWORDS,
  demoKeywordLabel,
  demoKeywordName,
  type DemoKeyword,
  type DemoKeywordGrant,
  type DemoKeywordGrants,
} from "./arenaDemoKeywords";
import "./arenaKeywordEditor.css";

export function ArenaKeywordEditor({
  digimon,
  grants,
  onGrant,
  onRemove,
  onReset,
  onClose,
}: {
  digimon: readonly Permanent[];
  grants: DemoKeywordGrants;
  onGrant: (permanentId: string, grant: DemoKeywordGrant) => void;
  onRemove: (permanentId: string, keyword: DemoKeyword) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { locale } = useTranslation();
  const pt = locale === "pt-BR";
  const titleId = useId();
  const helpId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const [permanentId, setPermanentId] = useState(digimon[0]?.permanentId ?? "");
  const [query, setQuery] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState<DemoKeyword>("Blocker");
  const matches = DEMO_KEYWORDS.filter((keyword) =>
    demoKeywordName(keyword)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .includes(query.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  const keyword = matches.includes(selectedKeyword) ? selectedKeyword : matches[0];
  const numeric = keyword ? NUMERIC_KEYWORDS[keyword] : undefined;
  const textual = keyword ? TEXT_KEYWORDS[keyword] : undefined;
  const [amount, setAmount] = useState("1");
  const [parameter, setParameter] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const selected = digimon.find((permanent) => permanent.permanentId === permanentId);
  const current = grants[permanentId] ?? [];
  const value = Number(amount);
  const valid =
    !!selected &&
    !!keyword &&
    (!numeric || (amount.trim() !== "" && Number.isInteger(value) && value >= numeric.min && value <= numeric.max));
  const grant = keyword
    ? {
        keyword,
        ...(numeric ? { amount: value } : {}),
        ...(textual && parameter.trim() ? { parameter: parameter.trim() } : {}),
      }
    : undefined;

  useEffect(() => {
    setAmount(String(numeric?.initial ?? 1));
    setParameter("");
  }, [keyword, numeric?.initial]);

  useEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const siblings = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== root.current,
    );
    const previous = siblings.map((element) => element.inert);
    siblings.forEach((element) => {
      element.inert = true;
    });
    search.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCallback.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...(root.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, a[href]") ?? []),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      siblings.forEach((element, index) => {
        element.inert = previous[index] ?? false;
      });
      document.removeEventListener("keydown", onKey);
      if (origin?.isConnected) origin.focus();
    };
  }, []);

  function add() {
    if (!valid || !grant) return;
    onGrant(permanentId, grant);
    setAnnouncement(`${pt ? "Concedido" : "Granted"}: ${demoKeywordLabel(grant)}`);
  }

  return createPortal(
    <div
      ref={root}
      className="arena-keyword-editor"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="arena-keyword-editor__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={helpId}
      >
        <header className="arena-keyword-editor__header">
          <div>
            <span>{pt ? "Laboratório da arena" : "Arena lab"}</span>
            <h2 id={titleId}>{pt ? "Conceder keywords" : "Grant keywords"}</h2>
          </div>
          <button
            type="button"
            className="arena-keyword-editor__close"
            onClick={onClose}
            aria-label={pt ? "Fechar editor de keywords" : "Close keyword editor"}
          >
            <Icons.X size={20} />
          </button>
        </header>
        <p id={helpId} className="arena-keyword-editor__help">
          {pt
            ? "Prévia visual das habilidades no campo e nos detalhes. Efeitos e requisitos não são executados nesta demo."
            : "Preview abilities on the field and in card details. Effects and requirements are not executed in this demo."}
        </p>
        <div className="arena-keyword-editor__body">
          <div className="arena-keyword-editor__catalog">
            <label>
              {pt ? "Seu Digimon" : "Your Digimon"}
              <select value={permanentId} onChange={(event) => setPermanentId(event.target.value)}>
                {digimon.map((permanent) => (
                  <option key={permanent.permanentId} value={permanent.permanentId}>
                    {getCardDefinition(permanent.topCard?.cardId ?? "")?.nameEn ?? permanent.permanentId}
                    {permanent.inBreeding ? (pt ? " · criação" : " · breeding") : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {pt ? "Buscar keyword" : "Search keywords"}
              <input
                ref={search}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Piercing, Engage, Guard…"
              />
            </label>
            <div className="arena-keyword-editor__choices">
              <span id={listId}>{pt ? "Keyword disponível" : "Available keyword"}</span>
              <div className="arena-keyword-editor__list" role="group" aria-labelledby={listId}>
                {matches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={keyword === item}
                    onClick={() => setSelectedKeyword(item)}
                  >
                    {demoKeywordName(item)}
                  </button>
                ))}
              </div>
            </div>
            <span className="arena-keyword-editor__count">
              {matches.length}/{DEMO_KEYWORDS.length} keywords
            </span>
            {!matches.length ? <p>{pt ? "Nenhuma keyword encontrada." : "No matching keywords."}</p> : null}
          </div>
          <div className="arena-keyword-editor__editing">
            <div className="arena-keyword-editor__preview">
              <span>{pt ? "Prévia da concessão" : "Grant preview"}</span>
              <strong>{valid && grant ? demoKeywordLabel(grant) : keyword ? demoKeywordName(keyword) : "—"}</strong>
            </div>
            {numeric ? (
              <label>
                {keyword === "SecurityAttack"
                  ? pt
                    ? "Modificador de Security Attack (±)"
                    : "Security Attack modifier (±)"
                  : pt
                    ? "Valor"
                    : "Amount"}
                <input
                  type="number"
                  min={numeric.min}
                  max={numeric.max}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                {keyword === "SecurityAttack" ? (
                  <small>
                    {pt
                      ? "O total de checagens parte do valor original do Digimon e nunca fica abaixo de zero."
                      : "Total checks start from the Digimon's original value and never go below zero."}
                  </small>
                ) : null}
              </label>
            ) : null}
            {textual ? (
              <label>
                {pt ? "Requisito (texto opcional)" : "Requirement (optional text)"}
                <input
                  value={parameter}
                  maxLength={120}
                  onChange={(event) => setParameter(event.target.value)}
                  placeholder={textual}
                />
              </label>
            ) : null}
            <button type="button" className="arena-keyword-editor__grant" disabled={!valid} onClick={add}>
              <Icons.Sparkles size={17} />
              {pt ? "Conceder keyword" : "Grant keyword"}
            </button>
            <div
              className="arena-keyword-editor__granted"
              role="group"
              aria-label={pt ? "Keywords concedidas" : "Granted keywords"}
            >
              <h3>{pt ? "Concedidas a este Digimon" : "Granted to this Digimon"}</h3>
              {current.length ? (
                current.map((addition) => (
                  <div key={addition.keyword}>
                    <span>{demoKeywordLabel(addition)}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(permanentId, addition.keyword)}
                      aria-label={`${pt ? "Remover" : "Remove"} ${demoKeywordLabel(addition)}`}
                    >
                      <Icons.X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p>{pt ? "Nenhuma concessão de teste." : "No test grants yet."}</p>
              )}
            </div>
            <span role="status" className="arena-keyword-editor__status">
              {announcement}
            </span>
          </div>
        </div>
        <footer className="arena-keyword-editor__footer">
          <button
            type="button"
            onClick={onReset}
            disabled={!Object.values(grants).some((additions) => additions.length)}
          >
            {pt ? "Restaurar todos" : "Reset all"}
          </button>
          <button type="button" className="arena-keyword-editor__done" onClick={onClose}>
            {pt ? "Ver na arena" : "View arena"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
