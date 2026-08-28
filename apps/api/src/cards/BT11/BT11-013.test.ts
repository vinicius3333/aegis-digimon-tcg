import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-013.js";

describe("BT11-013 Garudamon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-013")).toMatchObject({
      cardId: "BT11-013",
      nameEn: "Garudamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Birdkin"],
      effectText:
        "＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)",
      inheritedEffectText:
        "[On Deletion] You may play 1 red Tamer card with a play cost of 4 or less from your hand without paying the cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
        {
          trigger: "OnDeletion",
          isInherited: true,
          actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("evolves from a red level 4 for exactly 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-011", as: "base" }], hand: [{ card: "BT11-013", as: "garudamon" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-013");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT11-011");
  });

  it("has Blocker and plays an eligible red Tamer from hand on its host's deletion", async () => {
    const top = setupEngine({ 0: { battleArea: [{ card: "BT11-013", as: "garudamon" }] } });
    await top.ready();
    expect(observe(top.engine).hasKeyword(top.perm("garudamon"), "Blocker")).toBe(true);

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-013"] }],
          hand: [
            { card: "BT1-085", as: "tai" },
            { card: "BT13-095", as: "tooExpensive" },
            { card: "BT1-086", as: "wrongColor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-086", "BT13-095"]);
  });

  it("may refuse the inherited play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-013"] }],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
      },
      { autoAcceptOptional: false },
    );

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const prompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-085"]);
  });
});
