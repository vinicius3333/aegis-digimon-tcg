import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-004.js";
import "../index.js";

describe("BT24-004 Wanyamon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-004")).toMatchObject({
      cardId: "BT24-004",
      nameEn: "Wanyamon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("draws once when one of your Iliad Digimon is played during your turn", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
  });

  it("draws once for your Iliad Digimon but not near-matching or opposing plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-029", as: "host", under: ["BT24-004"] },
          { card: "BT24-022", as: "ownIliad" },
          { card: "BT1-029", as: "ownNonIliad" },
        ],
        deck: [
          { card: "BT1-001", as: "firstDraw" },
          { card: "BT1-002", as: "secondDraw" },
        ],
      },
      1: { battleArea: [{ card: "BT24-022", as: "opposingIliad" }] },
    });
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownNonIliad").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opposingIliad").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownIliad").permanentId,
    });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("ownIliad").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
