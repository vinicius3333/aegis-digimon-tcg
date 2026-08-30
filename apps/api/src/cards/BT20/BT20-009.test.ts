import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./index.js";
import { compiled } from "./BT20-009.js";

describe("BT20-009 Veemon", () => {
  it("proves purple-play triggering and optional Free digivolution from hand", () => {
    const effect = compiled.effects.find((entry) => !entry.isInherited);
    const watcher = effect?.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] },
    });
    expect(irNode(watcher)?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      reduceCost: 1,
      from: ["hand"],
      into: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
    });
  });

  it("digivolves itself into a Free Digimon for 1 less after an allied purple Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon" }],
          hand: [
            { card: "ST6-03", as: "purple" },
            { card: "BT20-011", as: "exVeemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("purple").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("veemon").topCard.cardId === "BT20-011");
    expect(s.state.memory).toBe(1);

    const nonMatch = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "veemon" }],
          hand: [
            { card: "BT20-010", as: "black" },
            { card: "BT20-011", as: "exVeemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonMatch.state.memory = 5;
    expect(nonMatch.engine.applyIntent(0, { type: "playCard", instanceId: nonMatch.inst("black").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => false, 20);
    expect(nonMatch.perm("veemon").topCard.cardId).toBe("BT20-009");
  });

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-011", dp: 4000, as: "host", under: ["BT20-009"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
