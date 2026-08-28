import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-025.js";
import "./index.js";

describe("BT20-025 Wingdramon", () => {
  it("deletes up to 6000 DP and is treated as Slayerdramon only while in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        { kind: "GrantStatic", target: { isSelf: true }, grant: "name", tokens: ["Slayerdramon"] },
        {
          kind: "GrantStatic",
          grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("deletes exactly one opposing Digimon at the inclusive 6000-DP boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 6000, as: "boundary" },
            { card: "BT20-014", dp: 7000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wingdramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("tooLarge")).toBeDefined();
  });

  it("is Slayerdramon only on the field and grants inherited Security Attack +1", async () => {
    const field = setupEngine({ 0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }] } });
    await field.ready();
    expect(observe(field.engine).grantedNames(field.perm("wingdramon"))).toContain("slayerdramon");

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT20-027", as: "host", under: ["BT20-025"] }] },
    });
    await inherited.ready();
    expect(observe(inherited.engine).keywordAmount(inherited.perm("host"), "SecurityAttack")).toBe(1);
  });
});
