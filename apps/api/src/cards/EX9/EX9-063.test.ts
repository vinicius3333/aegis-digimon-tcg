import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-063.js";
import "../index.js";

describe("EX9-063", () => {
  it("has Scapegoat and reduces Ver.4 digivolution cost by one per source", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Scapegoat"))?.keywords).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 1 }] }] });
  });
  it("once per turn plays a low-cost DM Digimon from trash by trashing the bottom face-down source", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["trash"], cost: { kind: "trash", target: { filter: { zone: "digivolutionCards", faceDown: true, position: "bottom" } } } }] }));
  it("inherits Alliance", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Alliance", raw: "＜Alliance＞" }));
  it.each([
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
    ["WhenAttacking", EffectTiming.WhenAttacking],
  ] as const)("%s trashes the bottom face-down source and plays one DM Digimon from trash", async (_label, timing) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-063", as: "source", under: [{ card: "EX9-015", faceUp: false }, "EX9-010"] }],
        trash: ["EX9-010"],
      },
      1: { battleArea: [{ card: "BT1-010", suspended: true }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    if (timing === EffectTiming.WhenAttacking) {
      s.state.turnSeat = 0;
      expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId } })).toEqual({ ok: true });
    } else {
      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
    }
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: true });
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-015")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010")).toBe(true);
  });
  it("preserves the source stack and trash when the optional Scapegoat effect is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-063", as: "source", under: [{ card: "EX9-015", faceUp: false }, "EX9-010"] }],
        trash: ["EX9-010"],
      },
    }, { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX9-010")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX9-010")).toHaveLength(0);
  });
});
