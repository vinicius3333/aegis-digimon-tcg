import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT14/BT14-062.js";
import "./BT17-013.js";
import "./BT17-017.js";
import { compiled } from "./BT17-010.js";

describe("BT17-010", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition("BT17-010")).toMatchObject({
      cardId: "BT17-010",
      nameEn: "Growlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less. If this effect didn't delete, this Digimon gets +3000 DP for the turn.",
      inheritedEffectText:
        "[All Turns] While you have 0 or less memory, add 2000 to this Digimon's DP-based deletion effects' maximums.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("registers the mandatory When Digivolving delete-or-DP effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
        },
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
  });

  it("registers the inherited DP deletion maximum effect", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes a legal 4000-DP target on natural digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("rookie").topCard.cardId).toBe("BT17-010");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // Q2718: the delete is mandatory with a legal target, so the "didn't delete" branch
    // never fires and the Digimon stays at its printed 5000 DP.
    expect(s.perm("rookie").currentDP).toBe(5000);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("gets +3000 DP when natural digivolution has no deletable target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").topCard.cardId === "BT17-010");

    expect(s.perm("rookie").currentDP).toBe(8000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("raises another DP deletion threshold from an inherited stack card at memory 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("growlmon").topCard.cardId).toBe("BT17-013");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("chooses an undeletable target and still gets +3000 DP (Q2719)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT14-062", as: "protected", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").currentDP === 8000);

    // The only legal DP target can't be deleted by opponent effects; it is still a legal
    // choice, the deletion does nothing, and the "if this effect didn't delete" branch fires.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("protected").topCard.cardId).toBe("BT14-062");
    expect(s.perm("rookie").currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
  });

  it("does not raise another effect's maximum while memory is above 0 (Q2720)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("growlmon").topCard.cardId === "BT17-013");

    // Memory ends at 2 (own side), so the inherited condition fails and WarGrowlmon's
    // printed 6000 maximum is not raised to 8000: the 7000-DP Digimon survives.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("does not raise a DP-relative deletion threshold (Q2722)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "wargrowlmon", under: ["BT17-010"] }],
          hand: [{ card: "BT17-017", as: "ancient" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 13_000 },
            { card: "BT1-011", as: "control", dp: 12_000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wargrowlmon").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wargrowlmon").topCard.cardId === "BT17-017");

    // Memory is 0, so the inherited effect is live, but AncientGreymon deletes "with as much
    // or less DP than this Digimon" - no printed numeric maximum, so no +2000 (Q2722).
    // 13000 > 12000 keeps the target alive.
    expect(s.state.memory).toBe(0);
    // Positive control: the 12000-DP Digimon is inside the relative threshold and dies,
    // proving the effect resolved; the 13000-DP one is outside it and is never reachable.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(13_000);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
  });
});
