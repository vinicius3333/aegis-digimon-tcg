import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-080.js";

describe("BT19-080 Takato Matsuki", () => {
  it("sets memory at the start of a real turn", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT19-080"], hand: ["BT1-009"] } }, { autoAcceptOptional: true });
    s.state.memory = 2;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("grants Raid and forces the digivolved Growlmon to attack through a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT19-080", as: "tamer" },
          ],
          hand: [{ card: "BT12-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("base").permanentId,
      ),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT12-010");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("compiles memory setting, Growlmon/Gallantmon Raid attack, and Security play", () => {
    const card = runtimeCompiledCard("BT19-080");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [
            expect.objectContaining({
              kind: "SetMemory",
              value: 3,
              condition: expect.objectContaining({ kind: "memoryAtMost", value: 2 }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenOneOfYoursDigivolves",
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "GainKeyword",
                  optional: true,
                  abortOnDecline: true,
                }),
                expect.objectContaining({
                  kind: "Attack",
                  target: expect.objectContaining({ sourceRef: "triggerSubject" }),
                  withoutSuspending: false,
                  mandatory: true,
                }),
              ]),
            }),
          ],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });
});
