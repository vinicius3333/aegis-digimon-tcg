import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-003.js";
import "../index.js";

describe("BT24-003 Tsunomon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-003")).toMatchObject({
      cardId: "BT24-003",
      nameEn: "Tsunomon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("digivolves this Digimon into a Shaman from hand when your security is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      useAlternateCost: true,
      reduceCost: 1,
      optional: true,
      target: { filter: { isSelfRef: true } },
    });
  });

  it("digivolves its real stack into a hand Shaman for 1 less when own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-003"] }],
          hand: [{ card: "BT24-014", as: "shaman" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("host").topCard.cardId).toBe("P-194");
    expect(s.state.memory).toBe(5);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await settle(() => s.perm("host").topCard.cardId === "BT24-014");

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("shaman").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("may decline the reduced digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-003"] }],
          hand: [{ card: "BT24-014", as: "shaman" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });

    expect(s.perm("host").topCard.cardId).toBe("P-194");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shaman").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("handles own security removal through the production trash primitive", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-003"] }],
          hand: [{ card: "BT24-014", as: "shaman" }],
          security: [{ card: "BT1-001", as: "removed" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.perm("host").topCard.instanceId === s.inst("shaman").instanceId);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("triggers from a public Temple of Beginnings play removing your security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-003"] }],
          hand: [
            { card: "BT24-014", as: "shaman" },
            { card: "BT24-093", as: "temple" },
          ],
          security: ["BT1-001"],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("temple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("shaman").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(6);
  });

  it("can be reached through two public legal TS evolution steps from the egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-003", as: "egg" },
        hand: [
          { card: "BT24-019", as: "level3" },
          { card: "BT24-034", as: "level4" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level3").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("level3").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("level4").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("level4").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-003", "BT24-019"]);
  });
});
