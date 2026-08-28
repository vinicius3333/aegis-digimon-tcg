import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-034.js";

describe("BT14-034", () => {
  it("preserves Sukamon's catalog identity and complete IR", () => {
    expect(getCardDefinition("BT14-034")).toMatchObject({
      nameEn: "Sukamon",
      colors: ["Yellow", "Black"],
      level: 4,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      attributes: ["Virus"],
      types: ["Abnormal"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("battles as Security Digimon before playing itself at end of battle for no cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-031", as: "attacker", dp: 500 }] },
      1: { security: [{ card: "BT14-034", as: "sukamon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-034"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-031");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT14-034");
    expect(checked).toBeGreaterThanOrEqual(0);
    expect(played).toBeGreaterThan(checked);
    assertNoLoudGap(s);
  });

  it("inherits -3000 DP from a legal Chuumon to Sukamon stack when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-032", as: "base" }], hand: [{ card: "BT14-034", as: "sukamon" }] },
        1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-034");
    expect(s.state.memory).toBe(3);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
