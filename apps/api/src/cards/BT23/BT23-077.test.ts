import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-077.js";

describe("BT23-077 Sistermon Ciel", () => {
  it("deletes only an opposing Digimon with play cost 4 or less on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-077", as: "ciel" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low" },
          { card: "BT23-101", as: "high" },
        ],
      },
    });
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("ciel").permanentId });

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("anchors the watcher to this card rather than any suspended permanent", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
  });
});
