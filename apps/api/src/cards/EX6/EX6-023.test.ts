import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-023.js";
import "./EX6-024.js";
import "../BT1/BT1-062.js";

describe("EX6-023 Gokuumon", () => {
  it("shares a once-per-turn DigiXros effect that grants Security Attack -1 and deletes a 6000 DP or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      {
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
        condition: { kind: "digiXrosCount", minimum: 1 },
      },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("returns a yellow Digimon source from its own stack when it would leave play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { colors: ["Yellow"], zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
        },
      ],
    }));
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-023", as: "goku" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("publicly executes the DigiXros-only delete tail with one listed material", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "goku" },
            { card: "EX6-025", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent", dp: 6000 },
            { card: "BT1-009", as: "overLimit", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.inst("overLimit").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("goku").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("overLimit").instanceId);
    expect(s.perm("goku").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("overLimit"), "SecurityAttack")).toBe(-1);
  });

  it("publicly returns its yellow evolution card when leaving play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-023", as: "goku", under: ["EX6-019"] }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("goku").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX6-019")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("goku").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("publicly grants Security Attack -1 to your other Digimon when selected", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-023", as: "goku" },
            { card: "BT1-009", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("ally").instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(-1);
  });

  it("allows declining the inherited Security Attack -1 during a real attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-062", as: "host", under: ["EX6-019", "EX6-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("publicly returns its source after a real DigiXros host leaves play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "goku" },
            { card: "EX6-025", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("goku").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("goku").instanceId),
    );
    await advance(s.engine).verb.deletePermanent([s.state.players[0]!.battleArea[0]!.permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});

describe("EX6-023 Gokuumon — KB Q&A rulings", () => {
  it("rejects a DigiXros that places both Sanzomon and Cho-Hakkaimon (Q3720)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "self" },
            { card: "EX6-025", as: "first" },
            { card: "EX6-026", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("self").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.memory).toBe(10);
  });

  it("does not delete an opposing 6000 DP Digimon when it attacks after a DigiXros play (Q3721)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX6-023", as: "self" },
            { card: "EX6-025", as: "material" },
          ],
          deck: Array(5).fill("BT1-009"),
        },
        1: { deck: Array(5).fill("BT1-009"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const playTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("self").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("self").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("self").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("material").instanceId]);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await playTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.putOnBoard(1, { card: "BT1-009", as: "opponent", dp: 6000 });
    preferred.push(s.perm("opponent").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const attackTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const securityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("self").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < securityBefore);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX6-023")).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("opponent").instanceId),
    ).toBe(true);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await attackTurn;
  });

  it("lets the inherited effect give my own Digimon <Security A. -1> (Q3722)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-062", as: "host", under: ["EX6-019", "EX6-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("host").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === -1 &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it.each(["trash", "hand", "deck", "under another card"] as const)(
    "returns a yellow source when it would leave the battle area to the %s (Q3723)",
    async (destination) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX6-023", as: "self", under: [{ card: "EX6-019", as: "yellowSource" }] },
              { card: "BT1-009", as: "receiver" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const selfTopId = s.perm("self").topCard.instanceId;
      const primitives = internalsOf(s.engine).primitives;
      if (destination === "trash")
        await advance(s.engine).verb.deletePermanent([s.perm("self").permanentId], "byEffect");
      if (destination === "hand") await advance(s.engine).verb.returnToHand([selfTopId]);
      if (destination === "deck") await advance(s.engine).verb.returnToDeck([selfTopId]);
      if (destination === "under another card")
        await primitives.relocatePermanentByEffect!(s.perm("receiver").permanentId, s.perm("self").permanentId);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === selfTopId)).toBe(false);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yellowSource").instanceId);
    },
  );

  async function digiXrosOverField() {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-024", as: "partner" }],
          battleArea: [{ card: "EX6-023", as: "self", under: [{ card: "EX6-025", as: "yellowSource" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const selfTopId = s.perm("self").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("partner").instanceId,
        digiXros: { materialInstanceIds: [selfTopId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("partner").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);
    const partner = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard?.instanceId === s.inst("partner").instanceId,
    )!;
    return { s, selfTopId, partner };
  }

  it("triggers its leave effect when placed under Sagomon for a DigiXros (Q3724)", async () => {
    const { s, selfTopId, partner } = await digiXrosOverField();
    expect(partner.stack.map(({ instanceId }) => instanceId)).toEqual([selfTopId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("yellowSource").instanceId]);
  });

  it("does not let the returned source become a DigiXros material after the choice (Q3725)", async () => {
    const { s, partner } = await digiXrosOverField();
    expect(partner.stack.map(({ instanceId }) => instanceId)).not.toContain(s.inst("yellowSource").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("yellowSource").instanceId);
    expect(s.state.memory).toBe(5);
  });
});
