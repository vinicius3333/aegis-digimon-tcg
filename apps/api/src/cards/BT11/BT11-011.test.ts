import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-011.js";

describe("BT11-011 Birdramon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-011")).toMatchObject({
      cardId: "BT11-011",
      nameEn: "Birdramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Giant Bird"],
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

  it("has Blocker while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-011", as: "birdramon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("birdramon"), "Blocker")).toBe(true);
  });

  it("blocks a real player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-011", as: "blocker" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-028", as: "attacker", dp: 6000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("evolves from a red level 3 for exactly 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "base" }], hand: [{ card: "BT11-011", as: "birdramon" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("birdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-011");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT1-010");
  });

  it("plays a red Tamer costing 4 or less from hand when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-011"] }],
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
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tai").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-086", "BT13-095"]);
  });

  it("may refuse the inherited play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-011"] }],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
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
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
