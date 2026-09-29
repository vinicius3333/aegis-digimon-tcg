import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-068.js";
import "./index.js";
import "../BT2/BT2-107.js";

describe("BT20-068 Bakemon", () => {
  it("optionally plays Violet Inboots from hand when there is at most one own Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: false,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Violet Inboots"], match: "nameExact" }] },
            count: 1,
          },
          condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 },
        },
      ],
    });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("publishes the printed stats and purple evolution route", () => {
    expect(getCardDefinition("BT20-068")).toMatchObject({
      cardId: "BT20-068",
      nameEn: "Bakemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      effectText: expect.stringContaining("Violet Inboots"),
      inheritedEffectText: expect.stringContaining("Gain 1 memory"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("free-plays Violet on evolution at the exact 0/1-Tamer boundary, but not with 2", async () => {
    for (const tamerCount of [0, 1, 2]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-063", as: "base" },
              ...Array.from({ length: tamerCount }, (_, index) => ({ card: "BT20-085", as: `tamer${index}` })),
            ],
            hand: [
              { card: "BT20-068", as: "bakemon" },
              { card: "BT20-088", as: "violet" },
            ],
            deck: ["BT20-047"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("bakemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        tamerCount <= 1
          ? s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-088")
          : s.perm("base").topCard.cardId === "BT20-068",
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-088")).toBe(
        tamerCount <= 1,
      );
      expect(s.state.memory).toBe(0);
    }
  });

  it("allows the free Violet play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-063", as: "base" }],
          hand: [
            { card: "BT20-068", as: "bakemon" },
            { card: "BT20-088", as: "violet" },
          ],
          deck: ["BT20-047"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-068");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("violet").instanceId);
  });

  it("gains 1 memory only when Bakemon is inherited under the deleted host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", under: ["BT20-068"], suspended: true, as: "host" }],
        hand: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT20-076", as: "attacker" }],
        hand: ["BT1-010"],
        security: ["BT2-107"],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
    });
    s.state.memory = 0;
    const hostId = s.perm("host").permanentId;
    const turns = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    await settle(() =>
      s.events.some(
        (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to - event.from === -1,
      ),
    );
    expect(
      s.events.some(
        (event) => event.kind === "memoryChanged" && event.reason === "gainMemory" && event.to - event.from === -1,
      ),
    ).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turns;
  });

  it("publicly builds a Yaamon-Ghostmon-Bakemon-Sandiramon stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-006", as: "yaamon" },
        hand: [
          { card: "BT20-063", as: "ghostmon" },
          { card: "BT20-068", as: "bakemon" },
          { card: "BT10-079", as: "host" },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("ghostmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-063");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("bakemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT20-068");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yaamon").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yaamon").topCard.cardId === "BT10-079");
    expect(s.perm("yaamon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX7-006", "BT20-063", "BT20-068"]),
    );
  });
});

describe("BT20-068 Bakemon — KB Q&A rulings", () => {
  type RecoveryChoice = "deletedBakemon" | "inheritedGhostmon" | "unrelatedGhost";

  async function resolveDemiMeramonRecoveryFirst(choice: RecoveryChoice) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-068",
              dp: 4000,
              as: "bakemon",
              under: [
                { card: "BT20-006", as: "demiMeramon" },
                { card: "BT20-063", as: "ghostmon" },
              ],
            },
          ],
          trash: [{ card: "BT20-062", as: "unrelatedGhost" }],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoOrderTriggers: false, autoAcceptOptional: true, autoSelectCards: false },
    );
    const demiMeramonInstance = s.inst("demiMeramon").instanceId;
    const ghostmonInstance = s.inst("ghostmon").instanceId;
    const recoveredInstance = {
      deletedBakemon: s.perm("bakemon").topCard.instanceId,
      inheritedGhostmon: ghostmonInstance,
      unrelatedGhost: s.inst("unrelatedGhost").instanceId,
    }[choice];
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bakemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    const triggerKeys = order.options!.triggerKeys!;
    expect(triggerKeys).toHaveLength(2);
    expect(triggerKeys.some((key) => key.includes(ghostmonInstance))).toBe(true);
    const demiMeramonKey = triggerKeys.find((key) => key.includes(demiMeramonInstance))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [demiMeramonKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.findLast(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [recoveredInstance] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([recoveredInstance]);
    return s;
  }

  it("cannot activate Ghostmon's pending inherited effect after the deleted Bakemon returns from trash to hand (Q4285)", async () => {
    const bakemonRecovered = await resolveDemiMeramonRecoveryFirst("deletedBakemon");
    expect(bakemonRecovered.state.memory).toBe(0);

    const unrelatedGhostRecovered = await resolveDemiMeramonRecoveryFirst("unrelatedGhost");
    expect(unrelatedGhostRecovered.state.memory).toBe(1);
  });

  it("still activates Ghostmon's inherited effect after Ghostmon itself returns from trash to hand (Q4286)", async () => {
    const s = await resolveDemiMeramonRecoveryFirst("inheritedGhostmon");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-068");
  });
});
