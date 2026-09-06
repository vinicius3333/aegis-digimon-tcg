import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./ST18-13.js";

describe("ST18-13 Eaglemon", () => {
  it("replays itself for free through Fortitude when deleted with evolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-13", as: "eaglemon", under: ["ST18-10"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eaglemonInstanceId = s.perm("eaglemon").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("eaglemon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === eaglemonInstanceId));

    const replayed = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === eaglemonInstanceId);
    expect(replayed).toBeDefined();
    expect(replayed?.stack).toHaveLength(0);
  });

  it("returns a suspended opponent Digimon to hand on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST18-13", as: "eaglemon" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eaglemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "ST18-03"));

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "ST18-03")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("returns a suspended opponent Digimon to hand when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-10", as: "base" }], hand: [{ card: "ST18-13", as: "eaglemon" }] },
        1: { battleArea: [{ card: "ST18-03", as: "victim", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("eaglemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "ST18-03"));

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "ST18-03")).toBe(true);
  });

  it("does not return an unsuspended opponent Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST18-13", as: "eaglemon" }] }, 1: { battleArea: [{ card: "ST18-03", as: "victim" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eaglemon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "ST18-03")).toBe(false);
  });

  it("publishes Fortitude", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [expect.objectContaining({ keyword: "Fortitude" })],
      }),
    );
  });
});
