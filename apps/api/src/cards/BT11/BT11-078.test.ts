import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-078.js";
import "./BT11-079.js";

describe("BT11-078 Soulmon", () => {
  it("maps catalog facts, Retaliation, and the continuous DP grant to IR", () => {
    expect(getCardDefinition("BT11-078")).toMatchObject({
      cardId: "BT11-078", colors: ["Purple"], level: 4, playCost: 5, dp: 4000, types: ["Ghost"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Retaliation" }] },
      { trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 2000 }] },
    ]);
  });

  it("gives +2000 DP only to all of its controller's Digimon with Retaliation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-078", as: "soulmon" },
          { card: "BT11-079", as: "ally-retaliation" },
          { card: "BT1-009", as: "ally-plain" },
        ],
      },
      1: { battleArea: [{ card: "BT11-079", as: "opponent-retaliation" }] },
    });
    const printedDP = Object.fromEntries(
      ["soulmon", "ally-retaliation", "ally-plain", "opponent-retaliation"].map((alias) => [
        alias,
        s.perm(alias).baseDP,
      ]),
    );
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("soulmon"), "Retaliation")).toBe(true);
    expect(s.perm("soulmon").currentDP).toBe(printedDP.soulmon! + 2000);
    expect(s.perm("ally-retaliation").currentDP).toBe(printedDP["ally-retaliation"]! + 2000);
    expect(s.perm("ally-plain").currentDP).toBe(printedDP["ally-plain"]);
    expect(s.perm("opponent-retaliation").currentDP).toBe(printedDP["opponent-retaliation"]);
  });

  it("retains printed Retaliation as executable battle behavior", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-078", as: "soulmon" }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    const soulmonId = s.perm("soulmon").permanentId;
    const opponentId = s.perm("opponent").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: soulmonId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== soulmonId) &&
        s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== opponentId),
    );

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === soulmonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentId)).toBe(false);
  });
});
