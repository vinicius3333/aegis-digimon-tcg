import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-077.js";

describe("BT23-077 Sistermon Ciel", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-077")).toMatchObject({
      cardId: "BT23-077",
      nameEn: "Sistermon Ciel",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [],
      forms: ["Champion"],
      attributes: ["Data", "Virus"],
      types: ["Puppet", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("projects Blocker through the live continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-077", as: "ciel" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ciel"), "Blocker")).toBe(true);
  });

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

  it("de-digivolves one opposing Digimon when this card suspends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-077", as: "ciel" }] },
      1: { battleArea: [{ card: "BT23-010", as: "stack", under: ["BT23-006"] }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("ciel").permanentId,
    });

    expect(s.perm("stack").topCard?.cardId).toBe("BT23-006");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT23-010")).toBe(true);
  });

  it("does not de-digivolve when another permanent suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-077", as: "ciel" },
          { card: "BT23-006", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT23-010", as: "stack", under: ["BT23-006"] }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("stack").topCard?.cardId).toBe("BT23-010");
  });

  it("anchors the watcher to this card rather than any suspended permanent", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
  });
});
