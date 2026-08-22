import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-019.js";

async function fireOnPlay(s: ReturnType<typeof setupEngine>): Promise<void> {
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gankoomon"));
}

describe("BT13-019 Gankoomon", () => {
  it("optionally plays an allowed Sistermon or breeding-area Royal Knight", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects) {
      expect(effect.keywords).toContainEqual(expect.objectContaining({ keyword: "Blocker" }));
      expect(effect.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash", "digivolutionCards"], target: { filter: { excludeNames: ["Omnimon", "Gankoomon"] } } });
    }
  });

  it("plays Sistermon Ciel from the trash without paying its cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-019", as: "gankoomon" }], trash: [{ card: "BT10-085", as: "ciel" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fireOnPlay(s);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ciel").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-085")).toBe(true);
  });

  it("does not play excluded Omnimon or Gankoomon cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-019", as: "gankoomon" }], trash: [{ card: "BT5-111", as: "omnimon" }, { card: "BT13-019", as: "otherGankoomon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fireOnPlay(s);
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT5-111", "BT13-019"]));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
