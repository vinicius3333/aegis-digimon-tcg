import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-058.js";
import "./BT7-059.js";
import "./BT7-063.js";
import "../BT9/BT9-109.js";

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

describe("BT7-058 SkullKnightmon — KB Q&A rulings", () => {
  async function attackWithSkullKnightmon(deadlyAxemonSources: CardSpec[]): Promise<EngineSetup> {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-058", as: "skull" },
            { card: "BT7-059", under: deadlyAxemonSources, as: "deadly" },
          ],
          hand: [{ card: "BT7-063", as: "darkKnight" }],
          deck: ["BT1-011"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return s;
  }

  it("can place a DeadlyAxemon with no digivolution cards under itself to digivolve (Q1605)", async () => {
    const s = await attackWithSkullKnightmon([]);
    const deadlyId = s.perm("deadly").topCard!.instanceId;

    await settle(() => s.perm("skull").topCard?.instanceId === s.inst("darkKnight").instanceId);

    expect(s.perm("skull").stack[0]?.instanceId).toBe(deadlyId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === deadlyId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("can place a DeadlyAxemon holding an X Antibody, which the rules then trash (Q1606)", async () => {
    const s = await attackWithSkullKnightmon([
      { card: "BT1-010", as: "ordinarySource" },
      { card: "BT9-109", as: "antibody" },
    ]);
    const deadlyId = s.perm("deadly").topCard!.instanceId;
    const trash = (): string[] => s.state.players[0]!.trash.map((card) => card.instanceId);

    await settle(() => s.perm("skull").topCard?.instanceId === s.inst("darkKnight").instanceId);

    expect(s.perm("skull").stack[0]?.instanceId).toBe(deadlyId);
    expect(trash()).toEqual(
      expect.arrayContaining([s.inst("antibody").instanceId, s.inst("ordinarySource").instanceId]),
    );
    expect(s.perm("skull").stack.some((card) => card.instanceId === s.inst("antibody").instanceId)).toBe(false);
  });
});
