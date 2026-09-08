import { EffectDuration, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-095.js";
import "../index.js";

describe("BT24-095 Sonic Shot", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-095")).toMatchObject({
      cardId: "BT24-095",
      nameEn: "Sonic Shot",
      colors: ["Green"],
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

  it("records the printed TS Link requirement and breeding-aware color waiver", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ condition: { kind: "anyOf", conditions: [{ kind: "youHave" }, { kind: "youHave" }] } }],
    });
  });

  it("may be used with only a breeding-area TS color-waiver source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-095", as: "shot" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shot").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shot").instanceId)).toBe(true);
  });

  it("declares Link onto TS for cost 3 and atomically rejects a non-TS host", async () => {
    const valid = setupEngine({
      0: { hand: [{ card: "BT24-095", as: "shot" }], battleArea: [{ card: "BT24-009", as: "tsHost" }] },
    });
    valid.state.memory = 3;
    const validDp = valid.perm("tsHost").currentDP;
    expect(
      valid.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: valid.inst("shot").instanceId,
        targetPermanentId: valid.perm("tsHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("tsHost").linked.length === 1);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("tsHost").currentDP).toBe(validDp + 2000);
    expect(valid.perm("tsHost").linked[0]?.cardId).toBe("BT24-095");

    const invalid = setupEngine({
      0: { hand: [{ card: "BT24-095", as: "shot" }], battleArea: [{ card: "AD1-001", as: "nonTs" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: invalid.inst("shot").instanceId,
        targetPermanentId: invalid.perm("nonTs").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(invalid.state.memory).toBe(3);
    expect(invalid.state.players[0]!.hand.some((card) => card.cardId === "BT24-095")).toBe(true);
  });

  it("waives color, suspends the chosen Tamer, locks that same target for its next unsuspend phase, and links free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-095", as: "shot" }],
          battleArea: [{ card: "BT24-009", as: "host" }],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT24-085", as: "chosenTamer" },
            { card: "BT1-020", as: "otherDigimon", suspended: true },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shot").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("chosenTamer"), "unsuspend") &&
        s.perm("host").linked.some((card) => card.cardId === "BT24-095"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("chosenTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosenTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("otherDigimon"), "unsuspend")).toBe(false);
    expect(s.perm("host").linked.some((card) => card.cardId === "BT24-095")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("chosenTamer").isSuspended).toBe(true);
    expect(s.perm("otherDigimon").isSuspended).toBe(false);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const expiryTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("chosenTamer").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await expiryTurn;
  });

  it("may decline self-link after mandatory suspend, and Security may link to breeding", async () => {
    const decline = setupEngine(
      {
        0: { hand: [{ card: "BT24-095", as: "shot" }], battleArea: [{ card: "BT24-009", as: "host" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    decline.state.memory = 3;
    await decline.ready();
    expect(decline.engine.applyIntent(0, { type: "playCard", instanceId: decline.inst("shot").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => decline.state.players[0]!.trash.some((card) => card.cardId === "BT24-095"));
    expect(decline.perm("host").linked).toHaveLength(0);
    expect(decline.state.players[0]!.trash.some((card) => card.cardId === "BT24-095")).toBe(true);

    const preferredSecurityTargets: string[] = [];
    const security = setupEngine(
      {
        0: {
          security: [{ card: "BT24-095", as: "securityShot" }],
          breeding: { card: "BT24-009", as: "breedingHost" },
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-020", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredSecurityTargets },
    );
    preferredSecurityTargets.push(security.perm("target").topCard.instanceId);
    security.state.turnSeat = 1;
    await security.ready();
    const securityTurn = security.engine.runOneTurn();
    await advance(security.engine).waitForMainPhase(1);
    expect(
      security.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: security.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        security.perm("target").isSuspended &&
        security.perm("breedingHost").linked.some((card) => card.cardId === "BT24-095"),
    );
    advance(security.engine).endMainPhaseIfOpen(1);
    await securityTurn;
    expect(security.perm("target").isSuspended).toBe(true);
    expect(security.perm("breedingHost").linked[0]?.cardId).toBe("BT24-095");
  });

  it("as a link returns only a suspended opposing Digimon, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-009", as: "host", linked: [{ card: "BT24-095", as: "shotLink" }] }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "firstSuspended", suspended: true },
            { card: "BT1-020", as: "secondSuspended", suspended: true },
            { card: "BT1-080", as: "readyLevel6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const fireAttack = () =>
      (
        s.engine as unknown as {
          fireTiming: (timing: EffectTiming, trigger: { attackerPermanentId: string }) => Promise<void>;
        }
      ).fireTiming(EffectTiming.OnUseAttack, { attackerPermanentId: s.perm("host").permanentId });
    await fireAttack();
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand[0]?.cardId).toBe("BT1-020");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-080")).toBe(true);
    await fireAttack();
    await settle(() => false, 80);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-020")).toHaveLength(
      1,
    );
  });

  it("enforces linked OPT publicly, then resets it after the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-014", as: "host", linked: [{ card: "BT24-095", as: "shotLink" }] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "target1", suspended: true },
            { card: "BT1-020", as: "target2", suspended: true },
          ],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const target2Id = s.perm("target2").permanentId;
    const shotLinkId = s.inst("shotLink").instanceId;
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
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target1").instanceId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(true);
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
    await settle(() => s.perm("host").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(true);
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
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target2").instanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target2").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(false);
    expect(s.perm("host").linked.some((card) => card.instanceId === shotLinkId)).toBe(true);
  });

  it("classifies the linked return as a Digimon effect (Q5698)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-014", as: "host", linked: [{ card: "BT24-095", as: "shotLink" }] }],
        security: [],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "protected", suspended: true }],
        security: [{ card: "BT1-009", as: "checkedSecurity" }],
      },
    });
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beAffected",
      EffectDuration.UntilOpponentTurnEnd,
      { fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
    );
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("checkedSecurity").instanceId)).toBe(
      true,
    );
  });

  it("can link while an opponent effect prohibits using Option cards (Q5699)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "host" }], hand: [{ card: "BT24-095", as: "shot" }] },
      1: { battleArea: [{ card: "BT11-095", as: "whiteSource" }], hand: [{ card: "EX1-072", as: "shutdown" }] },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shot").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("shot").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("host").linked[0]?.cardId).toBe("BT24-095");
    expect(s.state.memory).toBe(0);
  });

  it("used by BT24-085, links before the trailing attack and returns the suspended target (Q5701)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-095", as: "shot" }],
          battleArea: [
            { card: "BT24-085", as: "danAndKanan" },
            { card: "BT24-009", as: "attacker", dp: 10000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target" }],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    // Open the real Main phase first; then arrange the printed opponent-memory cap
    // immediately before ending the turn so BT24-085 can use Sonic Shot (Q5701).
    s.state.memory = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = -3;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-020"));
    await turn;

    expect(s.perm("danAndKanan").isSuspended).toBe(true);
    expect(s.perm("attacker").linked.some((card) => card.cardId === "BT24-095")).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
  });
});
