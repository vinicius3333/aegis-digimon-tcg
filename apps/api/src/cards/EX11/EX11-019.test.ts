import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-019.js";
import "../index.js";

describe("EX11-019 Shoemon", () => {
  it("plays its Familiar Token when its deletion effect resolves", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-019", as: "shoemon" }] } }, { autoAcceptOptional: true });
    await advance(s.engine).verb.deletePermanent([s.perm("shoemon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar")));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("Familiar"))).toBe(true);
  });
});
