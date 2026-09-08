import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
