import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-05 Sakuyamon", () => {
  it("plays a Pipe Fox Token from its On Play effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-05", as: "sakuyamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sakuyamon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId.includes("TOKEN"))).toBe(true);
  });
});
