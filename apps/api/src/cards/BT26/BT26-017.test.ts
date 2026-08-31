import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-017.js";
import "../index.js";

describe("BT26-017 Zanbamon", () => {
  it("compiles Blocker/Retaliation and both trigger paths", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["Static", "OnPlay", "WhenDigivolving", "OnDeletion"]);
    for (const effect of compiled.effects.slice(1, 3)) {
      expect(effect.actions).toMatchObject([
        { kind: "SelectBind", target: { bindAs: "zanbamonGrantTarget" } },
        { kind: "GainKeyword", target: { fromSelectionRef: "zanbamonGrantTarget" }, duration: "forTheTurn" },
        { kind: "GainKeyword", target: { fromSelectionRef: "zanbamonGrantTarget" }, duration: "forTheTurn" },
      ]);
    }
  });
  it("exposes its Shambala evolution and Assembly requirements", () => {
    expect(digivolutionRequirementsFor("BT26-017")).toContainEqual({
      level: 5,
      traits: ["Shambala", "TS"],
      cost: 3,
      isAlternate: true,
    });
    expect(assemblyRequirementFor("BT26-017")).toEqual([
      { reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2, differentLevels: true }] },
    ]);
  });
  it("assembles with two different-level Shambala cards and rejects equal-level materials", async () => {
    const legal = setupEngine({
      0: {
        hand: [{ card: "BT26-017", as: "zanbamon" }],
        trash: [
          { card: "BT26-008", as: "levelThree" },
          { card: "BT26-013", as: "levelFour" },
        ],
      },
    });
    legal.state.memory = 8;
    expect(
      legal.engine.applyIntent(0, {
        type: "playCard",
        instanceId: legal.inst("zanbamon").instanceId,
        assembly: {
          materialInstanceIds: [legal.inst("levelThree").instanceId, legal.inst("levelFour").instanceId],
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-017"));
    const assembled = legal.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === legal.inst("zanbamon").instanceId,
    )!;
    expect(legal.state.memory).toBe(0);
    expect(new Set(assembled.stack.map(({ instanceId }) => instanceId))).toEqual(
      new Set([legal.inst("levelThree").instanceId, legal.inst("levelFour").instanceId]),
    );

    const invalid = setupEngine({
      0: {
        hand: [{ card: "BT26-017", as: "zanbamon" }],
        trash: [
          { card: "BT26-012", as: "firstLevelFour" },
          { card: "BT26-013", as: "secondLevelFour" },
        ],
      },
    });
    invalid.state.memory = 8;
    expect(
      invalid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: invalid.inst("zanbamon").instanceId,
        assembly: {
          materialInstanceIds: [invalid.inst("firstLevelFour").instanceId, invalid.inst("secondLevelFour").instanceId],
        },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(invalid.state.memory).toBe(8);
  });
  it("grants Security Attack and Progress to a Shambala ally on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-012", as: "ally" },
            { card: "BT1-009", as: "nonShambala" },
          ],
          hand: [{ card: "BT26-017", as: "self" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Progress"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonShambala"), "Progress")).toBe(false);

    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 0);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Progress")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "SecurityAttack")).toBe(false);
  });

  it("grants both temporary keywords when digivolving through a legal Shambala stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "base" }],
          hand: [{ card: "BT26-017", as: "self" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("self").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Progress"));

    expect(s.perm("base").topCard.cardId).toBe("BT26-017");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(true);
  });

  it("uses the alternate evolution over an off-color TS Lv.5 and rejects a non-trait peer", async () => {
    const legal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-028", as: "tsBase" }],
          hand: [{ card: "BT26-017", as: "zanbamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("zanbamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === "BT26-017");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("tsBase").stack.at(-1)?.cardId).toBe("BT24-028");

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "plainBlue" }],
        hand: [{ card: "BT26-017", as: "zanbamon" }],
      },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBlue").permanentId,
        instanceId: invalid.inst("zanbamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publishes Blocker and Retaliation while Zanbamon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-017", as: "self" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("self"), "Retaliation")).toBe(true);
  });

  it("uses Blocker to protect security and Retaliation to delete a battle winner", async () => {
    const blocking = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-017", as: "blocker" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    blocking.state.turnSeat = 1;
    const attackerId = blocking.perm("attacker").permanentId;
    expect(
      blocking.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !blocking.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackerId));
    expect(blocking.state.players[0]!.security).toHaveLength(1);
    expect(blocking.state.players[0]!.battleArea).toHaveLength(1);

    const retaliating = setupEngine({
      0: { battleArea: [{ card: "BT26-017", as: "zanbamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "winner", dp: 13000, suspended: true }] },
    });
    expect(
      retaliating.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: retaliating.perm("zanbamon").permanentId,
        target: { kind: "permanent", permanentId: retaliating.perm("winner").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        retaliating.state.players[0]!.battleArea.length === 0 && retaliating.state.players[1]!.battleArea.length === 0,
    );
  });

  it("on deletion may play exactly one play-cost-5-or-less Shambala or TS card from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-017", as: "self" }],
          trash: [
            { card: "BT26-012", as: "eligible" },
            { card: "BT26-014", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    const selfId = s.perm("self").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
      ),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([selfId, s.inst("tooExpensive").instanceId]),
    );
  });

  it("accepts the TS-only branch and may decline without moving an eligible card", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-017", as: "self" }],
          trash: [
            { card: "BT24-009", as: "tsOnly" },
            { card: "BT1-009", as: "nonTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(await advance(accepted.engine).verb.deletePermanent([accepted.perm("self").permanentId], "byEffect")).toBe(
      1,
    );
    await settle(() =>
      accepted.state.players[0]!.battleArea.some(
        ({ topCard }) => topCard.instanceId === accepted.inst("tsOnly").instanceId,
      ),
    );
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("nonTrait").instanceId,
    );

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-017", as: "self" }],
          trash: [{ card: "BT26-012", as: "eligible" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(await advance(declined.engine).verb.deletePermanent([declined.perm("self").permanentId], "byEffect")).toBe(
      1,
    );
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);
    expect(declined.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      declined.inst("eligible").instanceId,
    );
  });

  it("plays an own Shambala Tamer at the inclusive play-cost-5 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-017", as: "self" }],
          trash: [{ card: "BT26-104", as: "kunlun" }],
        },
        1: { trash: [{ card: "BT26-104", as: "opponentKunlun" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-104"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-104");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT26-104");
  });

  it("Q6982 offers simultaneous top-card and inherited On Deletion effects for ordering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-017", as: "self", under: [{ card: "BT26-014" }] }],
          hand: [{ card: "BT26-013", as: "handCandidate" }],
          trash: [{ card: "BT26-012", as: "trashCandidate" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: false, autoSelectCards: true },
    );
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);
  });
});
