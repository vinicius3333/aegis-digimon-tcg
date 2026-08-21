import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-066.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-066", () => {
  it("returns a Greymon, Garurumon, or Omnimon from trash, or draws if none was returned", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Return", to: "hand", bindResultAs: "returnedCard", target: { filter: { zone: "trash" } } }, { kind: "Draw", amount: 1, condition: { kind: "bindingEmpty", ref: "returnedCard" } }] }));
  it("reacts to own Digimon play and digivolution by suspending this Tamer and gaining memory", () => {
    const triggers = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(triggers.filter((action) => action.kind === "SubTrigger")).toHaveLength(2);
    expect(triggers[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 0 }, { kind: "GainMemory", amount: 1 }, { kind: "GainMemory", amount: 1 }] });
  });
  it("requires the named trash cards and keeps the draw fallback bound to a failed return", () => {
    const onPlay = compiled.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      optional: true,
      bindResultAs: "returnedCard",
      target: { count: 1, filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Greymon", "Garurumon", "Omnimon"], match: "name" }] } },
    });
    expect(onPlay?.actions[1]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "bindingEmpty", ref: "returnedCard" } });
    expect(compiled.effects?.find((entry) => entry.isSecurity)).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
  it("returns a named Digimon from trash on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-066", as: "source" }], trash: ["BT1-015"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0].hand.some((card) => card.cardId === "BT1-015"));
    expect(s.state.players[0].hand.some((card) => card.cardId === "BT1-015")).toBe(true);
  });
  it("draws when no named Digimon is available in trash", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-066", as: "source" }], deck: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0].hand.some((card) => card.cardId === "BT1-001"));
    expect(s.state.players[0].hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
  it.each([
    ["whenPlayed", "whenPlayed"],
    ["whenOneOfYoursDigivolves", "whenOneOfYoursDigivolves"],
  ] as const)("gains two memory after %s by suspending itself when both named Digimon are present", async (_label, event) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-066", as: "source" }, { card: "BT1-015", as: "greymon" }, "BT1-036"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("greymon").permanentId });
    await settle(() => s.perm("source").isSuspended && s.state.memory === 2);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });
  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX9-066", as: "source" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.inst("source").faceUp = true;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-066"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-066")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "EX9-066")).toBe(false);
  });
});
