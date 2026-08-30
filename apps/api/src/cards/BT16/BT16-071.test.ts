import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
