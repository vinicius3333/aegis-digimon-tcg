import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-006.js";

describe("EX11-006 Flickmon", () => {
  it("requires a linked Maquinamon before its inherited attack digivolution", () => {
    const effect = runtimeCompiledCard("EX11-006")!.effects[0]!;
    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      condition: {
        kind: "hostHasLinkedWith",
        filter: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] },
      },
    });
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
      payCost: true,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
    });
  });

  it("digivolves a linked legal stack into a card with Maquinamon in its text for cost 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              under: ["EX11-006"],
              linked: [{ card: "EX11-027", as: "maquinamonLink" }],
            },
          ],
          hand: [{ card: "EX11-029", as: "turbomon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("turbomon").instanceId);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId), 5000);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX11-006"]);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("maquinamonLink").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not trigger without a linked Maquinamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"] }],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not treat a linked card that merely mentions Maquinamon as the named link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              under: ["EX11-006"],
              linked: [{ card: "EX11-029", as: "textOnlyLink" }],
            },
          ],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    assertNoLoudGap(s);
  });

  it("rejects a legal-level hand card without Maquinamon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"], linked: [{ card: "EX11-027" }] }],
          hand: [{ card: "EX11-030", as: "wrongText" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongText").instanceId);
    assertNoLoudGap(s);
  });

  it("may decline the linked attack digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "host", under: ["EX11-006"], linked: [{ card: "EX11-027" }] }],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 0 }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX11-027");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("does not offer the inherited evolution after Flickmon's once-per-turn use is spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-027",
              as: "host",
              under: ["EX11-006"],
              linked: [{ card: "EX11-027" }],
            },
          ],
          hand: [{ card: "EX11-029", as: "turbomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const flickmon = s.perm("host").stack.find((card) => card.cardId === "EX11-006")!;
    const effect = getEffectModule("EX11-006")!.effectsForTiming(
      EffectTiming.OnUseAttack,
      observe(s.engine).cardSource(flickmon),
    )[0]!;

    // The preceding positive case proves the public attack path. Arm the engine-owned usage
    // ledger through the test seam to isolate the second-offer gate without declaring an
    // otherwise illegal second attack with the same suspended Digimon.
    advance(s.engine).ledgers.tracker.register(flickmon.instanceId, effect.effectKey);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("host").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("turbomon").instanceId);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });
});
