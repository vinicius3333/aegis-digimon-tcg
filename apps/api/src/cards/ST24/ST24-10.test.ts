import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("ST24-10 Lilamon", () => {
  it("suspends an opposing target and free-digivolves into DATA SQUAD after trashing exactly two bottom face-down Tamer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST24-13",
              as: "tamer",
              under: [{ card: "BT1-001", as: "under1", faceUp: false }],
            },
            {
              card: "ST24-14",
              as: "tamer2",
              under: [{ card: "BT1-002", as: "under2", faceUp: false }],
            },
          ],
          hand: [
            { card: "ST24-10", as: "lilamon" },
            { card: "ST24-11", as: "next" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("next").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("next").instanceId),
    ).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
    expect(
      s.state.players[0]!.trash.filter(
        (card) => card.instanceId === s.inst("under1").instanceId || card.instanceId === s.inst("under2").instanceId,
      ),
    ).toHaveLength(2);
  });

  it("does not free-digivolve when only one bottom face-down Tamer card is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] }],
          hand: [
            { card: "ST24-10", as: "lilamon" },
            { card: "ST24-11", as: "next" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("next").instanceId)).toBe(true);
  });

  it("prevents a Rosemon-name host from leaving by paying the inherited replacement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-11", as: "host", under: [{ card: "ST24-10" }] },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("under").instanceId)).toBe(true);
  });

  it("allows a DATA SQUAD host to leave when no inherited cost card exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST24-11", as: "host", under: [{ card: "ST24-10" }] }] } });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId])).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });
});

function lilamonBoard(tamers: { card: string; under: { card: string; as: string; faceUp: false }[] }[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: tamers,
        hand: [
          { card: "ST24-10", as: "lilamon" },
          { card: "ST24-11", as: "rosemon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  return s;
}

async function playLilamon(s: ReturnType<typeof lilamonBoard>) {
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() =>
    s.events.some(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST24-10" && event.timing === "OnPlay",
    ),
  );
  await settle(() => s.state.pendingDecision === undefined);
}

describe("ST24-10 Lilamon — KB Q&A rulings", () => {
  it("cannot pay the digivolve cost by trashing only 1 face-down card from under a Tamer (Q6221)", async () => {
    const s = lilamonBoard([{ card: "ST24-13", under: [{ card: "BT1-001", as: "onlyUnder", faceUp: false }] }]);

    await playLilamon(s);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("rosemon").instanceId]);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("onlyUnder").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("pays the digivolve cost with 1 face-down card from under each of 2 Tamers (Q6222)", async () => {
    const s = lilamonBoard([
      { card: "ST24-13", under: [{ card: "BT1-001", as: "firstUnder", faceUp: false }] },
      { card: "ST24-14", under: [{ card: "BT1-002", as: "secondUnder", faceUp: false }] },
    ]);

    await playLilamon(s);

    const rosemonId = s.inst("rosemon").instanceId;
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === rosemonId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("firstUnder").instanceId, s.inst("secondUnder").instanceId].sort(),
    );
  });
});
