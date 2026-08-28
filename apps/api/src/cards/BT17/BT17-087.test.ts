import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-087.js";
import "./index.js";

describe("BT17-087 Marcus Damon", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-087")).toMatchObject({
      nameEn: "Marcus Damon",
      colors: ["Yellow", "Red"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("turns one selected Marcus Damon into a temporary 3000-DP Blocker that cannot digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "SelectBind", target: { bindAs: "marcusTarget" } },
        { kind: "GrantStatic", target: { fromSelectionRef: "marcusTarget" }, grant: "kinds", tokens: ["Digimon"] },
        { kind: "SetBaseDP", target: { fromSelectionRef: "marcusTarget" }, value: 3000 },
        { kind: "Restrict", target: { fromSelectionRef: "marcusTarget" }, restriction: "digivolve" },
        { kind: "GainKeyword", target: { fromSelectionRef: "marcusTarget" }, keyword: { keyword: "Blocker" } },
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

  it("naturally applies all temporary On Play grants to the chosen Marcus", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-087", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("played"), "Blocker"));

    expect(s.perm("played").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("played"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("played"), "digivolve")).toBe(true);
  });

  it("naturally reacts only when this Marcus becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-087", as: "marcus" },
          { card: "BT17-052", as: "agumon" },
          { card: "BT1-087", as: "otherTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("otherTamer").permanentId]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("agumon").currentDP).toBe(2000);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(5000);
  });
});
