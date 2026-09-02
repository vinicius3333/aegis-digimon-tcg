import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-059.js";
import "./EX11-023.js";

describe("EX11-059 Reina Oumi", () => {
  it("preserves the printed dual-color NSo Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-059")).toMatchObject({
      nameEn: "Reina Oumi",
      colors: ["Yellow", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["NSo", "LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });

  it("trashes an NSo card to draw and gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-059", as: "reina" }], hand: ["EX8-030"], deck: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-030")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not gain memory when the required NSo discard is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-059", as: "reina" }], hand: ["BT1-001"], deck: ["BT1-002"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    await settle(() => false, 30);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
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
    assertNoLoudGap(s);
  });

  it("ignores the deletion of a Digimon without the NSo trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-059", as: "reina" },
            { card: "BT1-009", as: "plain" },
            { card: "EX8-033", as: "fieldMaterial" },
          ],
          hand: [{ card: "EX12-032", as: "dnaTarget" }],
          trash: [{ card: "EX8-013", as: "trashMaterial" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("plain").permanentId], "byEffect");
    await settle(() => false, 60);

    expect(s.perm("reina").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dnaTarget").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashMaterial").instanceId)).toBe(true);
    assertNoLoudGap(s);
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
