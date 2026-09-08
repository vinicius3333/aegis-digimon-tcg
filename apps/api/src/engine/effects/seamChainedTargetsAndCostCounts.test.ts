// Focused engine tests for three targeting/cost seams, driven through public intents.
//
//  1. A `sameTarget` continuation keeps the printed candidate pool of the action it chains to,
//     so "unsuspend 1 of your Digimon; it gains <Blocker>" may pick a ready Digimon (KB Q963).
//  2. A trash-zone `return` cost that pays with "1 of each distinct level" publishes the paid
//     count under `trackCount`, so a dependent `namedCount` scaling reads it (BT18-019).
//  3. A loose target that is `isSelfRef` plus `orFilters` offers the alternatives beside the
//     self card instead of collapsing to the self card (BT25-101, EX11-027).

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

function chooseTargetCandidates(decisions: ReturnType<typeof setupEngine>["decisions"]): string[][] {
  return decisions
    .filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards")
    .map(({ req }) => (req.options?.candidateInstanceIds ?? []) as string[]);
}

describe("sameTarget continuations widen the chained action's candidate pool", () => {
  it("offers a ready Digimon to BT1-095's unsuspend because the next action grants it Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "suspended", suspended: true },
            { card: "BT1-011", as: "ready" },
          ],
          hand: [{ card: "BT1-095", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));

    const offered = chooseTargetCandidates(s.decisions).flat();
    expect(offered).toContain(s.perm("ready").permanentId);
    expect(offered).toContain(s.perm("suspended").permanentId);
  });
});

describe("distinct-payment return costs publish their paid count", () => {
  it("gains exactly 1 memory per distinct opposing level BT18-019 actually returned", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "kimeramon" },
            { card: "BT11-072", as: "machinedramon" },
          ],
          hand: [{ card: "BT18-019", as: "millennium" }],
        },
        1: {
          trash: [
            { card: "BT1-030", as: "level3" },
            { card: "BT1-032", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("kimeramon").permanentId, s.perm("machinedramon").permanentId],
        instanceId: s.inst("millennium").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});

describe("self-referential loose targets still offer their orFilters alternatives", () => {
  it("offers the Maquinamon card in hand beside EX11-027 itself as the card to link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "ally", dp: 3000 }],
          hand: [
            { card: "EX11-027", as: "maquinamon" },
            { card: "EX11-027", as: "spareMaquinamon" },
          ],
          deck: ["EX11-073", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").linked.length === 1, 600);

    expect(chooseTargetCandidates(s.decisions).flat()).toContain(s.inst("spareMaquinamon").instanceId);
  });
});
