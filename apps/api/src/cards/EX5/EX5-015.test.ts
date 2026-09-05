import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-015.js";
import "../index.js";

describe("EX5-015 Gabumon (X Antibody)", () => {
  it("reveals four and adds up to two Garurumon/X Antibody cards, then trashes a hand card if successful", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 4,
        rest: "deckBottom",
        add: [{ count: 2, filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon", "X Antibody"] }] } }],
      },
      { kind: "Trash", condition: { kind: "ifThisEffectActed" } },
    ]);
  });
  it("has the same reveal effect when digivolving and a deletion replacement", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      leaveCause: "byBattle",
      cost: { kind: "return", target: { count: 2, to: "deckBottom", filter: { excludeKind: ["DigiEgg"] } } },
      outcome: "preventDeletion",
    });
  });

  it("adds every available matching card from four reveals and trashes one hand card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: ["BT1-036", "BT1-044", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("sacrifice").instanceId);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-036"), 500);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-036", "BT1-044"]));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not trash a hand card when none of the four revealed cards matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-015"), 500);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("prevents battle deletion of a Garurumon host by returning two trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-015"] }],
          trash: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("does not prevent battle deletion when a matching host cannot pay the two-card cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-015"] }],
          trash: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not count a Digi-Egg toward the two-card battle deletion replacement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-015"] }],
          trash: ["BT1-009", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not prevent battle deletion when the host name does not match", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-015"] }] } });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
