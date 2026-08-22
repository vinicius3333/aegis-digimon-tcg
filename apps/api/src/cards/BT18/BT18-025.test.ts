import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-025.js";

describe("BT18-025 Korikakumon", () => {
  it("restricts suspension only for an opposing Digimon without digivolution cards", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Jamming" }] },
      { trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] },
    ]);
    const s = setupEngine({ 0: { hand: [{ card: "BT18-025", as: "korikakumon" }] }, 1: { battleArea: [{ card: "BT1-030", as: "empty" }, { card: "BT1-030", as: "stacked", under: ["BT18-021"] }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("korikakumon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(emptyId, "suspend"));
    expect(observe(s.engine).isRestricted(emptyId, "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(stackedId, "suspend")).toBe(false);
  });
});
