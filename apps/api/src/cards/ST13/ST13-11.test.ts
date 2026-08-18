import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST13-11.js";

describe("ST13-11 TiaLudomon", () => {
  it("places itself under a red host and grants Reboot to a chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: {
      battleArea: [{ card: "ST13-05", as: "host" }, { card: "ST13-07", as: "recipient" }],
      hand: [{ card: "ST13-11", as: "tia" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("host").permanentId, s.perm("recipient").permanentId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tia").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Reboot"));
    expect(s.perm("host").stack.some((card) => card.cardId === "ST13-11")).toBe(true);
  });
});
