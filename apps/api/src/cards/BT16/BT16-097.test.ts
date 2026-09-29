import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-097.js";
import "../index.js";

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

describe("BT16-097 Advent of the Ancient Steel Angel — KB Q&A rulings", () => {
  function setupDnaReadyBoard(declinePrompts: string[]) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-008", as: "aquilamon" },
            { card: "BT16-019", as: "fieldAngemon" },
            { card: "BT16-050", as: "blackSource" },
          ],
          hand: [
            { card: "BT16-097", as: "option" },
            { card: "BT16-019", as: "handAngemon" },
            { card: "BT16-012", as: "silphymon" },
          ],
          security: ["BT16-050"],
          deck: ["BT16-050", "BT16-050", "BT16-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("aquilamon").topCard!.instanceId, s.perm("fieldAngemon").topCard!.instanceId);
    s.state.memory = 10;
    return s;
  }

  function onField(s: ReturnType<typeof setupDnaReadyBoard>, instanceId: string): boolean {
    return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
  }

  it("can play Angemon and skip the DNA digivolution (Q2694)", async () => {
    const s = setupDnaReadyBoard(["DNA digivolve"]);
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();

    expect(s.decisions.some(({ req }) => req.promptText === "DNA digivolve")).toBe(true);
    expect(onField(s, s.inst("handAngemon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("silphymon").instanceId]);
    expect(onField(s, s.perm("aquilamon").topCard!.instanceId)).toBe(true);
    expect(onField(s, s.perm("fieldAngemon").topCard!.instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("can skip the play and DNA digivolve 2 Digimon already in the battle area (Q2695)", async () => {
    const s = setupDnaReadyBoard(["Play without paying the cost"]);
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => onField(s, s.inst("silphymon").instanceId) && s.state.players[0]!.security.length === 2);

    expect(s.decisions.some(({ req }) => req.promptText.includes("Play without paying the cost"))).toBe(true);
    const silphymon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("silphymon").instanceId,
    );
    expect(silphymon?.stack.map((card) => card.cardId).sort()).toEqual(["BT16-008", "BT16-019"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handAngemon").instanceId);
    expect(onField(s, s.inst("handAngemon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
