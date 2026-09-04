import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX6-043.js";

describe("EX6-043 Diaboromon", () => {
  it("plays a Diaboromon token at start of main and when digivolving", () => {
    expect(compiled.effects?.some((entry) => entry.trigger === "Main")).toBe(false);
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: ["Diaboromon"],
        count: 1,
        payCost: false,
        optional: true,
      });
  });
  it("gives other Diaboromon Jamming and Blocker and can reactivate its digivolving effect", () => {
    const allTurns = compiled.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", inherited: false }],
    });
    expect(allTurns?.[1]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Jamming" },
      target: { count: "all" },
    });
    expect(allTurns?.[1]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
    });
  });

  it("publicly plays a Diaboromon token at the start of its controller's main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-043", as: "diaboromon" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("diaboromon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon")).toBe(true);
  });
  it("publicly reacts to an opponent Digimon play with its non-inherited token effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-043", as: "diaboromon" }] }, 1: { hand: [{ card: "BT1-009", as: "played" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Diaboromon")).toBe(true);
  });
});
