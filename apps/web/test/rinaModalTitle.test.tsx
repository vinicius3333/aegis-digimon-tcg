// @vitest-environment jsdom
import { Phase, type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@aegis-api/cards/EX13/EX13-069.js";
import "@aegis-api/cards/EX11/EX11-062.js";
import "@aegis-api/cards/ST8/ST8-11.js";
import "@aegis-api/cards/BT3/BT3-021.js";
import "@aegis-api/cards/BT1/BT1-115.js";
import { layDevScenario } from "@aegis-api/engine/devScenario.js";
import { BLUE_DECK, RED_DECK } from "@aegis-api/engine/testDecks.js";
import { setupEngine, settle } from "@aegis-api/engine/testkit/harness.js";
import { advance } from "@aegis-api/engine/testkit/advance.js";
import { I18nProvider } from "../src/i18n";
import { DecisionOverlay } from "../src/game/overlay/choice/DecisionOverlay";

afterEach(cleanup);

function mount(request: DecisionRequest) {
  const respond = vi.fn<(response: DecisionResponse) => void>();
  render(
    <I18nProvider>
      <DecisionOverlay
        request={request}
        sourceCardId={request.sourceCardId}
        candidates={[]}
        picks={[]}
        onTogglePick={vi.fn<(instanceId: string) => void>()}
        onRespond={respond}
      />
    </I18nProvider>,
  );
  return respond;
}

it.each([
  ["en", "Use this effect?"],
  ["pt-BR", "Usar este efeito?"],
])("Rina modal title report: renders real engine requests in %s", async (locale, activationTitle) => {
  localStorage.setItem("aegis:locale", locale);
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-ex13-rina-modal-title", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const veemon = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT3-021")!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: veemon.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-rina-title-sword" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("EX13-069");
    expect(request.promptText).toContain("When any of your Digimon unsuspend");
    expect(request.options?.effectTextPart).toBe(
      "[Your Turn] When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞.",
    );
    const respond = mount(request);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(activationTitle);
    expect(document.querySelector(".decision-overlay__effect-text")?.textContent).toBe(request.options?.effectTextPart);
    fireEvent.click(screen.getByRole("button", { name: /yes, activate|sim, ativar/i }));
    expect(respond).toHaveBeenCalledWith({ kind: "optional", accept: true });
    cleanup();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const followOn = s.decisions.at(-1)!.req;
    expect(followOn.promptText).toBe("Digivolve");
    expect(followOn.options?.effectTextPart).toMatch(/^After, 1 of your Digimon may digivolve/);
    mount(followOn);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(activationTitle);
    expect(document.querySelector(".decision-overlay__effect-text")?.textContent).toBe(
      followOn.options?.effectTextPart,
    );
    cleanup();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: followOn.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => veemon.topCard.cardId === "BT1-115" && s.state.pendingDecision === undefined);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it("sweep: Shoto EX11-062's reachable watcher keeps its printed passage in the body", async () => {
  localStorage.setItem("aegis:locale", "en");
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "EX11-062", as: "shoto" },
        { card: "BT3-021", as: "veemon" },
      ],
      eggDeck: ["EX13-002"],
      hand: ["BT1-009"],
      deck: ["BT1-009", "BT1-009"],
    },
    1: { security: ["BT1-009"], deck: ["BT1-009"] },
  });
  s.state.memory = 6;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("veemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("EX11-062");
    expect(request.promptText).toMatch(/^When any Digimon suspend/);
    mount(request);
    // This card's catalog omits the period after Draw 1, so its supplied part falls back
    // to the full printed clause. Preserve that body while checking the heading defect.
    expect(document.querySelector(".decision-overlay__effect-text")?.textContent).toContain("After, 1 of your Digimon");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Use this effect?");
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it.each([
  { promptText: "Confirm your choice?", kind: "optional" as const, title: "Use this effect?" },
  {
    promptText: "Activate Blitz",
    kind: "optional" as const,
    options: { promptKey: "activateBlitz" as const },
    title: "Use this effect?",
  },
  {
    promptText: "Select an opponent",
    kind: "chooseTargets" as const,
    options: { selectionContext: "attackTarget" as const },
    title: "Attack",
  },
  {
    promptText: "Choose a cost",
    kind: "chooseOption" as const,
    options: { purpose: "cost" as const, choices: ["Pay"] },
    title: "Choose a cost",
  },
])("shows the $title heading for $promptText", ({ title, ...request }) => {
  localStorage.setItem("aegis:locale", "en");
  mount({
    decisionId: "control",
    seat: 0,
    ...request,
    sourceCardId: "EX13-069",
    options: {
      ...request.options,
      effectTextPart: "[Your Turn] When any of your Digimon unsuspend, by suspending this Tamer, ＜Draw 1＞.",
    },
  });
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(title);
});
