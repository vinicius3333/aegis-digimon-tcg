import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-087.js";
import "./index.js";

describe("BT17-087 Marcus Damon", () => {
  it("turns one Marcus Damon into a temporary 3000-DP Blocker that cannot digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "GrantStatic", grant: "kinds", tokens: ["Digimon"], duration: "untilOpponentTurnEnd" },
        { kind: "SetBaseDP", value: 3000, duration: "untilOpponentTurnEnd" },
        { kind: "Restrict", restriction: "digivolve", duration: "untilOpponentTurnEnd" },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
      ],
    });
  });

  it("resolves both All Turns effects only when this Tamer suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
        { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("plays Marcus Damon from Security when checked", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT17-087", as: "marcus" }],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const marcusId = s.inst("marcus").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === marcusId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === marcusId)).toBe(false);
  });
});
