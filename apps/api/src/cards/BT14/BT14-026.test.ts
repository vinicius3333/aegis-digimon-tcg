import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-026.js";

describe("BT14-026", () => {
  it("preserves Zudomon's catalog identity and complete IR", () => {
    expect(getCardDefinition("BT14-026")).toMatchObject({
      nameEn: "Zudomon",
      colors: ["Blue"],
      level: 5,
      playCost: 4,
      dp: 8000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      attributes: ["Vaccine"],
      types: ["Sea Beast"],
      isAce: true,
      overflowMemory: 3,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 2,
            scope: "acrossDigimon",
            target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" } },
          },
          {
            kind: "Return",
            to: "hand",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
            },
          },
        ],
      });
  });

  it("Q2394 splits its 2 trashed sources across opposing Digimon on play, then returns one", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-026", as: "zudomon" }] },
        1: {
          battleArea: [
            { card: "BT14-015", as: "first", under: ["BT14-012"] },
            { card: "BT14-016", as: "second", under: ["BT14-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zudomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.filter((card) => card.cardId === "BT14-012").length === 2);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.filter((card) => ["BT14-015", "BT14-016"].includes(card.cardId))).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("evolves legally from Shellmon and performs the same split-source effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-025", as: "base" }], hand: [{ card: "BT14-026", as: "zudomon" }] },
        1: {
          battleArea: [
            { card: "BT14-015", as: "first", under: ["BT14-012"] },
            { card: "BT14-016", as: "second", under: ["BT14-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zudomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.filter((card) => card.cardId === "BT14-012").length === 2);
    expect(s.perm("base").topCard.cardId).toBe("BT14-026");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-025"]);
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });

  it("Blast Digivolves for no cost, applies Q2394, and pays Overflow 3 when it leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-025", as: "base" }],
          hand: [{ card: "BT14-026", as: "zudomon" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "attacker" },
            { card: "BT14-015", as: "first", under: ["BT14-012"] },
            { card: "BT14-016", as: "second", under: ["BT14-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("zudomon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.filter((card) => card.cardId === "BT14-012").length === 2);
    expect(s.perm("base").topCard.cardId).toBe("BT14-026");
    expect(s.state.memory).toBe(0);
    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });
});
