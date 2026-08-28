import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-007.js";
import "./BT13-110.js";

describe("BT13-007 King Drasil_7D6", () => {
  it("prevents its controller's Digimon from digivolving while it is in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT13-007", as: "drasil" },
        battleArea: [{ card: "BT1-045", as: "base" }],
        hand: [{ card: "BT18-036", as: "evolver" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe("BT1-045");
  });

  it("reduces one Royal Knight play by 4 plus its source count, then spends the once-per-turn budget", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001", "BT1-002"] },
          hand: [
            { card: "BT13-040", as: "firstKnight" },
            { card: "BT13-040", as: "secondKnight" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the Royal Knight play-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil", under: ["BT1-001", "BT1-002"] },
          hand: [{ card: "BT13-040", as: "knight" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(3);
  });

  it("must place the top Digi-Egg and every battle-area Royal Knight under itself at Start of Main", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          battleArea: [
            { card: "AD1-008", as: "knight" },
            { card: "BT1-015", as: "nonKnight" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const eggId = s.inst("egg").instanceId;
    const knightId = s.perm("knight").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("drasil"));
    await settle(() => s.perm("drasil").stack.some((card) => card.instanceId === eggId));

    expect(s.perm("drasil").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([eggId, knightId]));
    expect(s.perm("drasil").stack.find((card) => card.instanceId === eggId)?.faceUp).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonKnight").permanentId,
    ]);
  });

  it("gains memory only once when Royal Knight Options enter battle with King Drasil inherited", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "host", under: ["BT13-007"] },
          hand: [
            { card: "BT13-110", as: "firstOption" },
            { card: "BT13-110", as: "secondOption" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-110"));
    await settle();
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT13-110").length === 2,
    );
    expect(s.state.memory).toBe(-1);
  });
});
