import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-014.js";

describe("BT14-014", () => {
  it("preserves its ACE stats, Overflow, and Greymon evolution route", () => {
    expect(getCardDefinition("BT14-014")).toMatchObject({
      nameEn: "MetalGreymon",
      colors: ["Red"],
      level: 5,
      playCost: 4,
      dp: 8000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      types: ["Cyborg"],
      isAce: true,
      overflowMemory: 3,
    });
    expect(digivolutionRequirementsFor("BT14-014")).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
    ]);
  });
  it("has Blast Digivolve", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    }));
  it("deletes an opposing 6000 DP or lower Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
      });
  });

  it("deletes one opposing Digimon at 6000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-014", as: "metalgreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "low", dp: 6000 },
            { card: "BT14-068", as: "high", dp: 6001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("evolves from Greymon for 3 and deletes exactly one 6000 DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-012", as: "greymon" }],
          hand: [{ card: "BT14-014", as: "metalgreymon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "exact", dp: 6000 },
            { card: "BT14-068", as: "above", dp: 6001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard.cardId === "BT14-014");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-068")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Blast Digivolves without cost and applies Overflow 3 when the ACE leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-012", as: "greymon" }],
          hand: [{ card: "BT14-014", as: "metalgreymon" }],
          deck: ["BT1-001"],
          security: ["BT1-085"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "attacker", dp: 7000 },
            { card: "BT1-020", as: "target", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("metalgreymon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard.cardId === "BT14-014");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);

    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId], "byEffect")).toBe(1);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });
});
