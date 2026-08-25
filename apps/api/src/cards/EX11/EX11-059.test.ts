import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-059.js";
import "./EX11-023.js";

describe("EX11-059 Reina Oumi", () => {
  it("trashes an NSo card to draw and gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-059", as: "reina" }], hand: ["EX8-030"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-030")).toBe(true);
  });

  it("uses the deleted NSo card from trash with a field NSo Digimon for DNA digivolution (Q5913)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-059", as: "reina" },
            { card: "EX8-013", as: "deletedMaterial" },
            { card: "EX8-033", as: "fieldMaterial" },
          ],
          hand: [{ card: "EX12-032", as: "dnaTarget" }],
        },
        1: { battleArea: [{ card: "EX11-023", as: "deleter" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    // Kaguyamon's real [When Digivolving] deletion opens a production resolution window.
    // Reina's reaction is therefore pending until the deleted card has reached trash,
    // exactly the ordering whose consequence Q5913 specifies.
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("deleter"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-032"));

    const dna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-032");
    expect(dna).toBeDefined();
    expect(s.perm("reina").isSuspended).toBe(true);
    expect(dna?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX8-033", "EX8-013"]));
  });

  it("publishes full IR with distinct field and trash NSo material pools", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["NSo"] }] },
        actions: [
          {
            kind: "DnaDigivolve",
            materials: { filter: { zone: "battleArea" }, count: 1 },
            looseMaterials: { filter: { zone: "trash" }, count: 1, from: ["trash"] },
            into: { zone: "hand", nameOrTrait: [{ tokens: ["NSo"] }] },
            cost: { kind: "suspend" },
          },
        ],
      },
    ]);
  });
});
