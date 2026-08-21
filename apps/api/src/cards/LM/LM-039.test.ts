import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-039.js";

const BASE = "BT8-015";
const CARD = "LM-039";
const TARGET = "BT1-009";

describe("LM-039 Valkyrimon", () => {
  it("returns an opposing Digimon at 8000 DP or less to the bottom of its deck", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BASE, as: "base" }], hand: [{ card: CARD, as: "valkyrimon" }] },
      1: { battleArea: [{ card: TARGET, dp: 8000, as: "target" }], deck: [TARGET] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetId = s.perm("target").topCard!.instanceId;
    const base = s.perm("base");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: s.inst("valkyrimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId) && !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === targetId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });

  it("grants Security Attack +1 when the return clause has no valid target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: BASE, as: "base" }], hand: [{ card: CARD, as: "valkyrimon" }] },
      1: { battleArea: [] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const base = s.perm("base");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: s.inst("valkyrimon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(base, "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(base, "SecurityAttack")).toBe(1);
  });
});
