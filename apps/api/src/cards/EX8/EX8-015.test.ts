import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-015.js";

describe("EX8-015", () => {
  it("gains DP, blocks return, and conditionally deletes up to 10000 DP when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Restrict", restriction: "beReturned", duration: "untilOpponentTurnEnd" },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
      {
        kind: "Delete",
        target: { count: 1, filter: { dp: { op: "lte", value: 10000 } } },
        condition: { kind: "anyOf" },
      },
    ]));
  it("inherits Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "SecurityAttack",
      amount: 1,
      raw: "＜Security Attack +1＞",
    }));
  it("exposes inherited Security Attack +1 on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "host", under: [{ card: "EX8-015", as: "warGrowlmon" }] }] },
      1: { security: ["BT1-045", "BT1-046"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-046"]);
  });

  it("uses the WarGrowlmon route for 1, gains 3000 DP, blocks returns, and deletes at 10000", async () => {
    expect(digivolutionRequirementsFor("EX8-015")).toContainEqual({
      names: ["WarGrowlmon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-017", as: "warGrowlmon" }],
        hand: [{ card: "EX8-015", as: "xWarGrowlmon" }],
      },
      1: {
        deck: ["BT1-045"],
        battleArea: [
          { card: "BT1-024", as: "boundary" },
          { card: "AD1-004", as: "above" },
        ],
      },
    });
    s.state.memory = 1;
    const boundaryId = s.perm("boundary").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGrowlmon").permanentId,
        instanceId: s.inst("xWarGrowlmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("warGrowlmon").currentDP).toBe(11000);
    expect(observe(s.engine).isRestricted(s.perm("warGrowlmon"), "beReturned")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === boundaryId)).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("AD1-004");

    await advance(s.engine).verb.returnToHand([s.perm("warGrowlmon").topCard.instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("warGrowlmon").currentDP).toBe(8000);
    await advance(s.engine).verb.returnToHand([s.perm("warGrowlmon").topCard.instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not delete without a WarGrowlmon- or X Antibody-name source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-010", as: "meramon" }],
        hand: [{ card: "EX8-015", as: "xWarGrowlmon" }],
      },
      1: { battleArea: [{ card: "BT1-024", as: "target" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("meramon").permanentId,
        instanceId: s.inst("xWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("meramon").topCard.instanceId === s.inst("xWarGrowlmon").instanceId);

    expect(s.perm("meramon").currentDP).toBe(11000);
    expect(observe(s.engine).isRestricted(s.perm("meramon"), "beReturned")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes when an X Antibody trait source has no X Antibody words in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-078", as: "xTraitBase" }],
        hand: [{ card: "EX8-015", as: "xWarGrowlmon" }],
      },
      1: { battleArea: [{ card: "BT1-024", as: "target" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xTraitBase").permanentId,
        instanceId: s.inst("xWarGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
