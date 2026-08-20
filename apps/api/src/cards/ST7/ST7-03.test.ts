import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-03.js";

describe("ST7-03 Guilmon", () => {
  it("digivolves into Gallantmon for 4 ignoring requirements when the opponent has level 6", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-03", as: "guilmon" }], hand: [{ card: "ST7-09", as: "gallantmon" }] },
      1: { battleArea: ["ST7-09"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.cardId === "ST7-09");
    expect(s.state.memory).toBe(1);
  });

  it("draws once when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { deck: [{ card: "ST7-02", as: "drawn" }], battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }] },
        1: { battleArea: ["ST7-02"], security: ["ST7-01"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
  });

  it("draws only once across two opposing deletions in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "ST7-02", as: "firstDraw" }, { card: "ST7-02", as: "secondDraw" }],
        battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }],
      },
      1: { battleArea: [{ card: "ST7-02", as: "first" }, { card: "ST7-02", as: "second" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not use the alternate path for a near-name Gallantmon card", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-03", as: "guilmon" }], hand: [{ card: "BT17-018", as: "crimson" }] },
      1: { battleArea: ["ST7-09"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("crimson").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not draw when its host and the opposing Digimon are deleted simultaneously", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "ST7-02", as: "wouldDraw" }],
        battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-03"] }],
      },
      1: { battleArea: [{ card: "ST7-02", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([
      s.perm("host").permanentId,
      s.perm("opponent").permanentId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
