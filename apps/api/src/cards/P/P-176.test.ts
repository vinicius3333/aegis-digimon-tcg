import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-176.js";

describe("P-176 Dorimon", () => {
  it("encodes the inherited once-per-turn optional Chronicle digivolution from hand", () => {
    const effect = runtimeCompiledCard("P-176")!.effects.find((entry) => entry.trigger === "WhenAttacking")!;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          from: ["hand"],
          target: { isSelf: true, count: 1, filter: { isSelfRef: true } },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("keeps the optional inherited evolution inactive when no Chronicle card is available", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-014", as: "host", under: ["P-176"] }] } });
    await s.ready();
    expect(s.perm("host").stack).toHaveLength(1);
  });

  it("digivolves a level-three host into a Chronicle card from hand when it attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["P-176"] }],
          hand: [{ card: "BT20-012", as: "chronicle" }],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("host").topCard.cardId === "BT20-012");
    expect(s.perm("host").topCard.cardId).toBe("BT20-012");
  });
});
