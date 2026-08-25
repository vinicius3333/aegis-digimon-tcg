import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-056.js";

describe("EX11-056 Ryutaro Williams", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-056")).toMatchObject({
      nameEn: "Ryutaro Williams",
      colors: ["Red", "Green"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("ryutaro"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("hatches and free-digivolves the breeding stack after a level-5 Tyrannomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [
            { card: "EX11-010", as: "masterTyrannomon" },
            { card: "EX11-007", as: "agumon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("masterTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX11-007");

    expect(s.perm("ryutaro").isSuspended).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX11-007");
    assertNoLoudGap(s);
  });

  it("does not hatch or evolve when the suspend payment is declined (Q5910)", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [{ card: "EX11-010", as: "masterTyrannomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("triggerBase").permanentId,
      instanceId: s.inst("masterTyrannomon").instanceId,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.perm("ryutaro").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("encodes the Q5909 destination filter as Tyrannomon OR Dinosaur and targets breeding exactly", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const subTrigger = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      digivolveIntoFilter: {
        levelComparison: { op: "gte", value: 5 },
        nameOrTrait: [
          { tokens: ["Tyrannomon"], match: "name" },
          { tokens: ["Dinosaur"], match: "trait", orPrevious: true },
        ],
      },
      actions: [
        { kind: "Hatch", cost: { kind: "suspend" }, abortOnDecline: true },
        { kind: "Digivolve", target: { filter: { zone: "breeding" } }, payCost: false },
      ],
    });
  });
});
