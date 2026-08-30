import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-097.js";

describe("BT16-097", () => {
  it("plays Ankylomon or Angemon then DNA digivolves", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true });
  });

  it("adds the top card of the deck to security if DNA digivolution succeeds", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      source: "deck",
      amount: 1,
      condition: { kind: "ifThisEffectDigivolved" },
    });
  });

  it("plays Armadillomon or Patamon from security and returns itself to hand", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("publicly plays an Angemon without requiring DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-019", as: "color" },
            { card: "BT16-050", as: "black" },
          ],
          hand: [
            { card: "BT16-097", as: "option" },
            { card: "BT16-019", as: "angemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-019"));
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-019")).toBe(true);
  });

  it("recovers after the effect's DNA digivolution succeeds", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-008", as: "redMaterial" },
            { card: "BT16-088", as: "colorSource" },
          ],
          hand: [
            { card: "BT16-097", as: "option" },
            { card: "BT16-019", as: "angemon" },
            { card: "BT16-012", as: "silphymon" },
          ],
          security: [{ card: "BT16-050" }],
          deck: ["BT16-050", "BT16-050", "BT16-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-012") &&
        s.state.players[0]?.security.length === 2,
    );
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-012")).toBe(true);
    expect(s.state.players[0]?.security).toHaveLength(2);
  });
});
