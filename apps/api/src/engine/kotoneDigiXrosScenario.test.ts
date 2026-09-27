import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("runs the Kotone arena scenario through DigiXros and the retained EX6 attack", async () => {
  const automation = {
    autoDeclineOptional: true,
    autoSelectCards: true,
    preferInstanceIds: [] as string[],
    preferTriggerKeys: ["BT19-014", "BT19-035"],
  };
  const s = setupEngine({ 0: {}, 1: {} }, automation);
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-kotone-digixros-pending-attack");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    const human = s.state.players[0]!;
    const kotone = human.battleArea.find((p) => p.topCard.cardId === "P-224")!;
    const materialTaiki = human.battleArea.find((p) => p.topCard.cardId === "BT10-087")!;
    const attackTaiki = human.battleArea.find((p) => p.topCard.cardId === "BT21-083")!;
    const ex6 = kotone.stack.find((c) => c.cardId === "BT19-014")!;
    const x7 = human.hand.find((c) => c.cardId === "AD1-006")!;
    expect(s.state.memory).toBe(20);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: x7.instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(7);
    expect(attackTaiki.isSuspended).toBe(false);

    automation.autoDeclineOptional = false;
    automation.preferInstanceIds.push(ex6.instanceId, materialTaiki.permanentId);
    const effect = observe(s.engine).activatableEffects(kotone)[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: kotone.topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    async function answerOptional(sourceCardId: string, accept: boolean) {
      const req = s.decisions.at(-1)!.req;
      expect(req).toMatchObject({ kind: "optional", sourceCardId });
      expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle();
    }
    await answerOptional("P-224", true);
    const expanderDecision = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(materialTaiki.topCard.instanceId),
    )!.req;
    expect(expanderDecision).toMatchObject({
      sourceCardId: "BT10-087",
      sourceInstanceId: materialTaiki.topCard.instanceId,
      sourcePermanentId: materialTaiki.permanentId,
    });
    expect(expanderDecision.options?.effectText).toContain("DigiXros");
    expect(expanderDecision.options?.effectText).not.toContain("level 5");
    const hostDecision = s.decisions.find(
      ({ req }) =>
        req.kind === "chooseTargets" && req.options?.candidateInstanceIds?.includes(materialTaiki.permanentId),
    )!.req;
    expect(hostDecision).toMatchObject({ sourceCardId: "BT10-087" });
    expect(hostDecision.options?.effectText).toContain("Select 1 Tamer");
    const materialsDecision = s.decisions.find(({ req }) => req.options?.digiXrosCardId === "BT19-014")!.req;
    expect(materialsDecision).toMatchObject({ sourceCardId: "BT19-014", sourceInstanceId: ex6.instanceId });
    expect(materialsDecision.options?.effectText).toContain("Select DigiXros materials");
    expect(materialsDecision.options?.effectTextPart).toBeUndefined();
    expect(materialTaiki.isSuspended).toBe(true);
    const played = human.battleArea.find((p) => p.topCard.instanceId === ex6.instanceId)!;
    expect(played.stack.map((c) => c.cardId).sort()).toEqual(["BT19-061", "BT21-021"]);
    expect(s.state.memory).toBe(1);
    await answerOptional("BT19-014", true);
    expect(human.battleArea.some((p) => p.topCard.cardId === "BT19-035")).toBe(true);
    await answerOptional("BT21-083", false);
    await answerOptional("BT21-083", true);
    expect(s.events.some((event) => event.kind === "alliancePrompt")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({ attackerCardId: "BT19-014" }),
    ]);
    expect(attackTaiki.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
