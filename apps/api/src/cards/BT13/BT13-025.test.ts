import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-025.js";

describe("BT13-025 GaoGamon", () => {
  it("conditionally plays Thomas and preserves the inherited hand-size aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          optional: true,
          condition: expect.objectContaining({
            kind: "youHaveNone",
            filter: expect.objectContaining({
              nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "nameExact" }],
            }),
          }),
          target: expect.objectContaining({
            filter: expect.objectContaining({
              nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "nameExact" }],
            }),
          }),
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "Aura" })],
    });
  });

  it("plays Thomas from hand without cost on digivolution when none is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-021", as: "gaomon" }],
          hand: [
            { card: "BT13-025", as: "gaogamon" },
            { card: "BT13-097", as: "thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const evolutionMaterialId1 = s.perm("gaomon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    expect(s.state.memory).toBe(1);
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097")).toBe(true);
  });

  it("does not play another Thomas when its controller already has one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-021", as: "gaomon" },
            { card: "BT13-097", as: "existing-thomas" },
          ],
          hand: [
            { card: "BT13-025", as: "gaogamon" },
            { card: "BT13-097", as: "hand-thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 3;
    const evolutionMaterialId2 = s.perm("gaomon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").stack.some((card) => card.instanceId === evolutionMaterialId2));
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId2);
    expect(s.state.memory).toBe(1);
    await settle(() => s.perm("gaomon").topCard.cardId === "BT13-025");

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT13-097")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toContain(s.inst("hand-thomas"));
  });

  it("does not treat the near-name Marcus Damon & Thomas H. Norstein as Thomas H. Norstein", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-021", as: "gaomon" }],
          hand: [
            { card: "BT13-025", as: "gaogamon" },
            { card: "AD1-021", as: "near-thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 3;
    const evolutionMaterialId3 = s.perm("gaomon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").stack.some((card) => card.instanceId === evolutionMaterialId3));
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId3);
    expect(s.state.memory).toBe(1);
    await settle(() => s.perm("gaomon").topCard.cardId === "BT13-025");

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toContain(s.inst("near-thomas"));
  });

  it("does not let the near-name dual Tamer block an exact Thomas play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-021", as: "gaomon" },
            { card: "AD1-021", as: "near-thomas" },
          ],
          hand: [
            { card: "BT13-025", as: "gaogamon" },
            { card: "BT13-097", as: "exact-thomas" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 3;
    const evolutionMaterialId4 = s.perm("gaomon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").stack.some((card) => card.instanceId === evolutionMaterialId4));
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId4);
    expect(s.state.memory).toBe(1);
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-097"),
      3000,
    );

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT13-097")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("near-thomas"));
  });

  it("allows its controller to decline the free Thomas play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-021", as: "gaomon" }],
          hand: [
            { card: "BT13-025", as: "gaogamon" },
            { card: "BT13-097", as: "thomas" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );

    s.state.memory = 3;
    const evolutionMaterialId5 = s.perm("gaomon").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gaomon").permanentId,
        instanceId: s.inst("gaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gaomon").stack.some((card) => card.instanceId === evolutionMaterialId5));
    expect(s.perm("gaomon").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId5);
    expect(s.state.memory).toBe(1);
    await settle(() => s.perm("gaomon").topCard.cardId === "BT13-025");

    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT13-097")).toBe(false);
  });

  it("gains the inherited 1000 DP exactly when the opponent reaches eight cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-041", as: "gaogamon", under: ["BT13-025"] }] },
      1: { hand: Array.from({ length: 7 }, (_, index) => ({ card: "BT13-021", as: `opponent-${index}` })) },
    });
    await s.ready();
    expect(s.perm("gaogamon").currentDP).toBe(6000);

    s.give(1, Zone.Hand, "BT1-010");
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.perm("gaogamon").currentDP).toBe(7000);
  });
});
