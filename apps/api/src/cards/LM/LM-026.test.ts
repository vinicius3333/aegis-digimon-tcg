import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-026.js";
import "./LM-021.js";
import "../BT17/BT17-018.js";
import "../BT17/BT17-010.js";
import "../AD1/AD1-002.js";
import "../EX10/EX10-056.js";
import "./LM-020.js";

describe("LM-026 Megidramon", () => {
  it("registers complete leave replacement, rule name, and inherited deletion ceiling IR", () => {
    const compiled = runtimeCompiledCard("LM-026")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(
      compiled.effects.find((effect) => effect.actions.some((action) => action.kind === "Replacement")),
    ).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          playAndRelocateSourceUnder: { from: ["digivolutionCards", "trash"] },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions).toEqual([
      expect.objectContaining({ kind: "DeletionMaxDpModifier", amount: 5000 }),
    ]);
  });

  it("deletes only opposing Digimon at 11000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-026", as: "megidramon" }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "low" },
            { card: "BT1-082", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-082")).toBe(true);
  });

  it("replaces its own leave with a Guilmon host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-026", as: "megidramon", suspended: true }], trash: ["BT2-009"] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("megidramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT2-009")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT2-009")!.stack.map(
        (card) => card.cardId,
      ),
    ).toEqual(["LM-026"]);
  });

  it("can play the Guilmon from its own digivolution cards for the replacement", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-026", under: ["BT2-009"], as: "megidramon", suspended: true }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("megidramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    const guilmon = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT2-009");
    expect(guilmon?.stack.map((card) => card.cardId)).toEqual(["LM-026"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("is also treated as ChaosGallantmon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-026", as: "megidramon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toContain("chaosgallantmon");
  });

  it("allows the printed Growlmon alternate evolution for cost 3", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-003", as: "growlmon" }], hand: [{ card: "LM-026", as: "megidramon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("megidramon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard?.cardId === "LM-026", 2000);
    expect(s.perm("growlmon").topCard.cardId).toBe("LM-026");
    expect(s.state.memory).toBe(0);
  });

  it("raises a numeric deletion cap for a legal Gallantmon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-026", as: "megidramon" }],
          hand: [{ card: "BT17-018", as: "crimson" }],
        },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megidramon").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"), 2000);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.perm("megidramon").topCard.cardId).toBe("BT17-018");
    expect(s.perm("megidramon").stack.map((card) => card.cardId)).toEqual(["LM-026"]);
  });

  it("does not raise a deletion cap that uses the host's own DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-026", as: "megidramon" }],
          hand: [{ card: "LM-021", as: "bond" }],
        },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megidramon").permanentId,
        instanceId: s.inst("bond").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null, 2000);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-081")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("leaves the same 20000 DP target with no Megidramon modifier", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-008", as: "gallantmon" }], hand: [{ card: "BT17-018", as: "crimson" }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision == null, 2000);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-081")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("raises its host's own numeric deletion ceiling by 5000, per Q4031", async () => {
    const withMegidramon = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-010", as: "host", under: ["LM-026"] }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withMegidramon.ready();

    await advance(withMegidramon.engine).fire(EffectTiming.WhenDigivolving, withMegidramon.perm("host"));
    await settle(() => withMegidramon.state.players[1]!.battleArea.length === 0, 2000);
    expect(withMegidramon.state.players[1]!.battleArea).toHaveLength(0);

    const withoutMegidramon = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-010", as: "host" }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutMegidramon.ready();

    await advance(withoutMegidramon.engine).fire(EffectTiming.WhenDigivolving, withoutMegidramon.perm("host"));
    await settle(() => withoutMegidramon.state.pendingDecision == null);
    expect(withoutMegidramon.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q4032: does not raise a deletion limit relative to the host's own DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-002", as: "host", under: ["LM-026"] }] },
        1: { battleArea: [{ card: "BT1-081", as: "tooHigh", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    await settle(() => s.state.pendingDecision == null);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooHigh").permanentId),
    ).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-026");
    const compiled = runtimeCompiledCard("LM-026");
    expect(definition?.nameEn).toBe("Megidramon");
    expect(definition?.colors).toEqual(["Purple", "Red"]);
    expect(definition?.isAce).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});

describe("LM-026 Megidramon — KB Q&A rulings", () => {
  function guilmonHost(s: ReturnType<typeof setupEngine>) {
    return s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "BT2-009");
  }

  const preferred: string[] = [];

  async function megidramonWithGuilmonInTrash() {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-026", as: "megidramon" },
            { card: "BT1-009", as: "other" },
          ],
          trash: ["BT2-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    return s;
  }

  it("treats deletion, returning to hand or deck, moving to breeding, placing under another card and placing in security as leaving the battle area (Q4029)", async () => {
    const removals: [string, (s: ReturnType<typeof setupEngine>, instanceId: string) => Promise<unknown>][] = [
      ["delete", (s) => advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId])],
      ["return to hand", (s, instanceId) => advance(s.engine).verb.returnToHand([instanceId])],
      ["return to deck", (s, instanceId) => advance(s.engine).verb.returnToDeck([instanceId])],
      // P-143 Drimogemon's MovePermanent is the only breeding move in the card pool, and it moves only itself.
      ["move to breeding area", (s) => advance(s.engine).verb.moveToBreeding(s.perm("megidramon").permanentId)],
      [
        "place under",
        async (s) => {
          const bagramon = s.putOnBoard(1, "EX10-056");
          preferred.splice(
            0,
            preferred.length,
            s.perm("megidramon").permanentId,
            s.perm("megidramon").topCard.instanceId,
          );
          await advance(s.engine).fire(EffectTiming.WhenDigivolving, bagramon);
        },
      ],
      [
        "place in security",
        async (s) => {
          const quantumon = s.putOnBoard(1, "LM-020");
          preferred.splice(
            0,
            preferred.length,
            s.perm("megidramon").permanentId,
            s.perm("megidramon").topCard.instanceId,
          );
          await advance(s.engine).fire(EffectTiming.WhenDigivolving, quantumon);
        },
      ],
    ];
    for (const [label, remove] of removals) {
      preferred.length = 0;
      const s = await megidramonWithGuilmonInTrash();
      const megidramonCard = s.perm("megidramon").topCard.instanceId;

      await remove(s, megidramonCard);
      await settle(() => s.state.pendingDecision === undefined, 2000);

      expect(
        guilmonHost(s)?.stack.map((card) => card.instanceId),
        label,
      ).toEqual([megidramonCard]);
      expect(
        s.state.players[0]!.hand.some((card) => card.cardId === "LM-026"),
        label,
      ).toBe(false);
      expect(
        s.state.players[0]!.deck.some((card) => card.cardId === "LM-026"),
        label,
      ).toBe(false);
      expect(
        s.perm("other").stack.some((card) => card.cardId === "LM-026"),
        label,
      ).toBe(false);
      expect(
        s.state.players[0]!.security.some((card) => card.cardId === "LM-026"),
        label,
      ).toBe(false);
      expect(s.state.players[0]!.breeding, label).toBeUndefined();
    }
  });

  it("does not apply <Overflow> when it becomes the played Guilmon's digivolution card (Q4030)", async () => {
    const replaced = await megidramonWithGuilmonInTrash();
    const before = replaced.state.memory;
    await advance(replaced.engine).verb.deletePermanent([replaced.perm("megidramon").permanentId]);
    await settle(() => replaced.state.pendingDecision === undefined, 2000);
    expect(guilmonHost(replaced)?.stack.map((card) => card.cardId)).toEqual(["LM-026"]);
    expect(replaced.state.memory).toBe(before);

    const control = setupEngine(
      { 0: { battleArea: [{ card: "LM-026", as: "megidramon" }] } },
      { autoAcceptOptional: true },
    );
    control.state.turnSeat = 1;
    await control.ready();
    const controlBefore = control.state.memory;
    await advance(control.engine).verb.deletePermanent([control.perm("megidramon").permanentId]);
    await settle(() => control.state.pendingDecision === undefined, 2000);
    expect(control.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["LM-026"]);
    expect(Math.abs(control.state.memory - controlBefore)).toBe(4);
  });
});
