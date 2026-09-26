import { describe, expect, it } from "vitest";
import { createErrorAlerts, type ErrorAlert } from "./errorAlerts.js";

function setup(options: { cooldownMs?: number; hourlyLimit?: number } = {}) {
  const sent: ErrorAlert[] = [];
  let time = 0;
  const alerts = createErrorAlerts({
    deliver: async (alert) => void sent.push(alert),
    now: () => time,
    ...options,
  });
  return { alerts, sent, advance: (ms: number) => (time += ms) };
}

describe("createErrorAlerts", () => {
  it("emails the first occurrence of an error with its log line", async () => {
    const { alerts, sent } = setup();
    alerts.report(["[engine] playCard apply failed:", new Error("boom")], '{"level":"ERROR"}');
    await alerts.flush();
    expect(sent).toEqual([{ subject: "[Aegis] [engine] playCard apply failed:", body: '{"level":"ERROR"}' }]);
  });

  it("sends one email per error group during the cooldown and counts the repeats", async () => {
    const { alerts, sent, advance } = setup({ cooldownMs: 1000 });
    alerts.report(["A"], "first");
    alerts.report(["A"], "second");
    alerts.report(["A"], "third");
    alerts.report(["B"], "other");
    advance(1000);
    alerts.report(["A"], "fourth");
    await alerts.flush();
    expect(sent.map((alert) => alert.body)).toEqual([
      "first",
      "other",
      "fourth\n\nRepeated 2 more time(s) since the last email.",
    ]);
  });

  it("stops at the hourly limit across all groups", async () => {
    const { alerts, sent, advance } = setup({ hourlyLimit: 2 });
    alerts.report(["A"], "a");
    alerts.report(["B"], "b");
    alerts.report(["C"], "c");
    advance(60 * 60 * 1000);
    alerts.report(["D"], "d");
    await alerts.flush();
    expect(sent.map((alert) => alert.body)).toEqual(["a", "b", "d"]);
  });

  it("keeps running when delivery fails", async () => {
    const alerts = createErrorAlerts({ deliver: () => Promise.reject(new Error("offline")) });
    alerts.report(["A"], "a");
    await expect(alerts.flush()).resolves.toBeUndefined();
  });
});
