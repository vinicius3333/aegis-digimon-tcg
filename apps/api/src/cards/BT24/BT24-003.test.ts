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
});
