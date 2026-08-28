import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-025.js";
import "./P-032.js";

describe("P-032 Palmon", () => {
  it("grants Jamming only when this source is trashed by its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-025", as: "granKuwagamon", under: [{ card: "P-032", as: "palmon" }, "BT1-064"] },
            { card: "BT1-064", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("palmon").instanceId, s.perm("recipient").permanentId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("granKuwagamon").topCard.instanceId,
        effectKey: "P-025/digi-burst-security-attack",
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not grant Jamming when the same Digi-Burst trashes two other sources", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "P-025",
              as: "granKuwagamon",
              under: [
                { card: "P-032", as: "palmon" },
                { card: "BT1-064", as: "firstOtherSource" },
                { card: "BT1-064", as: "secondOtherSource" },
              ],
            },
            { card: "BT1-064", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("firstOtherSource").instanceId,
      s.inst("secondOtherSource").instanceId,
      s.perm("recipient").permanentId,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("granKuwagamon").topCard.instanceId,
        effectKey: "P-025/digi-burst-security-attack",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("firstOtherSource").instanceId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondOtherSource").instanceId),
    );

    expect(s.perm("granKuwagamon").stack.some((card) => card.instanceId === s.inst("palmon").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("granKuwagamon"), "Jamming")).toBe(false);
    assertNoLoudGap(s);
  });
});
