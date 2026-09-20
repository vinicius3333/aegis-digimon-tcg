import { describe, expect, it } from "vitest";
import {
  HANDOFF_BASELINE_ENV,
  createDeterministicBaselineFixture,
  handoffBaselineEnabled,
  measureStoppedMainBoundary,
} from "./baseline.js";

describe("room handoff baseline measurement", () => {
  it("requires a test runtime and both explicit opt-in flags", () => {
    expect(
      handoffBaselineEnabled({
        NODE_ENV: "production",
        AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
        [HANDOFF_BASELINE_ENV]: "1",
      }),
    ).toBe(false);
    expect(
      handoffBaselineEnabled({
        NODE_ENV: "development",
        AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
        [HANDOFF_BASELINE_ENV]: "1",
      }),
    ).toBe(false);
    expect(
      handoffBaselineEnabled({
        NODE_ENV: "test",
        AEGIS_ROOM_HANDOFF_EXPERIMENT: "1",
        [HANDOFF_BASELINE_ENV]: "1",
      }),
    ).toBe(true);
  });

  it.skipIf(!handoffBaselineEnabled())(
    "round-trips a deterministic two-seat fixture and reports only aggregate measurements",
    () => {
      const fixture = createDeterministicBaselineFixture();
      expect(fixture.cardCount).toBe(180);
      const report = measureStoppedMainBoundary({ repetitions: 25 });

      expect(report).toMatchObject({
        fixture: "two-seat-main-boundary-v1",
        repetitions: 25,
        seats: 2,
      });
      expect(report.serializedPayloadBytes).toBeGreaterThan(1_000);
      expect(report.serializedEnvelopeBytes).toBeGreaterThan(report.serializedPayloadBytes);
      expect(report.exportMedianMs).toBeGreaterThanOrEqual(0);
      expect(report.importMedianMs).toBeGreaterThanOrEqual(0);
      expect(report.cpuUserMs).toBeGreaterThanOrEqual(0);
      expect(report.cpuSystemMs).toBeGreaterThanOrEqual(0);
      expect(report.heapBeforeCodecBytes).toEqual(expect.any(Number));
      expect(report.heapAfterExportBytes).toEqual(expect.any(Number));
      expect(report.heapAfterImportBytes).toEqual(expect.any(Number));
      expect(report.rssBeforeCodecBytes).toEqual(expect.any(Number));
      expect(report.rssAfterExportBytes).toEqual(expect.any(Number));
      expect(report.rssAfterImportBytes).toEqual(expect.any(Number));
      expect(report.roundTripVerified).toBe(true);
      expect(Object.keys(report).sort()).toEqual(
        [
          "cardCount",
          "cpuSystemMs",
          "cpuUserMs",
          "exportMedianMs",
          "exportP95Ms",
          "fixture",
          "heapAfterExportBytes",
          "heapAfterImportBytes",
          "heapBeforeCodecBytes",
          "importMedianMs",
          "importP95Ms",
          "repetitions",
          "roundTripVerified",
          "rssAfterExportBytes",
          "rssAfterImportBytes",
          "rssBeforeCodecBytes",
          "seats",
          "serializedEnvelopeBytes",
          "serializedPayloadBytes",
        ].sort(),
      );
      process.stdout.write(`[room-handoff-baseline] ${JSON.stringify(report)}\n`);
    },
  );

  it("refuses to measure when the experiment is not explicitly enabled", () => {
    expect(() =>
      measureStoppedMainBoundary({
        repetitions: 1,
        env: { NODE_ENV: "test", AEGIS_ROOM_HANDOFF_EXPERIMENT: "1" },
      }),
    ).toThrow(/disabled/);
  });
});
