import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-221 engine behavior", () => {
  it("reduces an opposing Digimon by exactly 10000 DP on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-221", as: "chaosmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    const base = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("chaosmon"));
    await settle();
    expect(s.perm("target").currentDP).toBe(base - 10000);
  });
});
import "./P-221.js";

describe("P-221 Chaosmon", () => {
  it("has Security Attack +1 and the printed Partition requirement", () => {
    const card = runtimeCompiledCard("P-221")!;
    expect(card.effects.slice(0, 2).map((effect) => effect.keywords)).toEqual([
      [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      [{ keyword: "Partition", raw: "＜Partition (Yellow Lv.6 & Purple/Black Lv.6)＞" }],
    ]);
  });

  it("grants DNA-only immunity to itself until the opponent's turn ends", () => {
    expect(
      runtimeCompiledCard("P-221")!.effects.find(
        (effect) => effect.trigger === "WhenDigivolving" && effect.actions[0]?.kind === "Restrict",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "immuneToOpponentEffects",
          duration: "untilOpponentTurnEnd",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: { kind: "isDnaDigivolving" },
        },
      ],
    });
  });

  it("gives one opposing Digimon -10000 DP on digivolution and when attacking", () => {
    const card = runtimeCompiledCard("P-221")!;
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(
        card.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "ModifyDP"),
      ).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -10000,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
        ],
      });
    }
  });
});

describe("P-221 continuous behavior", () => {
  it("grants Security Attack +1 to a resident Chaosmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-221", as: "chaosmon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("chaosmon").permanentId, "SecurityAttack")).toBe(true);
  });
});
