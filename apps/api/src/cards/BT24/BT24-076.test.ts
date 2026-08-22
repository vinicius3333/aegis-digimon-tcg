import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_076 } from "./BT24-076.js";
import "../index.js";

describe("BT24-076 WarGrowlmon", () => {
  it("keeps the trash Main cost reduction and level restrictions", () => {
    const trash = BT24_076.effects?.find((entry) => entry.trigger === "Main");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCost: 2,
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
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
          hand: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
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

    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetId);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("does not activate from trash above four cards in hand", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        deck: ["BT1-005"],
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

  it("inherited deletion plays a level 4 Dark Dragon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-077", as: "host", under: ["BT24-076"] }],
          trash: [{ card: "BT24-070", as: "darkDragon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("darkDragon").instanceId,
      ),
    );
  });
});
