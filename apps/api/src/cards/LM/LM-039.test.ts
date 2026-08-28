import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-039.js";

const BASE = "BT8-015";
const CARD = "LM-039";
const TARGET = "BT1-009";

describe("LM-039 Valkyrimon", () => {
  it("returns an opposing Digimon at 8000 DP or less to the bottom of its deck", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: BASE, as: "base" }], hand: [{ card: CARD, as: "valkyrimon" }] },
        1: { battleArea: [{ card: TARGET, dp: 8000, as: "target" }], deck: [TARGET] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    const base = s.perm("base");
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("valkyrimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some((card) => card.instanceId === targetId) &&
        !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId),
    );

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });

  it("grants Security Attack +1 when the return clause has no valid target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: BASE, as: "base" }], hand: [{ card: CARD, as: "valkyrimon" }] },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const base = s.perm("base");
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("valkyrimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(base, "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(base, "SecurityAttack")).toBe(1);
  });

  it("leaves an opposing Digimon above 8000 DP alone and grants Security Attack +1 instead", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD, as: "valkyrimon" }] },
        1: { battleArea: [{ card: TARGET, dp: 9000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("valkyrimon"));
    await settle(() => observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack") === 1, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(observe(s.engine).keywordAmount(s.perm("valkyrimon"), "SecurityAttack")).toBe(1);
  });

  it("shares one once-per-turn budget between the digivolving and attacking windows", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD, as: "valkyrimon" }] },
        1: {
          battleArea: [
            { card: TARGET, dp: 3000, as: "first" },
            { card: TARGET, dp: 3000, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("valkyrimon"));
    await settle(() => s.state.players[1]!.battleArea.length === 1, 2000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("valkyrimon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("stops its own attack target from being changed on its controller's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD, as: "valkyrimon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).recompute();

    expect(observe(s.engine).isRestricted(s.perm("valkyrimon"), "attackTargetChange")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition(CARD);
    const compiled = runtimeCompiledCard(CARD);
    expect(definition?.nameEn).toBe("Valkyrimon");
    expect(definition?.colors).toEqual(["Red", "Blue"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]).toMatchObject({ keywords: [{ keyword: "Blitz" }] });
  });
});
