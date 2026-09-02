import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-053.js";

describe("BT23-053 Strikedramon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-053")).toMatchObject({
      cardId: "BT23-053",
      nameEn: "Strikedramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragonkin", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("evolves into Cyberdramon for 2 less when its controller places an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [
            { card: "BT23-055", as: "cyber" },
            { card: "BT1-020", as: "nonCs" },
            { card: "BT23-100", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    const strikeId = s.perm("strike").permanentId;
    await s.ready();

    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);

    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === strikeId)?.topCard?.cardId).toBe("BT23-055");
    expect(s.state.players[0]!.battleArea.find((p) => p.permanentId === strikeId)?.stack.at(-1)?.cardId).toBe(
      "BT23-053",
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-020")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("may digivolve from hand into Cyberdramon or a CS Digimon for 2 less when your Option enters the battle area", () => {
    const effect = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(effect).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionPlayed",
      sourceFilter: { controller: "mine", kind: ["Option"] },
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true, kind: ["Digimon"] }, isSelf: true },
          into: {
            nameOrTrait: [
              { tokens: ["Cyberdramon"], match: "name" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
        },
      ],
    });
  });

  it("grants the inherited host +1000 DP permanently", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-055", as: "host", under: ["BT23-053"] }] } });
    const baseDp = s.perm("host").currentDP;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(baseDp + 1000);
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("ignores an opponent's placed Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-053", as: "strike" }],
          hand: [{ card: "BT23-055", as: "cyber" }],
        },
        1: { hand: [{ card: "BT23-100", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    expect(s.perm("strike").topCard.cardId).toBe("BT23-053");
  });

  it("digivolves for 2 from an off-color level-3 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-037", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT23-053", as: "strike" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("strike").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
