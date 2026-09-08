import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-097.js";
import "../index.js";

describe("BT24-097 Soul Fear", () => {
  it("matches the immutable catalog identity and link route", () => {
    expect(getCardDefinition("BT24-097")).toMatchObject({
      cardId: "BT24-097",
      nameEn: "Soul Fear",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 5,
      types: ["TS"],
      linkDp: 2000,
      linkRequirement: "[Link] [TS]\u00a0trait: Cost 3",
    });
  });

  it("records the printed TS Link requirement and breeding-aware color waiver", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
    expect(compiled.effects[0]).toMatchObject({
      actions: [{ condition: { kind: "anyOf", conditions: [{ kind: "youHave" }, { kind: "youHave" }] } }],
    });
  });

  it("may be used with only a breeding-area TS color-waiver source", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-097", as: "soulFear" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulFear").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));
  });

  it("declares its printed Link onto TS for cost 3 and rejects a non-TS host atomically", async () => {
    const valid = setupEngine({
      0: { hand: [{ card: "BT24-097", as: "soulFear" }], battleArea: [{ card: "BT24-009", as: "tsHost" }] },
    });
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: valid.inst("soulFear").instanceId,
        targetPermanentId: valid.perm("tsHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("tsHost").linked.length === 1);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("tsHost").linked[0]?.cardId).toBe("BT24-097");

    const invalid = setupEngine({
      0: { hand: [{ card: "BT24-097", as: "soulFear" }], battleArea: [{ card: "AD1-001", as: "nonTsHost" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: invalid.inst("soulFear").instanceId,
        targetPermanentId: invalid.perm("nonTsHost").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(invalid.state.memory).toBe(3);
    expect(invalid.perm("nonTsHost").linked).toHaveLength(0);
    expect(invalid.state.players[0]!.hand.some((card) => card.cardId === "BT24-097")).toBe(true);
  });

  it("waives color with TS, pays play cost, deletes exactly level 6+, and freely links itself", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-097", as: "soulFear" }], battleArea: [{ card: "BT24-009", as: "host" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "level6" },
            { card: "BT1-020", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulFear").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").linked.some((card) => card.cardId === "BT24-097"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.perm("host").linked.some((card) => card.cardId === "BT24-097")).toBe(true);
  });

  it("allows declining only the optional self-link after the mandatory deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-097", as: "soulFear" }], battleArea: [{ card: "BT24-009", as: "host" }] },
        1: { battleArea: [{ card: "BT1-080", as: "level6" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulFear").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080"));
    await settle(() => false, 80);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-097")).toBe(true);
  });

  it("activates Main from a public attack's security check and links to breeding (Q5707)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-097", as: "securitySoulFear" }],
          breeding: { card: "BT24-009", as: "breedingHost" },
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-080", as: "level6" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingHost").linked.some((card) => card.cardId === "BT24-097"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080")).toBe(true);
    expect(s.perm("breedingHost").inBreeding).toBe(true);
    expect(s.perm("breedingHost").linked.some((card) => card.cardId === "BT24-097")).toBe(true);
  });

  it("as a link card deletes one level 5 or lower target from a public TS host attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-009", as: "host", linked: [{ card: "BT24-097", as: "soulFearLink" }] }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "firstLevel5" },
            { card: "BT1-020", as: "secondLevel5" },
            { card: "BT1-080", as: "level6" },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("firstLevel5").permanentId;
    const secondId = s.perm("secondLevel5").permanentId;
    const highId = s.perm("level6").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.trash[0]?.cardId).toBe("BT1-020");
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-080")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId) !==
        s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("links during BT24-085's end-turn use, then fires when that same effect attacks (Q5708)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-097", as: "soulFear" }],
          battleArea: [
            { card: "BT24-085", as: "danAndKanan" },
            { card: "BT24-009", as: "tsAttacker", dp: 10000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "level6" },
            { card: "BT1-020", as: "level5" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Turn-relative -5 means the opponent has 5 memory, satisfying BT24-085's use-cost ceiling.
    s.state.memory = -5;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnEndTurn, s.perm("danAndKanan").topCard!);
    // 2 deleted Digimon (BT1-080, BT1-020) plus 1 checked security card land in trash; the
    // other security card stays face down (asserted below as the remaining 1).
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.perm("danAndKanan").isSuspended).toBe(true);
    expect(s.perm("tsAttacker").linked.some((card) => card.cardId === "BT24-097")).toBe(true);
    expect(s.perm("tsAttacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
