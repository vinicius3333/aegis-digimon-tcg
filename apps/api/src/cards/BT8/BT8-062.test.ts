import { getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-062.js";

describe("BT8-062 SkullKnightmon Cavalier Mode", () => {
  it("gains Jamming and Blocker through the opponent's next turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-058", as: "base" }], hand: [{ card: "BT8-062", as: "evolving" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-062"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
  });

  it("is treated as both SkullKnightmon and DeadlyAxemon by rule", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-062", as: "cavalier" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("cavalier"))).toEqual(expect.arrayContaining([
      "SkullKnightmon Cavalier Mode",
      "skullknightmon",
      "deadlyaxemon",
    ]));
    expect(getCompiledCard("BT8-062")?.effects.find(effect => effect.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["SkullKnightmon", "DeadlyAxemon"] }],
    });
  });
});
