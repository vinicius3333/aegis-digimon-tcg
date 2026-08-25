import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-061.js";

describe("BT23-061 Ghostmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-061")).toMatchObject({
      cardId: "BT23-061",
      nameEn: "Ghostmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Ghost", "LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gives exactly one own Ghost Digimon Blocker through the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT20-063", as: "ghost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostmon = s.perm("ghostmon");
    await (
      s.engine as unknown as { fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void> }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("ghostmon").permanentId });
    expect(observe(s.engine).hasKeyword(ghostmon, "Blocker")).toBe(true);
  });

  it("on deletion grants Blocker to a surviving Ghost but not a non-Ghost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT20-063", as: "ghost" },
            { card: "BT1-009", as: "nonGhost" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("nonGhost").topCard!.instanceId);
    await advance(s.engine).verb.deletePermanent([s.perm("ghostmon").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("ghost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonGhost"), "Blocker")).toBe(false);
  });

  it("gives one of your Ghost Digimon Blocker until the opponent's turn ends on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && !entry.isInherited) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "GainKeyword",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          count: 1,
        },
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("gains 1 memory from a realistic inherited On Deletion stack", async () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnDeletion" && entry.isInherited) as any;
    expect(effect).toMatchObject({ actions: [{ kind: "GainMemory", amount: 1 }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-064", under: ["BT23-061"], as: "host" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(1);
  });
});
