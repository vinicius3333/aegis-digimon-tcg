import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-058.js";

describe("BT7-058 SkullKnightmon", () => {
  it("limits the inherited Security Attack bonus to this Knightmon or Bagramon host", () => {
    expect(runtimeCompiledCard("BT7-058")?.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "selfHasNameContaining", names: ["Knightmon", "Bagramon"] },
        },
      ],
    });
  });

  it("places a DeadlyAxemon under itself, trashes its sources, and digivolves into DarkKnightmon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-058", as: "skull" },
            { card: "BT7-059", under: [{ card: "BT1-010", as: "deadlySource" }], as: "deadly" },
          ],
          hand: [{ card: "BT7-063", as: "darkKnight" }],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deadlyId = s.perm("deadly").topCard!.instanceId;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("skull").topCard?.instanceId === s.inst("darkKnight").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("skull").stack.some((card) => card.instanceId === deadlyId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("deadlySource").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
  });

  it("grants Security Attack +1 to a Knightmon host on its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-063", under: ["BT7-058"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
