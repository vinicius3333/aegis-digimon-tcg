import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-071.js";
import "../index.js";

describe("BT16-071", () => {
  it("may digivolve itself into a Leomon from hand or trash while attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          payCost: true,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] },
        },
      ],
    });
  });

  it("plays a level 4 or lower Digimon from trash by deleting itself as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "deleteOwn" },
        },
      ],
    });
  });

  it("deletes the inherited host and plays a level 4 Digimon from trash live", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-071", as: "host", under: ["BT16-071"] }],
          trash: [{ card: "BT16-069", as: "played" }],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-069"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-069")).toBe(true);
  });
});

async function attackWithMadLeomon(leomonCards: { hand: string[]; trash: string[] }) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT16-071", as: "host" }],
        hand: leomonCards.hand,
        trash: leomonCards.trash,
        deck: ["BT1-009", "BT1-009"],
      },
      1: { security: ["BT1-009"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["By deleting this Digimon"] },
  );
  s.state.memory = 5;
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  return s;
}

describe("BT16-071 MadLeomon — KB Q&A rulings", () => {
  it("only digivolves into a [Leomon] card whose digivolution requirements it meets (Q2658)", async () => {
    const illegalOnly = await attackWithMadLeomon({ hand: ["BT14-048"], trash: ["BT1-043"] });

    expect(illegalOnly.perm("host").topCard?.cardId).toBe("BT16-071");
    expect(illegalOnly.perm("host").stack).toHaveLength(0);
    expect(illegalOnly.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT14-048"]);
    expect(illegalOnly.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-043"]);
    expect(illegalOnly.state.memory).toBe(5);

    const withLegalGrapLeomon = await attackWithMadLeomon({ hand: ["BT14-048", "BT4-057"], trash: ["BT1-043"] });

    expect(withLegalGrapLeomon.perm("host").topCard?.cardId).toBe("BT4-057");
    expect(withLegalGrapLeomon.perm("host").stack.map((card) => card.cardId)).toEqual(["BT16-071"]);
    expect(withLegalGrapLeomon.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT14-048", "BT1-009"]);
    expect(withLegalGrapLeomon.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-043"]);
    expect(withLegalGrapLeomon.state.memory).toBe(3);
  });
});
