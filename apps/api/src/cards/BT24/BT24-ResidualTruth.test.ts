import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as divermon } from "./BT24-028.js";
import { compiled as blimpmon } from "./BT24-058.js";
import { compiled as hisyaryumon } from "./BT24-060.js";
import "../index.js";

describe("BT24 remaining complex clauses", () => {
  it("BT24-028 places the paid TS source and installs Blocker plus battle protection", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-028", as: "divermon" }], hand: ["BT24-029"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const source = s.perm("divermon");
    await advance(s.engine).fire(EffectTiming.OnPlay, source);
    await settle(() => source.stack.some((card) => card.cardId === "BT24-029"));

    expect(source.stack.some((card) => card.cardId === "BT24-029")).toBe(true);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(source.permanentId, "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(source, "beDeletedInBattle")).toBe(true);
    expect(divermon.coverage).toBe("full");
    expect(divermon.residual).toEqual([]);
  });

  it("BT24-058 takes one eligible revealed card and leaves the rest ordered in the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-058", as: "blimpmon" }],
          deck: ["BT24-019", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("blimpmon"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-019")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(blimpmon.coverage).toBe("full");
    expect(blimpmon.residual).toEqual([]);
  });

  it("BT24-060 uses the revealed DigiPolice card as the single digivolution choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon", under: ["BT24-059"] }],
          deck: ["BT14-068", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    const source = s.perm("hisyaryumon");
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    await settle(() => source.topCard?.cardId === "BT14-068");

    expect(source.topCard?.cardId).toBe("BT14-068");
    expect(hisyaryumon.coverage).toBe("full");
    expect(hisyaryumon.residual).toEqual([]);
  });
});
