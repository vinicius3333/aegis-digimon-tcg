import { EffectTiming, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-095.js";
import "../index.js";

describe("BT24-095 Sonic Shot", () => {
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
  });

  it("declares Link onto TS for cost 3 and atomically rejects a non-TS host", async () => {
    const valid = setupEngine({
      0: { hand: [{ card: "BT24-095", as: "shot" }], battleArea: [{ card: "BT24-009", as: "tsHost" }] },
    });
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: valid.inst("shot").instanceId,
        targetPermanentId: valid.perm("tsHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("tsHost").linked.length === 1);
    expect(valid.state.memory).toBe(0);
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
        0: { hand: [{ card: "BT24-095", as: "shot" }], battleArea: [{ card: "BT24-009", as: "host" }] },
        1: {
          battleArea: [
            { card: "BT24-085", as: "chosenTamer" },
            { card: "BT1-020", as: "otherDigimon", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
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

    const unsuspended = await (
      s.engine as unknown as { unsuspendForActivePhase: (seat: Seat) => Promise<string[]> }
    ).unsuspendForActivePhase(1);
    expect(s.perm("chosenTamer").isSuspended).toBe(true);
    expect(s.perm("otherDigimon").isSuspended).toBe(false);
    expect(unsuspended).toContain(s.perm("otherDigimon").permanentId);
    expect(unsuspended).not.toContain(s.perm("chosenTamer").permanentId);
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

    const security = setupEngine(
      {
        0: {
          security: [{ card: "BT24-095", as: "securityShot", faceUp: true }],
          breeding: { card: "BT24-009", as: "breedingHost" },
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("securityShot"));
    await settle(() => security.perm("breedingHost").linked.length === 1);
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
    s.state.memory = -3;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("danAndKanan").topCard!);
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-020"));

    expect(s.perm("danAndKanan").isSuspended).toBe(true);
    expect(s.perm("attacker").linked.some((card) => card.cardId === "BT24-095")).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
  });
});
