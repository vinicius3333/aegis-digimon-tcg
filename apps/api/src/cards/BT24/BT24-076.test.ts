import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_076 } from "./BT24-076.js";
import "../index.js";

describe("BT24-076 WarGrowlmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-076")).toMatchObject({
      cardId: "BT24-076",
      nameEn: "WarGrowlmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "Dark Dragon"],
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
    });
  });

  it("keeps the trash Main cost reduction and level restrictions", () => {
    const trash = BT24_076.effects?.find((entry) => entry.trigger === "Main");
    expect(trash).toMatchObject({
      isFromTrash: true,
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCostBy: 2,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_076.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("activates from trash at four cards in hand and pays the play cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT24-076", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("wargrowlmon").activatableEffectsJson || "[]") as { effectKey: string }[];

    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("wargrowlmon").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("wargrowlmon").instanceId,
      ),
    );
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("does not activate from trash above four cards in hand", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        trash: [{ card: "BT24-076", as: "wargrowlmon" }],
      },
    });
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();

    expect(JSON.parse(s.inst("wargrowlmon").activatableEffectsJson || "[]")).toHaveLength(0);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("public play pays 7 and deletes only a level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-076", as: "wargrowlmon" }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT24-072", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("level5").permanentId,
    );
  });

  it("public evolution pays 3 and resolves the level-4 deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "base" }],
          hand: [{ card: "BT24-076", as: "wargrowlmon" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    const level4Id = s.perm("level4").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("wargrowlmon").instanceId);
  });

  it("deletes a level 4 or lower Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-076", as: "wargrowlmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wargrowlmon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);
  });

  it.each([
    ["Dark Dragon", "BT24-070"],
    ["Evil Dragon", "BT11-079"],
  ])("public inherited deletion plays a level 4 %s from trash", async (_label, reviveCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: ["BT24-076"] }],
          trash: [{ card: reviveCard, as: "revive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revive").instanceId),
    );
  });

  it("does not revive a level 5 Dark Dragon from inherited deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: ["BT24-076"] }],
          trash: [{ card: "BT24-076", as: "level5" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("level5").instanceId);
  });
});
