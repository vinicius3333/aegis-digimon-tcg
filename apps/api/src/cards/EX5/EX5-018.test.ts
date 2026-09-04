import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-018.js";
import "../index.js";

describe("EX5-018 Garurumon (X Antibody)", () => {
  it("draws two, trashes two, and gains memory when its stack has Garurumon/X Antibody", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions).toMatchObject([
      { kind: "Draw", amount: 2 },
      { kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } },
      {
        kind: "GainMemory",
        amount: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "nameExact", tokens: ["Garurumon"] },
              { match: "nameExact", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
  });
  it("prevents deletion by returning two non-Digi-Egg trash cards to deck bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      leaveCause: "byBattle",
      outcome: "preventDeletion",
      cost: { kind: "return", target: { filter: { excludeKind: ["DigiEgg"] }, count: 2, to: "deckBottom" } },
    });
  });

  it("gains memory only for an exact Garurumon or X Antibody stack name", async () => {
    const resolve = async (stackCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "base", under: [stackCard] }],
            hand: [{ card: "EX5-018", as: "evolving" }, "BT1-009", "BT1-009", "BT1-009"],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 0;
      await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evolving").instanceId, {
        payCost: false,
        draw: false,
        ignoreRequirements: true,
      });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-018");
      return s.state.memory;
    };

    expect(await resolve("BT1-036")).toBe(1);
    expect(await resolve("BT17-023")).toBe(0);
    expect(await resolve("BT13-063")).toBe(0);
  });

  it("prevents battle deletion of a matching host by returning two non-Digi-Egg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-018"] }],
          trash: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("allows battle deletion when the replacement has only one non-Digi-Egg card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-018"] }],
          trash: ["BT1-009", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
