import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-019.js";
import "./BT10-068.js";

describe("BT10-068 Gankoomon (X Antibody)", () => {
  it("plays Sistermon, gives all own Digimon +2000 DP, and protects them from bounce and DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", as: "base" }],
          hand: [
            { card: "BT10-068", as: "evolving" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "dpImmune"));
    expect(s.perm("base").currentDP).toBe(14000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
  });

  it("does not treat Gankoomon (X Antibody) as the exact Gankoomon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-068", as: "gankooX", under: ["BT10-068"] }] } });
    const printedDP = s.perm("gankooX").baseDP;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gankooX"));

    expect(s.perm("gankooX").currentDP).toBe(printedDP);
    expect(observe(s.engine).isRestricted(s.perm("gankooX"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("gankooX"), "beReturned")).toBe(false);
  });

  it("restores a previously reduced Digimon before applying the +2000 DP bonus (Q1990)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", as: "base" }],
          hand: [
            { card: "BT10-068", as: "evolving" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.modifyDP(s.perm("base").permanentId, -3000, EffectDuration.Permanent);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("base").currentDP).toBe(9000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "dpImmune"));

    expect(s.perm("base").currentDP).toBe(14000);
  });
});

describe("BT10-068 Gankoomon (X Antibody) — KB Q&A rulings", () => {
  it("is playable by [BT13-019 Gankoomon] from breeding-area sources, as are the X Antibody Omnimon, but a plain [Gankoomon] is not (Q2277)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-019", as: "playedGankoomon" }],
          breeding: {
            card: "BT13-007",
            as: "breedingTop",
            under: [
              { card: "BT13-019", as: "plainGankoomon" },
              { card: "BT5-111", as: "omnimonXAntibody" },
              { card: "BT10-086", as: "omnimonWithXAntibody" },
              { card: "BT10-068", as: "gankoomonX" },
            ],
          },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const gankoomonXId = s.inst("gankoomonX").instanceId;
    preferred.push(gankoomonXId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedGankoomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === gankoomonXId));

    const playChoice = s.decisions.find(({ req }) => req.options?.candidateInstanceIds?.includes(gankoomonXId));
    expect(playChoice).toBeDefined();
    const candidates = playChoice!.req.options!.candidateInstanceIds!;
    expect(candidates).toEqual(
      expect.arrayContaining([
        gankoomonXId,
        s.inst("omnimonXAntibody").instanceId,
        s.inst("omnimonWithXAntibody").instanceId,
      ]),
    );
    expect(candidates).not.toContain(s.inst("plainGankoomon").instanceId);
    expect(s.perm("breedingTop").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("plainGankoomon").instanceId,
      s.inst("omnimonXAntibody").instanceId,
      s.inst("omnimonWithXAntibody").instanceId,
    ]);
  });
});
