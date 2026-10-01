import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_092 } from "./BT24-092.js";
import "../index.js";

describe("BT24-092 Shock Plasma", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-092")).toMatchObject({
      cardId: "BT24-092",
      nameEn: "Shock Plasma",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["TS"],
      linkDp: 2000,
      linkRequirement: "[Link] [TS]\u00a0trait: Cost 3",
    });
  });

  it("reduces an opponent Digimon and optionally links to your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-092", as: "option" }],
          battleArea: [
            { card: "BT24-009", as: "ts" },
            { card: "BT24-009", as: "host" },
          ],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const option = s.inst("option");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 7000);

    expect(s.perm("opponent").currentDP).toBe(7000);
    expect(
      [s.perm("ts"), s.perm("host")].some((permanent) =>
        permanent.linked.some((card) => card.instanceId === option.instanceId),
      ),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    const link = BT24_092.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1];
    expect(link).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: {
        filter: { controller: "mine", kind: ["Digimon"] },
        orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
        count: 1,
      },
      allowBreedingRecipient: true,
      payCost: false,
      optional: true,
    });
    expect(BT24_092.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
  });

  it("waives color from a breeding TS Digimon and links to it", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.breeding!.linked.some((card) => card.instanceId === s.inst("option").instanceId),
    );
    expect(s.perm("opponent").currentDP).toBe(1000);
  });

  it("applies linked -6000 DP once per turn and resets after the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-020", as: "host", dp: 15000, linked: [{ card: "BT24-092", as: "optionLink" }] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          security: ["BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "target1", dp: 13000 },
            { card: "BT1-045", as: "target2", dp: 13000 },
          ],
          security: ["BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const optionLinkId = s.inst("optionLink").instanceId;
    const target2Id = s.perm("target2").permanentId;
    preferred.push(s.perm("target1").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 7;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target1").currentDP === 7000 && !observe(s.engine).isAttacking());
    expect(s.perm("target1").currentDP).toBe(7000);
    preferred.splice(0, preferred.length, s.perm("target2").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target2").currentDP).toBe(13000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target2").currentDP).toBe(7000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([optionLinkId]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === target2Id)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-092", as: "option" }],
          battleArea: [{ card: "BT24-009", as: "host" }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("option"));
    await settle(() => s.perm("opponent").currentDP === 1000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("public Security Main activation applies DP and links the checked Option", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-045", as: "attacker", dp: 15000 }], security: ["BT1-013"] },
        1: {
          security: [{ card: "BT24-092", as: "option" }, "BT1-013", "BT1-013"],
          battleArea: [{ card: "BT24-020", as: "host", dp: 15000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("attacker").currentDP).toBe(9000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT24-092 Shock Plasma — KB Q&A rulings", () => {
  async function playShockPlasma(board: BoardSpec) {
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    return { s, result: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }) };
  }

  it("counts a TS card in the battle area or the breeding area as on the field for its color waiver (Q5687)", async () => {
    const opponent = { battleArea: [{ card: "BT1-045", as: "target", dp: 13000 }] };
    const hand = [{ card: "BT24-092", as: "option" }];

    const battleAreaTamer = await playShockPlasma({ 0: { hand, battleArea: [{ card: "BT24-083" }] }, 1: opponent });
    expect(battleAreaTamer.result).toEqual({ ok: true });
    await settle(() => battleAreaTamer.s.perm("target").currentDP === 7000);

    const breedingDigimon = await playShockPlasma({ 0: { hand, breeding: { card: "BT24-009" } }, 1: opponent });
    expect(breedingDigimon.result).toEqual({ ok: true });
    await settle(() => breedingDigimon.s.perm("target").currentDP === 7000);

    const noTs = await playShockPlasma({ 0: { hand, battleArea: [{ card: "BT1-009" }] }, 1: opponent });
    expect(noTs.result.ok).toBe(false);
    expect(noTs.s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT24-092"]);
  });

  it("links to a Digimon in the breeding area with its [Main] effect (Q5690)", async () => {
    const { s, result } = await playShockPlasma({
      0: { hand: [{ card: "BT24-092", as: "option" }], breeding: { card: "BT24-009", as: "breedingHost" } },
      1: { battleArea: [{ card: "BT1-045", as: "target", dp: 13000 }] },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("breedingHost").linked.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("breedingHost").inBreeding).toBe(true);
    expect(s.perm("breedingHost").linked.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("treats its link effect as a Digimon effect, not an Option card effect (Q5688)", async () => {
    const attackWhileTargetIgnores = async (sourceKind: "Digimon" | "Option") => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT24-020", as: "host", dp: 15000, linked: [{ card: "BT24-092" }] }] },
          1: { battleArea: [{ card: "BT1-045", as: "target", dp: 13000 }], security: ["BT1-013", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("target").permanentId,
        "beAffected",
        EffectDuration.UntilOpponentTurnEnd,
        { fromSourceKind: [sourceKind], byOpponentEffectsOnly: true },
      );
      await advance(s.engine).recompute();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking(),
      );
      return s.perm("target").currentDP;
    };

    expect(await attackWhileTargetIgnores("Digimon")).toBe(13000);
    expect(await attackWhileTargetIgnores("Option")).toBe(7000);
  });

  it("can pay its link cost while an opponent effect prohibits using Option cards (Q5689)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "host" }], hand: [{ card: "BT24-092", as: "option" }] },
      1: { battleArea: [{ card: "BT11-095" }], hand: [{ card: "EX1-072", as: "shutdown" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("shutdown").instanceId));
    s.state.turnSeat = 0;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("option").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("host").linked[0]?.cardId).toBe("BT24-092");
    expect(s.state.memory).toBe(0);
  });

  it("links during BT24-085's end-of-turn use, then its link effect fires when that effect's attack follows (Q5691)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-092", as: "option" }],
          battleArea: [
            { card: "BT24-085", as: "danAndKanan" },
            { card: "BT24-009", as: "tsAttacker", dp: 10000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-045", as: "target", dp: 13000 }], security: ["BT1-013", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Opponent has 3 memory, so a use cost of 3 is within reach of Dan & Kanan's effect.
    s.state.memory = -3;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("danAndKanan").topCard!);
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.perm("danAndKanan").isSuspended).toBe(true);
    expect(s.perm("tsAttacker").linked.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.perm("tsAttacker").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
