import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-019.js";

describe("BT17-019", () => {
  it("draws if you have a Matt Ishida Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "youHave" } }],
    });
  });

  it("can DNA digivolve using itself and another Digimon at end of turn as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DnaDigivolve",
          payCost: true,
          optional: true,
          materials: [{ count: 1 }, { count: 1, zone: "battleArea" }],
        },
      ],
    });
  });

  it("draws at the start of the main phase when Matt is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-019", as: "gabumon" },
          { card: "BT1-086", as: "matt" },
        ],
        deck: ["BT1-009"],
      },
    });
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  });

  it("naturally DNA digivolves at end of turn using itself and another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", as: "host", under: ["BT17-019"] },
            { card: "BT1-069", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "paildramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-028"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT17-019", "BT1-069"]),
    );
  });

  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT17-019")).toMatchObject({
      cardId: "BT17-019",
      nameEn: "Gabumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
      effectText:
        "[Digivolve][Tsunomon]: Cost 0 \n\n[Start of Your Main Phase] If you have a Tamer with [Matt Ishida]\u00a0in its name, ＜Draw 1＞.",
      inheritedEffectText:
        "[End of Your Turn] This Digimon and another of your Digimon may DNA digivolve into a Digimon card in the hand.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Tsunomon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("treats [Matt Ishida] as a substring of the Tamer name", async () => {
    // BT17-081 raises optional prompts of its own once the whole BT17 set is registered in the
    // worker; decline them so this flow is deterministic regardless of registration order.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-019", as: "gabumon" },
            { card: "BT17-081", as: "taiAndMatt" },
          ],
          deck: ["BT1-009"],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand).toHaveLength(before + 1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not draw when no Matt Ishida Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-019", as: "gabumon" },
          { card: "BT1-085", as: "tai" },
        ],
        deck: ["BT1-009"],
        hand: [{ card: "BT1-010", as: "spare" }],
      },
    });
    await s.ready();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand).toHaveLength(before);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("accepts the [Tsunomon] Cost 0 route from an off-color Tsunomon in breeding", async () => {
    const s = setupEngine({
      0: { breeding: { card: "ST16-01", as: "tsunomon" }, hand: [{ card: "BT17-019", as: "gabumon" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const eggId = s.inst("tsunomon").instanceId;
    const gabumonId = s.inst("gabumon").instanceId;
    const permanentId = s.perm("tsunomon").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: gabumonId, useAlternateCost: true }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === gabumonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(permanentId);
    expect(s.state.players[0]!.breeding?.stack[0]!.instanceId).toBe(eggId);
  });

  it("rejects an off-color non-Tsunomon egg as a digivolution source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT17-006", as: "bowmon" }, hand: [{ card: "BT17-019", as: "gabumon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bowmon").permanentId,
        instanceId: s.inst("gabumon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT17-006");
    expect(s.state.memory).toBe(0);
  });

  it("does not DNA digivolve into a hand Digimon without a DNA digivolution requirement (Q2749/Q2750)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", as: "host", under: ["BT17-019"] },
            { card: "BT1-069", as: "partner" },
          ],
          hand: [{ card: "BT1-070", as: "noDna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("noDna").instanceId)).toBe(true);
  });
});
