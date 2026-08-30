import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-080.js";

describe("BT19-080 Takato Matsuki", () => {
  it("compiles memory setting, Growlmon/Gallantmon Raid attack, and Security play", () => {
    const card = runtimeCompiledCard("BT19-080");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "StartOfYourTurn" }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [expect.objectContaining({
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
          })],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });
});
