import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-024.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../BT7/BT7-064.js";
import "../EX5/EX5-074.js";
import "../index.js";

describe("EX9-024", () => {
  it("declares the printed Kyaromon route as an exact-name requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Kyaromon"], cost: 0, isAlternate: true }]);
  });

  it("returns a Puppet Digimon from trash by trashing a card from hand on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      cost: { kind: "trash" },
      target: { count: 1 },
    }));
  it("inherits a once-per-turn attack-ending effect by deleting another Digimon", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack", cost: { kind: "deleteOwn" } }],
        },
      ],
    });
    expect(inherited?.actions[0]).not.toHaveProperty("optional");
  });

  it("trashes a hand card before returning a Puppet Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-024", as: "source" }], hand: ["BT1-001"], trash: ["EX9-024"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-024")).toBe(true);
  });

  it("does not pay the On Play cost when the trash has no Puppet Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-024", as: "source" }, "BT1-001"], trash: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["BT1-005", true],
    ["BT1-003", false],
    ["BT6-002", true],
  ] as const)("matches the alternate Kyaromon evolution by exact name (%s)", async (base, eligible) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-024", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-024" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not trash the hand cost when the optional On Play effect is refused", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-024", as: "source" }, "BT1-001"], trash: ["BT1-038"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-038"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ends an opponent attack before security with one optional cost decision", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-10", as: "host", under: ["EX9-024"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("leaves the attack and sacrifice intact when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-10", as: "host", under: ["EX9-024"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const fodderId = s.perm("fodder").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === fodderId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
  });

  it("cannot end the attack when another effect prevents paying the delete cost (Q4775)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-10", as: "host", under: ["EX9-024"] },
            { card: "BT7-064", as: "fodder", under: ["BT7-062"] },
          ],
          hand: [{ card: "BT7-062", as: "protection" }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("fodder"));
    expect(observe(s.engine).isRestricted(s.perm("fodder"), "beDeleted")).toBe(true);
    const optionalBeforeAttack = s.decisions.filter(({ req }) => req.kind === "optional").length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("fodder").permanentId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(optionalBeforeAttack + 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ends an attack even when the attacker is immune to Digimon effects (Q4777)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-10", as: "host", under: ["EX9-024"] },
            { card: "BT1-009", as: "fodder" },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "EX5-074", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("attacker"), "beAffected", "Digimon")).toBe(true);
    const fodderInstanceId = s.perm("fodder").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === fodderInstanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires the inherited attack-ending effect only once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-10", as: "host", under: ["EX9-024"] },
            { card: "BT1-009", as: "firstFodder" },
            { card: "BT1-016", as: "secondFodder" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-016", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const firstFodderId = s.perm("firstFodder").permanentId;
    const firstFodderInstanceId = s.perm("firstFodder").topCard.instanceId;
    const secondFodderId = s.perm("secondFodder").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === firstFodderId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === secondFodderId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === firstFodderInstanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
