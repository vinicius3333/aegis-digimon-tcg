import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-051.js";

describe("BT15-051", () => {
  it("matches the catalog identity and green level-5 evolution route", () => {
    expect(getCardDefinition("BT15-051")).toMatchObject({
      nameEn: "Lillymon (X Antibody)",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Fairy", "X Antibody"],
    });
  });

  it("gains memory with a suspended opposing Digimon and draws when Lillymon/X Antibody is stacked", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["Lillymon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
      scaling: { per: 1, unit: "cards" },
    });
  });
  it("gains +1000 DP per suspended opposing Digimon as an inherited effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "cards" } }],
    }));

  it("naturally digivolves from a legal X Antibody stack and gains memory and draws per suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-050", as: "base" }],
          hand: [{ card: "BT15-051", as: "lillymon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedOne", suspended: true },
            { card: "BT1-009", as: "suspendedTwo", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lillymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-051" && s.state.players[0]!.hand.length === 2);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT9-050"]);
    expect(s.perm("base").currentDP).toBe(7000);
  });

  it("does not draw when the digivolution stack has neither Lillymon nor X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-047", as: "base" }],
          hand: [{ card: "BT15-051", as: "lillymon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedOne", suspended: true },
            { card: "BT1-009", as: "suspendedTwo", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lillymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-051" && s.state.players[0]!.hand.length === 0);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("base").currentDP).toBe(7000);
  });
});
