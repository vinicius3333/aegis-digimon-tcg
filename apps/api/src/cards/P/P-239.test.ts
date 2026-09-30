import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-239.js";

describe("P-239 DemiDevimon", () => {
  it("has Blocker", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
  });

  it("places itself under a Myotismon-text Digimon before optional hand digivolution", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            target: expect.objectContaining({ isSelf: true }),
            underFilter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }] }),
            position: "bottom",
            bindHostAs: "myotismonHost",
            optional: true,
            abortOnDecline: true,
          }),
          expect.objectContaining({
            kind: "Digivolve",
            target: expect.objectContaining({ filter: expect.objectContaining({ boundRef: "myotismonHost" }) }),
            from: ["hand"],
            payCost: false,
            optional: true,
          }),
        ],
      }),
    );
  });

  it("trashes a hand card to delete an opposing level 4 or lower Digimon", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "trash",
              target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
            }),
          }),
        ],
      }),
    );
  });
});
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-239 inherited engine behavior", () => {
  it("trashes a hand card and deletes an opposing level-4 Digimon on host deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST1-16", as: "cost" }],
          battleArea: [{ card: "BT15-076", as: "host", under: [{ card: "P-239", as: "demidevimon" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("P-239 continuous behavior", () => {
  it("grants Blocker to a resident DemiDevimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-239", as: "demidevimon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("demidevimon").permanentId, "Blocker")).toBe(true);
  });
});

// MaloMyotismon's own [When Digivolving] would delete one of the Digimon these tests inspect
// once its module is registered by another file sharing the module graph.
const MALOMYOTISMON_COST_PROMPT = "By deleting 1 of your Digimon or Tamers";

describe("P-239 DemiDevimon — KB Q&A rulings", () => {
  it("offers Digimon with [Myotismon] in their name or effect text as placement hosts (Q6923)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-239", as: "demidevimon" },
            { card: "BT16-072", as: "effectText" },
            { card: "BT15-080", as: "nameSubstring" },
            { card: "BT1-010", as: "unrelated" },
          ],
          hand: [{ card: "BT16-081", as: "maloMyotismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: [MALOMYOTISMON_COST_PROMPT] },
    );
    await s.ready();
    const ids = Object.fromEntries(
      ["effectText", "nameSubstring", "unrelated"].map((alias) => [alias, s.perm(alias).permanentId]),
    );
    await advance(s.engine).verb.deletePermanent([s.perm("demidevimon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    const offered = new Set(
      s.decisions
        .filter(({ req }) => req.options?.timing === "OnDeletion")
        .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []),
    );
    expect(offered.has(ids.effectText!)).toBe(true);
    expect(offered.has(ids.nameSubstring!)).toBe(true);
    expect(offered.has(ids.unrelated!)).toBe(false);
    const hosts = s.state.players[0]!.battleArea.filter((permanent) =>
      permanent.stack.some((card) => card.instanceId === s.inst("demidevimon").instanceId),
    );
    expect(hosts.map((permanent) => permanent.permanentId)).toEqual([
      expect.stringMatching(new RegExp(`^(${ids.effectText}|${ids.nameSubstring})$`)),
    ]);
  });
});

describe("P-239 DemiDevimon — On Deletion placement engine behavior", () => {
  it("digivolves the chosen host into a hand [Myotismon] for free after placing itself under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-239", as: "demidevimon" },
            { card: "BT16-072", as: "arukenimon" },
          ],
          hand: [{ card: "BT16-081", as: "maloMyotismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: [MALOMYOTISMON_COST_PROMPT] },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("demidevimon").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("arukenimon").topCard.instanceId).toBe(s.inst("maloMyotismon").instanceId);
    expect(s.perm("arukenimon").stack[0]?.instanceId).toBe(s.inst("demidevimon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
