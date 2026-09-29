import { describe, expect, it } from "vitest";
import { type DecisionResponse, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-06", () => {
  it("matches the 6000 DP security placement clause", () => {
    expect(getCardDefinition("ST21-06")?.effectText).toContain("6000 DP or lower");
    const a = runtimeCompiledCard("ST21-06")
      ?.effects.find((x) => x.trigger === "OnPlay")
      ?.actions.find((action) => action.kind === "SecurityManipulation");
    expect(a).toMatchObject({
      kind: "SecurityManipulation",
      toTop: true,
      sourceDpCeilingScaling: { per: 2, unit: "colors", amount: 2000 },
    });
  });
  it("retains both play and digivolve Adventure triggers", () => {
    const e = runtimeCompiledCard("ST21-06")?.effects ?? [];
    expect(e.some((x) => x.trigger === "OnPlay")).toBe(true);
    expect(e.some((x) => x.trigger === "WhenDigivolving")).toBe(true);
  });

  it("raises the security-placement DP limit by 2000 for two Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST21-05", as: "base" },
            { card: "ST21-12", as: "twoColorTamer" },
          ],
          hand: [{ card: "ST21-06", as: "magna" }],
        },
        1: { battleArea: [{ card: "ST21-09", as: "sevenKTarget" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.cardId === "ST21-09"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-09")).toBe(false);
    expect(s.state.players[1]!.security[0]?.cardId).toBe("ST21-09");
  });

  it("keeps a Digimon above the unscaled 6000 DP boundary in play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-06", as: "magna" }] },
        1: { battleArea: [{ card: "ST21-09", as: "above", dp: 6001 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<unknown> }).mainVerbChain;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("magna").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("above").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("ST21-06 MagnaAngemon — KB Q&A rulings", () => {
  function boardWithWatcher(playedCardId: string) {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST21-06", as: "source" },
          { card: "ST21-07", as: "ally" },
        ],
        hand: [{ card: playedCardId, as: "played" }],
      },
      1: { security: ["ST1-03", "ST1-03"] },
    });
    s.state.memory = 10;
    return s;
  }

  async function answer(s: ReturnType<typeof boardWithWatcher>, kind: string, response: DecisionResponse) {
    await settle(() => s.state.pendingDecision?.kind === kind);
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("ST21-06");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response,
      }),
    ).toEqual({ ok: true });
  }

  async function playAndGiveAllianceToAlly(s: ReturnType<typeof boardWithWatcher>) {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await answer(s, "chooseTargets", { kind: "chooseTargets", instanceIds: [s.perm("ally").permanentId] });
  }

  it("gives Alliance without a prompt to decline it when an ADVENTURE Digimon is played (Q4475)", async () => {
    const s = boardWithWatcher("ST21-10");
    await playAndGiveAllianceToAlly(s);
    const firstPrompt = s.decisions.find(({ req }) => req.sourceCardId === "ST21-06")!.req;
    expect(firstPrompt.kind).toBe("chooseTargets");
    expect(firstPrompt.options?.min).toBe(1);
    await answer(s, "optional", { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Alliance")).toBe(true);
  });

  it("lets a different Digimon attack than the one that gained Alliance (Q4476)", async () => {
    const s = boardWithWatcher("ST21-10");
    await playAndGiveAllianceToAlly(s);
    await answer(s, "optional", { kind: "optional", accept: true });
    await answer(s, "chooseTargets", { kind: "chooseTargets", instanceIds: [s.perm("source").permanentId] });
    await answer(s, "selectCards", { kind: "selectCards", instanceIds: ["player"] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);
    const attacks = s.events.filter((event) => event.kind === "attackDeclared");
    expect(attacks).toHaveLength(1);
    expect(attacks[0]).toMatchObject({ attackerPermanentId: s.perm("source").permanentId });
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("may decline the attack after the Alliance is given (Q4477)", async () => {
    const s = boardWithWatcher("ST21-10");
    await playAndGiveAllianceToAlly(s);
    await answer(s, "optional", { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Alliance")).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("still offers the attack when the played Digimon lacks the [ADVENTURE] trait (Q4700)", async () => {
    const s = boardWithWatcher("ST1-03");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await answer(s, "optional", { kind: "optional", accept: true });
    await answer(s, "chooseTargets", { kind: "chooseTargets", instanceIds: [s.perm("source").permanentId] });
    await answer(s, "selectCards", { kind: "selectCards", instanceIds: ["player"] });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const watcherPrompts = s.decisions.filter(({ req }) => req.sourceCardId === "ST21-06").map(({ req }) => req.kind);
    expect(watcherPrompts).toEqual(["optional", "chooseTargets", "selectCards"]);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Alliance")).toBe(false);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toEqual([
      expect.objectContaining({ attackerPermanentId: s.perm("source").permanentId }),
    ]);
  });
});
