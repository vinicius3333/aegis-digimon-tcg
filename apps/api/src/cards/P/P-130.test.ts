import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-130.js";
import "../EX13/EX13-035.js";
import { breedingUnderKingEtemon, moveRaisedOutOfBreeding } from "./qaRulings3.testSupport.js";

describe("P-130 Lui Ohwada", () => {
  it("moves an eligible breeding Digimon on play, suspends, and gains memory", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-130", as: "lui" }], battleArea: [], breeding: { card: "BT1-009", as: "raised" } },
      },
      { autoAcceptOptional: true },
    );
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    await s.ready();
    const raisedId = s.perm("raised").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.breeding === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === raisedId),
    );
    expect(s.state.memory).toBe(8);
    expect(s.perm("lui").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q4242 cannot move a level-less Digimon from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-130", as: "lui" }],
          breeding: { card: "BT19-077", as: "calumon" },
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.phase = Phase.Main;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lui").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT19-077");
    expect(s.state.memory).toBe(7);
  });
});

describe("P-130 Lui Ohwada — KB Q&A rulings", () => {
  it("still suspends to gain memory when the moved Digimon is deleted at 0 DP on arrival (Q4243)", async () => {
    const s = breedingUnderKingEtemon([{ card: "P-130", as: "P-130" }]);
    s.state.phase = Phase.Breeding;
    await moveRaisedOutOfBreeding(s);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("raised").instanceId);
    expect(s.perm("P-130").isSuspended).toBe(true);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.to - event.from === 1)).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
