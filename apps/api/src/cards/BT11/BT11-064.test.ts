import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-064.js";
import "./BT11-069.js";

describe("BT11-064 Greymon (X Antibody)", () => {
  it("maps catalog facts and its scaling evolution plus inherited protection to IR", () => {
    expect(getCardDefinition("BT11-064")).toMatchObject({
      cardId: "BT11-064",
      colors: ["Black", "Red"],
      level: 4,
      playCost: 5,
      dp: 6000,
      types: ["Dinosaur", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", scaling: { unit: "colors" } }] },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Greymon"], cost: 0, isAlternate: true }]);
  });

  it("reduces evolution into a dual-color Greymon-named card by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-064", as: "base" }],
        hand: [{ card: "BT11-069", as: "metalgreymon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-069");
    expect(s.state.memory).toBe(8); // printed cost 4 minus 2 colors
  });

  it("digivolves for 0 from an exact Greymon base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-010", as: "greymon" }],
        hand: [{ card: "BT11-064", as: "xGreymon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("xGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard.cardId === "BT11-064");

    expect(s.state.memory).toBe(3);
  });

  it("prevents an effect bounce by bottom-decking X Antibody from its Greymon host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-069", as: "host", under: ["BT11-064", "BT9-109"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("host").topCard.instanceId]);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT9-109");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).not.toContain("BT9-109");
  });

  it("does not protect a non-Greymon non-Omnimon host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-075", as: "host", under: ["BT11-064", "BT9-109"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.returnToHand([s.perm("host").topCard.instanceId]);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-075");
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
