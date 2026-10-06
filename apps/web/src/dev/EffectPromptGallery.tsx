/* Interactive development fixtures for every match prompt surface. */
import { useEffect, useMemo, useRef, useState } from "react";
import { assemblyRequirementFor, digiXrosRequirementFor, getCardDefinition, type DecisionRequest } from "@aegis/shared";
import { Button } from "../design/primitives";
import { applyDarkMode, setDarkMode, useDarkMode } from "../design/darkMode";
import { useTranslation } from "../i18n";
import { GameScreen } from "../game/GameScreen";
import { DecisionPrompts } from "../game/screen/layout/DecisionPrompts";
import {
  ActionConfirmationOverlay,
  AssemblyMaterialOverlay,
  BarrierOverlay,
  BlockOverlay,
  CounterOverlay,
  DigiXrosMaterialOverlay,
  DualPlayChoiceOverlay,
  EvadeOverlay,
  EvoCostChoiceOverlay,
  MulliganOverlay,
} from "../game/overlay";
import { AllianceOverlay } from "../game/overlay/combat/AllianceOverlay";
import { DigiXrosExpanderPrompt } from "../game/overlay/choice/DigiXrosExpanderPrompt";
import { AppFusionChoiceOverlay } from "../game/AppFusionChoiceOverlay";
import { ArenaPermanentInspector } from "../game/ArenaPermanentInspector";
import { CardZoomOverlay } from "../game/overlay";
import { buildPermanentDetail } from "../game/permanentDetail";
import { Side } from "../game/side";
import type { CandidateZone } from "../game/decisionModel";
import { createArenaDemoState } from "./ArenaDemo";
import {
  CARDS,
  INSPECTED_PERMANENT,
  TRIGGER_DECISION,
  SAME_PERMANENT_TRIGGER_DECISION,
  permanent,
} from "./boardShowcaseFixtures";
import "../game/game.css";
import "./effectPromptGallery.css";

export const EFFECT_PROMPT_CASES = [
  ["optional-field", "Optional effect · field", "left"],
  ["optional-hidden", "Optional effect · hidden/revealed", "left"],
  ["choose-yes-no", "Choose option · use / decline", "left"],
  ["choose-clauses", "Choose option · printed clauses", "left"],
  ["choose-effects", "Choose option · borrowed effects", "center"],
  ["choose-revealed", "Choose option · revealed cards", "left"],
  ["select-hand", "Select cards · hand subset", "left"],
  ["choose-targets-hand", "Choose targets · hand", "left"],
  ["select-field", "Choose targets · field", "center"],
  ["select-mixed", "Select cards · mixed zones", "center"],
  ["select-player", "Choose targets · player", "center"],
  ["select-dp-budget", "Choose targets · DP budget", "center"],
  ["select-cost-budget", "Select cards · hand play cost budget", "left"],
  ["select-empty", "Select cards · no legal candidates", "center"],
  ["order-cards", "Order cards · deck bottom", "center"],
  ["order-triggers", "Order triggers · next effect", "center"],
  ["order-same-card", "Order triggers · same permanent", "center"],
  ["resolution-plan", "Order triggers · complete plan", "center"],
  ["partition", "Partition · use / decline", "left"],
  ["confirm-action", "Action confirmation", "left"],
  ["dual-play", "Dual card · option play", "left"],
  ["evo-cost", "Evolution · cost route", "left"],
  ["effect-evo-cost", "Effect evolution · cost route", "left"],
  ["assembly", "Assembly · trash materials", "center"],
  ["digixros", "DigiXros · hand / field / locked materials", "center"],
  ["digixros-expander", "DigiXros · Tamer activation", "left"],
  ["app-fusion", "App Fusion · linked material", "center"],
  ["app-fusion-empty", "App Fusion · unavailable route", "center"],
  ["block", "Block · choose blocker", "center"],
  ["collision", "Collision · required block", "center"],
  ["collision-empty", "Collision · no remaining blocker", "left"],
  ["alliance", "Alliance · choose ally", "center"],
  ["alliance-empty", "Alliance · no remaining ally", "left"],
  ["counter-sources", "Counter · choose source", "center"],
  ["counter-blast", "Counter · multiple Blast routes", "center"],
  ["counter-field", "Counter · single field action", "left"],
  ["counter-empty", "Counter · no remaining action", "left"],
  ["barrier", "Barrier · use / decline", "left"],
  ["evade", "Evade · use / decline", "left"],
  ["source-host", "Digivolution cards · choose host", "center"],
  ["mulligan-first", "Mulligan · going first", "center"],
  ["mulligan-second", "Mulligan · going second", "center"],
  ["inherited-inspector", "Inspector · inherited effects", "inspector"],
] as const;
type CaseId = (typeof EFFECT_PROMPT_CASES)[number][0];
const isCaseId = (value: string | null): value is CaseId => EFFECT_PROMPT_CASES.some(([id]) => id === value);
const EXPANDER = { permanentId: "gallery-taiki", cardId: "BT10-087", underTamerMax: 2, trashMax: 0 };
const SELECT_CARDS = [CARDS.rookie, CARDS.champion, CARDS.ultimate, CARDS.tamer, CARDS.option, CARDS.mega];

export function EffectPromptGallery() {
  const params = new URLSearchParams(window.location.search);
  const initialCase = params.get("case");
  const [caseId, setCaseId] = useState<CaseId>(isCaseId(initialCase) ? initialCase : "optional-field");
  const [revision, setRevision] = useState(0);
  const [active, setActive] = useState(true);
  const [response, setResponse] = useState<unknown>();
  const { locale, setLocale } = useTranslation();
  const dark = useDarkMode();
  useEffect(applyDarkMode, []);
  const state = useMemo(() => createArenaDemoState(), []);
  const handDecision = useMemo(() => {
    if (!["select-hand", "choose-targets-hand", "select-cost-budget"].includes(caseId)) return undefined;
    const hand = state.players[0]!.hand;
    const candidates =
      caseId === "select-hand"
        ? hand.filter((_, index) => index % 2 === 0)
        : caseId === "choose-targets-hand"
          ? hand.slice(0, 3)
          : hand;
    const portuguese = locale === "pt-BR";
    return {
      decisionId: `gallery-${caseId}-${revision}`,
      seat: 0,
      kind: caseId === "choose-targets-hand" ? "chooseTargets" : "selectCards",
      promptText: portuguese ? "Selecione até 2 cartas da sua mão" : "Select up to 2 cards from your hand",
      sourceCardId: state.players[0]!.battleArea[0]!.topCard.cardId,
      options: {
        candidateInstanceIds: candidates.map((card) => card.instanceId),
        min: caseId === "choose-targets-hand" ? 0 : 1,
        max: 2,
        ...(caseId === "select-cost-budget" ? { maxTotalPlayCost: 7 } : {}),
        timing: "Main",
        effectText: portuguese
          ? "Prévia visual: escolha as cartas destacadas da mão. Nada é descartado."
          : "Visual preview: choose the highlighted cards in hand. Nothing is trashed.",
      },
    } satisfies DecisionRequest;
  }, [state, caseId, revision, locale]);
  const boardRef = useRef<HTMLDivElement>(null);
  const current = EFFECT_PROMPT_CASES.find(([id]) => id === caseId)!;
  function selectCase(id: CaseId) {
    setCaseId(id);
    setRevision((value) => value + 1);
    setActive(true);
    setResponse(undefined);
    const next = new URL(window.location.href);
    next.searchParams.set("case", id);
    window.history.replaceState(null, "", next);
  }
  function respond(value: unknown) {
    setResponse(value);
    setActive(false);
  }
  return (
    <main className="effect-prompt-gallery" data-controls={params.get("controls") !== "0"}>
      <header className="effect-prompt-gallery__toolbar">
        <strong>{locale === "pt-BR" ? "Efeitos" : "Effects"}</strong>
        <label>
          <span className="sr-only">{locale === "pt-BR" ? "Cenário" : "Scenario"}</span>
          <select value={caseId} onChange={(event) => selectCase(event.target.value as CaseId)}>
            {EFFECT_PROMPT_CASES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="secondary" onClick={() => selectCase(caseId)}>
          {locale === "pt-BR" ? "Reabrir" : "Replay"}
        </Button>
        <select
          aria-label="Language"
          value={locale}
          onChange={(event) => setLocale(event.target.value as "en" | "pt-BR")}
        >
          <option value="pt-BR">Português</option>
          <option value="en">English</option>
        </select>
        <Button size="sm" variant="ghost" onClick={() => setDarkMode(!dark)}>
          {dark ? "Light" : "Dark"}
        </Button>
        <output
          title={
            caseId === "digixros"
              ? locale === "pt-BR"
                ? "Ative ou recuse o domador à esquerda; depois selecione materiais no centro."
                : "Accept or decline the Tamer on the left; then select materials in the center."
              : undefined
          }
        >
          {caseId === "digixros" ? "left → center" : current[2]}
        </output>
        <a href="/">{locale === "pt-BR" ? "Voltar" : "Back"}</a>
      </header>
      <div ref={boardRef} className="effect-prompt-gallery__board">
        <GameScreen
          key={`${caseId}-${revision}`}
          joinOptions={{ displayName: "Effect gallery", deck: { mainDeck: [], eggDeck: [] } }}
          identityColor="Red"
          onExit={() => window.location.assign("/")}
          demoConnection={{
            room: undefined,
            status: "connected",
            state,
            events: [],
            batches: [],
            decision: active ? handDecision : undefined,
            respondDecision: respond,
            acknowledgeDecision: () => {},
            error: undefined,
            sessionId: "arena-demo-0",
            roomCode: "",
          }}
        />
        {active ? (
          handDecision ? null : (
            <GalleryPrompt key={`${caseId}-${revision}`} caseId={caseId} board={boardRef.current} onRespond={respond} />
          )
        ) : (
          <section className="effect-prompt-gallery__response" role="status">
            <strong>{locale === "pt-BR" ? "Resposta enviada" : "Response sent"}</strong>
            <pre>{JSON.stringify(response, null, 2)}</pre>
            <Button onClick={() => selectCase(caseId)}>
              {locale === "pt-BR" ? "Reabrir cenário" : "Replay scenario"}
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}

function GalleryPrompt({
  caseId,
  board,
  onRespond,
}: {
  caseId: CaseId;
  board: HTMLElement | null;
  onRespond: (value: unknown) => void;
}) {
  const { t } = useTranslation();
  const [picks, setPicks] = useState<string[]>([]);
  const [counterSource, setCounterSource] = useState<string>();
  const [sourceHost, setSourceHost] = useState<string>();
  const [zoom, setZoom] = useState<string>();
  const [optionalDialog, setOptionalDialog] = useState(false);
  const permanents = useMemo(
    () => [
      permanent({
        permanentId: "gallery-host-1",
        cardId: CARDS.champion,
        baseDP: 4000,
        stackCardIds: [CARDS.egg, CARDS.rookie],
      }),
      permanent({
        permanentId: "gallery-host-2",
        cardId: CARDS.ultimate,
        baseDP: 7000,
        stackCardIds: [CARDS.rookie, CARDS.champion],
      }),
      permanent({
        permanentId: "gallery-host-3",
        cardId: CARDS.opponentChampion,
        baseDP: 5000,
        seat: 1,
        suspended: true,
      }),
    ],
    [],
  );
  const close = () => onRespond({ action: "cancel" });
  const yesNo = (action: string) => onRespond({ action });
  const blockers = permanents.slice(0, 2).map((entry) => ({
    permanentId: entry.permanentId,
    cardId: entry.topCard.cardId,
    currentDP: entry.currentDP,
    sourceCount: entry.stack.length,
  }));
  if (caseId === "barrier" || caseId === "evade") {
    const Component = caseId === "barrier" ? BarrierOverlay : EvadeOverlay;
    return (
      <Component
        permanentId="gallery-host-1"
        getCardId={() => CARDS.champion}
        onAccept={() => yesNo("accept")}
        onDecline={() => yesNo("decline")}
      />
    );
  }
  if (caseId === "block" || caseId.startsWith("collision"))
    return (
      <BlockOverlay
        attackerCardId={CARDS.opponentUltimate}
        mustBlock={caseId.startsWith("collision")}
        blockers={caseId === "collision-empty" ? [] : blockers}
        onBlock={(permanentId) => onRespond({ action: "block", permanentId })}
        onDecline={() => yesNo("decline")}
      />
    );
  if (caseId === "alliance" || caseId === "alliance-empty")
    return (
      <AllianceOverlay
        attackerCardId={CARDS.mega}
        allies={caseId === "alliance-empty" ? [] : blockers}
        onChoose={(permanentId) => onRespond({ action: "alliance", permanentId })}
        onPass={() => yesNo("pass")}
      />
    );
  if (caseId.startsWith("counter-")) {
    const eligibleCounters =
      caseId === "counter-empty"
        ? []
        : caseId === "counter-field"
          ? [
              {
                instanceId: "field-counter",
                effectKey: "gallery/counter",
                description: getCardDefinition("BT10-083")?.effectText ?? "[Counter] Activate this effect.",
              },
            ]
          : caseId === "counter-blast"
            ? [
                {
                  instanceId: "blast-hand",
                  effectKey: "blast-digivolve:gallery-host-1",
                  description: "Blast Digivolve",
                },
                {
                  instanceId: "blast-hand",
                  effectKey: "blast-digivolve:gallery-host-2",
                  description: "Blast Digivolve",
                },
              ]
            : [
                {
                  instanceId: "blast-hand",
                  effectKey: "blast-digivolve:gallery-host-1",
                  description: "Blast Digivolve",
                },
                {
                  instanceId: "field-counter",
                  effectKey: "gallery/counter",
                  description: "[Counter] Activate this effect.",
                },
              ];
    return (
      <CounterOverlay
        eligibleCounters={eligibleCounters}
        getCardId={(id) =>
          permanents.find((entry) => entry.permanentId === id)?.topCard.cardId ??
          (id === "blast-hand" ? "BT12-017" : "BT10-083")
        }
        fieldPermanentOf={(id) => (id === "field-counter" ? "gallery-host-1" : undefined)}
        selectedInstanceId={counterSource ?? (caseId === "counter-blast" ? "blast-hand" : undefined)}
        onSelectInstance={setCounterSource}
        handInstanceIds={["blast-hand"]}
        onActivate={(instanceId, effectKey) => onRespond({ action: "counter", instanceId, effectKey })}
        onPass={() => yesNo("pass")}
      />
    );
  }
  if (caseId === "confirm-action")
    return (
      <ActionConfirmationOverlay
        cardId={CARDS.mega}
        title={t("overlay.confirmActionTitle")}
        detail={t("overlay.confirmPlayDetail", { card: getCardDefinition(CARDS.mega)?.nameEn ?? CARDS.mega })}
        confirmLabel={t("overlay.confirmPlay")}
        onConfirm={() => yesNo("play")}
        onCancel={close}
      />
    );
  if (caseId === "dual-play")
    return (
      <DualPlayChoiceOverlay
        cardId="EX13-066"
        onChoose={(useAs) => onRespond({ action: "dualPlay", useAs })}
        onCancel={close}
      />
    );
  if (caseId === "evo-cost")
    return (
      <EvoCostChoiceOverlay
        evolvingCardId={CARDS.ultimate}
        baseCardId={CARDS.champion}
        memory={3}
        options={[
          { type: "normal", label: "Normal", cost: 4 },
          { type: "alternate", label: "Alternate requirement", cost: 2, alternateRequirementIndex: 0 },
        ]}
        onConfirm={(route) => onRespond({ action: "digivolve", route })}
        onCancel={close}
      />
    );
  if (caseId === "assembly")
    return (
      <AssemblyMaterialOverlay
        playingCardId="EX13-014"
        requirements={assemblyRequirementFor("EX13-014") ?? []}
        candidates={["BT20-014", "BT13-013", "BT20-008", "BT1-010"].map((cardId, index) => ({
          instanceId: `trash-${index}`,
          cardId,
        }))}
        onConfirm={(instanceIds) => onRespond({ action: "assembly", instanceIds })}
        onSkip={() => yesNo("normalPlay")}
        onCancel={close}
      />
    );
  if (caseId === "digixros-expander")
    return (
      <DigiXrosExpanderPrompt
        expander={EXPANDER}
        copyIndex={1}
        copyCount={1}
        onAnswer={(accept) => onRespond({ action: "expander", accept })}
      />
    );
  if (caseId === "digixros")
    return (
      <DigiXrosMaterialOverlay
        playingCardId="BT10-024"
        requirements={digiXrosRequirementFor("BT10-024") ?? []}
        candidates={[
          { instanceId: "mailbirdramon-hand", cardId: "BT10-021", zone: "hand" },
          { instanceId: "greymon-field", cardId: "BT10-019", zone: "battle" },
        ]}
        lockedCandidates={[{ instanceId: "greymon-under", cardId: "BT10-019", zone: "underTamer" }]}
        eligibleExpanders={[EXPANDER]}
        onConfirm={(instanceIds, expanders) => onRespond({ action: "digiXros", instanceIds, expanders })}
        onSkip={() => yesNo("normalPlay")}
        onCancel={close}
      />
    );
  if (caseId.startsWith("app-fusion"))
    return (
      <AppFusionChoiceOverlay
        resultCardId="BT23-021"
        hostCardId="BT23-016"
        routes={
          caseId === "app-fusion-empty"
            ? []
            : [
                { linkedInstanceId: "link-1", linkedCardId: "BT23-039", projectedCost: 2 },
                { linkedInstanceId: "link-2", linkedCardId: "BT23-007", projectedCost: 3 },
              ]
        }
        onConfirm={(linkedInstanceId) => onRespond({ action: "appFusion", linkedInstanceId })}
        onNormalEvolution={() => yesNo("normalEvolution")}
        onCancel={close}
      />
    );
  if (caseId.startsWith("mulligan-"))
    return (
      <MulliganOverlay
        handCardIds={SELECT_CARDS.slice(0, 5)}
        turnOrder={caseId === "mulligan-first" ? "first" : "second"}
        onKeep={() => yesNo("keep")}
        onMulligan={() => yesNo("mulligan")}
      />
    );
  if (caseId === "inherited-inspector")
    return (
      <>
        <ArenaPermanentInspector
          detail={buildPermanentDetail(INSPECTED_PERMANENT, { viewerSeat: 0 })}
          inspection={{ side: Side.Viewer, container: board }}
          onClose={close}
          onZoom={setZoom}
          zoomed={zoom !== undefined}
        />
        {zoom ? <CardZoomOverlay cardId={zoom} onClose={() => setZoom(undefined)} /> : null}
      </>
    );

  let candidates: { instanceId: string; cardId?: string; zone?: CandidateZone }[] = SELECT_CARDS.map(
    (cardId, index) => ({ instanceId: `hand-${index}`, cardId, zone: "hand" }),
  );
  const request: DecisionRequest = {
    decisionId: `gallery-${caseId}`,
    seat: 0,
    kind: "optional",
    promptText: "",
    sourceCardId: CARDS.champion,
    options: { timing: "OnUseAttack", effectText: getCardDefinition(CARDS.champion)?.effectText, min: 0, max: 2 },
  };
  if (caseId.startsWith("optional-")) candidates = [];
  if (caseId === "choose-yes-no") {
    request.kind = "chooseOption";
    request.options = { choices: [t("overlay.use"), t("overlay.notUse")], declineIndex: 1 };
    candidates = [];
  }
  if (caseId === "choose-clauses") {
    request.kind = "chooseOption";
    request.sourceCardId = "BT22-013";
    request.options = {
      choices: ["Digivolve", "Delete", "Don't use"],
      timing: "WhenDigivolving",
      effectText: getCardDefinition("BT22-013")?.effectText,
      choiceClauses: [
        "1 of your [Gabumon] may digivolve into [MetalGarurumon] in the hand, ignoring digivolution requirements and without paying the cost.",
        "Delete 1 of your opponent's Digimon with the lowest DP.",
        "",
      ],
      declineIndex: 2,
    };
    candidates = [];
  }
  if (caseId === "choose-effects") {
    request.kind = "chooseOption";
    request.options = {
      choices: ["Agumon effect", "Greymon effect"],
      choiceEffects: [
        { cardId: CARDS.rookie, isInherited: true },
        { cardId: CARDS.champion, isInherited: true },
      ],
    };
    candidates = [];
  }
  if (caseId === "choose-revealed") {
    request.kind = "chooseOption";
    request.options = { choices: ["top", "bottom"], topBottomZone: "deck" };
    candidates = candidates.slice(0, 3);
  }
  if (caseId.startsWith("select-") || caseId === "source-host") {
    request.kind = "selectCards";
    if (caseId === "select-field" || caseId === "select-dp-budget") {
      request.kind = "chooseTargets";
      candidates = permanents.map((entry) => ({
        instanceId: entry.permanentId,
        cardId: entry.topCard.cardId,
        zone: entry.controllerSeat === 0 ? "battle" : "opponentBattle",
      }));
    }
    if (caseId === "select-mixed")
      candidates = candidates.map((entry, index) => ({
        ...entry,
        zone: ["hand", "trash", "battle", "digivolutionCards", "security", "opponentBattle"][index] as CandidateZone,
      }));
    if (caseId === "select-player") {
      request.kind = "chooseTargets";
      request.sourcePermanentId = "gallery-host-1";
      candidates = [{ instanceId: "player" }];
      request.options = { min: 1, max: 1, candidateInstanceIds: ["player"], selectionContext: "attackTarget" };
    }
    if (caseId === "select-empty") candidates = [];
    if (caseId === "select-dp-budget") request.options = { min: 1, max: 3, maxTotalDP: 12000, targetFate: "delete" };
    if (caseId === "select-cost-budget") request.options = { min: 0, max: 3, maxTotalPlayCost: 7 };
    if (caseId === "source-host") {
      request.options = { ...request.options, min: 1, max: 1 };
      candidates = permanents.flatMap((entry) =>
        [...entry.stack].map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          zone: "digivolutionCards" as const,
        })),
      );
    }
    request.options = { ...request.options, candidateInstanceIds: candidates.map((entry) => entry.instanceId) };
  }
  if (caseId === "order-cards") {
    request.kind = "orderCards";
    request.options = { orderDestination: "deckBottom" };
    candidates = candidates.slice(0, 4);
  }
  if (["order-triggers", "order-same-card", "resolution-plan"].includes(caseId)) {
    Object.assign(request, caseId === "order-same-card" ? SAME_PERMANENT_TRIGGER_DECISION : TRIGGER_DECISION);
    request.decisionId = `gallery-${caseId}`;
    request.options = {
      ...request.options,
      acceptsResolutionPlan: caseId === "resolution-plan",
      triggerDescriptions: [
        getCardDefinition(CARDS.champion)?.effectText ?? "",
        getCardDefinition(CARDS.ultimate)?.effectText ?? "",
      ],
      triggerIsOptional: [true, false],
      waitingTriggerCardIds: caseId === "resolution-plan" ? [CARDS.rookie] : [],
    };
    candidates = [];
  }
  if (caseId === "partition") {
    request.kind = "selectCards";
    candidates = candidates.slice(0, 1);
    request.options = {
      min: 0,
      max: 1,
      selectionContext: "partitionActivation",
      candidateInstanceIds: [candidates[0]!.instanceId],
    };
  }
  if (caseId === "effect-evo-cost") {
    request.kind = "chooseOption";
    request.options = {
      choices: ["Normal", "Alternate"],
      digivolveCostChoice: { fromCardId: CARDS.champion, intoCardId: CARDS.ultimate, costs: [4, 2], costDelta: -1 },
    };
    candidates = [];
  }
  return (
    <DecisionPrompts
      decision={request}
      answerOnBoard={caseId === "optional-field" && !optionalDialog}
      permanents={permanents}
      sourceCardId={request.sourceCardId}
      candidates={candidates}
      allowsPick={(id) => picks.includes(id) || picks.length < (request.options?.max ?? 1)}
      picks={picks}
      min={request.options?.min ?? 1}
      max={request.options?.max ?? 1}
      triggerDetails={[]}
      opponentSelecting={false}
      opponentSecurityCount={5}
      onTogglePick={(id) =>
        setPicks((selected) => (selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]))
      }
      onRespond={onRespond}
      onOpenDialog={() => setOptionalDialog(true)}
      sourceHost={
        caseId === "source-host"
          ? {
              picking: sourceHost === undefined,
              cardIds: sourceHost
                ? new Set(
                    [...permanents.find((entry) => entry.permanentId === sourceHost)!.stack].map(
                      (card) => card.instanceId,
                    ),
                  )
                : undefined,
              hostPermanentIds: permanents.slice(0, 2).map((entry) => entry.permanentId),
              onChooseHost: setSourceHost,
              onChangeHost: () => {
                setSourceHost(undefined);
                setPicks([]);
              },
            }
          : undefined
      }
    />
  );
}
