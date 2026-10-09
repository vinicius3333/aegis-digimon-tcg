import { writeFile } from "node:fs/promises";
import { expect, test as base, type Page, type TestInfo } from "@playwright/test";
import { RED_DECK } from "../../api/dist/engine/testDecks.js";
import { getCardDefinition, type DecisionRequest } from "@aegis/shared";
import { startBrowserServer } from "./server";
import type {} from "./harness";

type Snapshot = ReturnType<Window["browserTestSnapshot"]>;
type Decision = NonNullable<Snapshot["pendingDecision"]> &
  Pick<DecisionRequest, "sourceCardId" | "sourceInstanceId" | "sourcePermanentId"> & {
    options: NonNullable<DecisionRequest["options"]>;
  };
type Selection = {
  accept?: boolean;
  cardId?: string;
  instanceId?: string;
  instanceIds?: string[];
  triggerCardId?: string;
  choice?: number;
};
export type DecisionPolicy = (decision: Decision) => Selection | Promise<Selection>;

/** Drives only visible controls; snapshots and probes are read-only evidence. */
export class ScenarioPage {
  readonly errors: string[] = [];
  constructor(readonly page: Page) {
    page.on("pageerror", (error) => this.errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") this.errors.push(message.text());
    });
  }
  async open(id: string, speed: "normal" | "slow" = "normal", breeding: "end" | "move" = "end") {
    await this.page.addInitScript(
      ({ id: scenarioId, speed: effectSpeed, deck }) => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.effect-speed", effectSpeed);
        localStorage.setItem("aegis.action-confirmation.enabled", "false");
        localStorage.setItem("aegis.skip-end-turn-confirmation", "true");
        window.browserTestOptions = {
          displayName: "Scenario E2E",
          seed: 1,
          deck,
          devScenario: scenarioId as Window["browserTestOptions"]["devScenario"],
        };
      },
      { id, speed, deck: RED_DECK },
    );
    await this.page.goto("/e2e/harness.html");
    if (breeding === "move") {
      await expect(this.page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled();
      const slot = this.page.locator('[data-drop="breeding-you"]');
      await slot.focus();
      await slot.press("Enter");
    } else await this.page.getByRole("button", { name: /^end breeding$/i }).click();
  }
  snapshot() {
    return this.page.evaluate(() => window.browserTestSnapshot());
  }
  presentation() {
    return this.page.evaluate(() => window.browserTestPresentation());
  }
  async idle(timeout = 15_000) {
    await expect.poll(async () => (await this.presentation()).idle, { timeout }).toBe(true);
  }
  async hand(name: string) {
    const card = this.page.getByTestId("hand").getByRole("button", { name: `Select ${name}`, exact: true });
    await card.focus();
    await card.press("Enter");
  }
  async play(name: string, kind: "Digimon" | "Option" | "Tamer") {
    await this.hand(name);
    await this.page.getByRole("button", { name: `Play ${kind}`, exact: true }).click();
  }
  async evolve(name: string, permanentId: string, cheapest = false) {
    await this.hand(name);
    await this.page.getByRole("button", { name: "Digivolve", exact: true }).click();
    await this.page.locator(`[data-drop="perm-you"][data-id="${permanentId}"]`).click();
    if (cheapest) await this.page.locator(".evo-cost-prompt__option[data-recommended]").click();
  }
  async attack(permanentId: string) {
    await this.page.locator(`[data-drop="perm-you"][data-id="${permanentId}"]`).click();
    await this.page.getByRole("button", { name: "Attack", exact: true }).click();
    await this.page.getByRole("button", { name: /^Opponent security/ }).click();
  }
  async resolveUntil(
    done: (state: Snapshot) => boolean,
    policy: DecisionPolicy = () => ({}),
    presentationTimeout = 15_000,
  ) {
    for (let count = 0; count < 40; count++) {
      await expect
        .poll(
          async () => {
            const state = await this.snapshot();
            return done(state) || !!state.pendingDecision;
          },
          { timeout: 10_000 },
        )
        .toBe(true);
      const state = await this.snapshot();
      if (done(state)) {
        if (!state.pendingDecision && !state.combatWindow) await this.idle(presentationTimeout);
        return;
      }
      const pending = state.pendingDecision!;
      const request = (await this.presentation()).decisions.find((d) => d.decisionId === pending.decisionId);
      const decision = {
        ...pending,
        ...request,
        options: request?.options ?? JSON.parse(pending.payloadJson || "{}"),
      } as Decision;
      const selection = await policy(decision);
      await base.step(`${decision.kind}: ${decision.promptText}`, async () => {
        if (decision.kind === "optional") {
          await this.page
            .getByRole("button", { name: selection.accept === false ? "No, decline" : "Yes, activate", exact: true })
            .click();
        } else if (decision.kind === "orderTriggers") {
          const panel = this.page
            .getByRole("dialog")
            .filter({ has: this.page.getByRole("heading", { name: "Order pending effects", exact: true }) });
          await expect(panel).toBeVisible();
          if (selection.triggerCardId) {
            const name = getCardDefinition(selection.triggerCardId)!.nameEn;
            await panel
              .getByRole("button", { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
              .first()
              .click();
          } else {
            const all = panel.getByRole("button", { name: "Select all, top to bottom", exact: true });
            if (await all.count()) await all.click();
          }
          await panel.getByRole("button", { name: /^Resolve (next effect|in this order|effect)$/ }).click();
        } else if (decision.kind === "orderCards") {
          await this.page.getByRole("button", { name: "Confirm order", exact: true }).click();
        } else if (decision.kind === "chooseOption") {
          const index = selection.choice ?? (selection.accept === false ? decision.options.declineIndex : 0) ?? 0;
          if (decision.options.digivolveCostChoice)
            await this.page.locator(".digivolve-cost-choice__option").nth(index).click();
          else
            await this.page
              .getByRole("dialog")
              .getByRole("button", { name: decision.options.choices![index]!, exact: true })
              .click();
        } else if (decision.kind === "selectCards" && decision.options.digiXrosCardId) {
          await this.page.getByRole("button", { name: "Play without DigiXros", exact: true }).click();
        } else if (decision.kind === "selectCards" || decision.kind === "chooseTargets") {
          if (selection.accept === false && decision.options.min === 0) {
            await this.page.getByRole("button", { name: /^(No selection|Pass · no selection|Pass)$/i }).click();
          } else {
            const candidates = decision.options.candidateInstanceIds!;
            const cards = [
              ...state.players.flatMap((player) => [
                ...(player.hand ?? []),
                ...(player.trash ?? []),
                ...player.battleArea.flatMap((p) => [p.topCard, ...p.stack]),
              ]),
              ...(decision.options.visibleCards ?? []),
            ];
            const instanceId =
              selection.instanceId ??
              (selection.cardId
                ? candidates.find(
                    (id) =>
                      cards.find((card) => card.instanceId === id)?.cardId === selection.cardId ||
                      state.players.some((player) =>
                        player.battleArea.some((p) => p.permanentId === id && p.topCard.cardId === selection.cardId),
                      ),
                  )
                : candidates[0]);
            expect(instanceId, `legal candidate for ${selection.cardId ?? decision.promptText}`).toBeTruthy();
            const confirm = this.page.getByRole("button", {
              name: /^(Confirm targets|End Selection|Confirm|Declare attack|Attack)$/i,
            });
            await expect(confirm).toBeVisible();
            const pickedIds =
              decision.options.selectionContext === "attackTarget" &&
              candidates.length === 1 &&
              (decision.options.min ?? 0) >= 1
                ? [] // The mandatory single attack target is already selected by the UI.
                : (selection.instanceIds ??
                  (selection.instanceId || selection.cardId
                    ? [instanceId!]
                    : candidates.slice(0, Math.max(1, decision.options.min ?? 1))));
            for (const pickedId of pickedIds) {
              const modal = this.page.getByRole("dialog").locator(`[data-instance-id="${pickedId}"]`);
              if (await modal.count()) {
                if ((await modal.getAttribute("aria-pressed")) !== "true") await modal.click();
              } else {
                const hand = this.page.locator(`.game-hand--selecting [data-hand-instance-id="${pickedId}"]`);
                if (await hand.count()) {
                  await hand.focus();
                  await hand.press("Enter");
                } else {
                  const permanent = state.players
                    .flatMap((p) => [...p.battleArea])
                    .find((p) => p.permanentId === pickedId || p.topCard.instanceId === pickedId);
                  if (!permanent && pickedId === "player") {
                    await this.page.getByRole("button", { name: /^Opponent security/ }).click();
                    continue;
                  }
                  expect(permanent, `physical field candidate ${instanceId}`).toBeDefined();
                  await this.page.locator(`[data-id="${permanent!.permanentId}"][role="button"]`).click();
                }
              }
            }
            await confirm.click();
          }
        } else throw new Error(`Unsupported visible decision: ${decision.kind}`);
        await expect
          .poll(async () => (await this.snapshot()).pendingDecision?.decisionId, { timeout: 8_000 })
          .not.toBe(decision.decisionId);
      });
    }
    throw new Error("Scenario exceeded 40 decisions");
  }
  async healthy({ timedCatchUp = false }: { timedCatchUp?: boolean } = {}) {
    await this.idle();
    const probe = await this.presentation();
    expect(this.errors).toEqual([]);
    expect(probe.pending).toBe(0);
    expect(probe.gateExpiries).toEqual([]);
    expect(probe.steps.filter((s) => s.failed || s.cancelled)).toEqual([]);
    expect(probe.counters).toEqual({
      boardBudgetHits: 0,
      decisionBudgetHits: 0,
      decisionStallHits: 0,
      // Timed matches intentionally catch cosmetic tracks up at each decision.
      skips: timedCatchUp ? probe.counters.skips : 0,
      manualAdvances: 0,
    });
    const finished = probe.steps.filter((s) => s.phase === "finished");
    // Even non-blocking execution slots must finish; a 45 s ceiling is not success.
    for (const step of finished.filter((s) => s.id.startsWith("draw-presentation-") || s.id.startsWith("zone-change-")))
      expect(step.durationMs, step.id).toBeLessThan(6_000);
    expect(
      probe.steps
        .filter((s) => s.phase === "started")
        .map((s) => s.id)
        .sort(),
    ).toEqual(finished.map((s) => s.id).sort());
  }
  async evidence(info: TestInfo) {
    if (this.page.isClosed()) return;
    const evidence = await this.page.evaluate(() =>
      typeof window.browserTestPresentation === "function"
        ? { ...window.browserTestPresentation(), snapshot: window.browserTestSnapshot?.() }
        : { unavailable: true },
    );
    const path = info.outputPath("presentation-timings.json");
    await writeFile(path, JSON.stringify(evidence, null, 2));
    await info.attach("presentation-timings", { path, contentType: "application/json" });
  }
}
export const test = base.extend<{
  scenario: ScenarioPage;
  botOptionalScript: { sourceCardId: string; answers: boolean[] } | undefined;
  holdBotAfterTurn: number;
}>({
  botOptionalScript: [undefined, { option: true }],
  holdBotAfterTurn: [2, { option: true }],
  scenario: async ({ page, botOptionalScript, holdBotAfterTurn }, use, info) => {
    const server = await startBrowserServer({ holdBotAllTurns: false, botOptionalScript, holdBotAfterTurn });
    const scenario = new ScenarioPage(page);
    try {
      await use(scenario);
    } finally {
      try {
        await scenario.evidence(info);
      } finally {
        try {
          await page.close();
        } finally {
          await server.close();
        }
      }
    }
  },
});
export { expect };
