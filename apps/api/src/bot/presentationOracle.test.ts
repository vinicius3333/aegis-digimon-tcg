import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { analyzePresentationEvents } from "./presentationOracle.js";

const trigger: ServerEvent = {
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: "EX12-046",
  effectKey: "when-digivolving",
  description: "Do something",
};
const resolved: ServerEvent = {
  kind: "effectResolved",
  seat: 0,
  sourceCardId: "EX12-046",
  effectKey: "when-digivolving",
  description: "Do something",
};

describe("presentation event oracle", () => {
  it("accepts a balanced effect and security stream", () => {
    const events: ServerEvent[] = [
      { kind: "matchStarted", firstSeat: 0 },
      trigger,
      resolved,
      {
        kind: "securityRevealed",
        seat: 1,
        revealedCardId: "BT1-010",
        attackerPermanentId: "attacker",
      },
      {
        kind: "securityChecked",
        seat: 1,
        revealedCardId: "BT1-010",
        resolution: "trashed",
      },
    ];

    expect(analyzePresentationEvents(events).anomalies).toEqual([]);
  });

  it("reports an effect that would leave its presentation open", () => {
    expect(analyzePresentationEvents([trigger]).anomalies).toEqual([
      expect.objectContaining({ kind: "effect-not-resolved", eventIndex: 0 }),
    ]);
  });

  it("reports resolution arriving without its trigger", () => {
    expect(analyzePresentationEvents([resolved]).anomalies).toEqual([
      expect.objectContaining({ kind: "effect-resolved-without-trigger", eventIndex: 0 }),
    ]);
  });

  it("reports a server burst that can overload presentation", () => {
    const events: ServerEvent[] = Array.from({ length: 5 }, () => ({
      kind: "cardRevealed" as const,
      seat: 0,
      cardId: "BT1-010",
    }));

    expect(analyzePresentationEvents(events, { maximumBurst: 4 }).risks).toContainEqual(
      expect.objectContaining({ kind: "high-visual-event-density" }),
    );
  });

  it("does not let one physical copy resolve another copy's effect", () => {
    const first = { ...trigger, sourceInstanceId: "copy-a" };
    const second = { ...trigger, sourceInstanceId: "copy-b" };
    const wrongResolution = { ...resolved, sourceInstanceId: "copy-b" };

    expect(analyzePresentationEvents([first, second, wrongResolution]).anomalies).toContainEqual(
      expect.objectContaining({ kind: "effect-not-resolved", eventIndex: 0 }),
    );
  });
});
