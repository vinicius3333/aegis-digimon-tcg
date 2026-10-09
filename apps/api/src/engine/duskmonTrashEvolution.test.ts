import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import "../cards/BT18/BT18-076.js";
import "../cards/BT18/BT18-077.js";
import "../cards/BT18/BT18-078.js";
import "../cards/BT18/BT18-079.js";

const pairs = [
  { source: "BT18-078", destination: "BT18-079", other: "BT18-077", cost: 0 },
  { source: "BT18-076", destination: "BT18-077", other: "BT18-079", cost: 1 },
];

async function choose(s: EngineSetup, kind: "chooseTargets" | "selectCards", ids: string[]) {
  await settle(() => s.state.pendingDecision?.kind === kind);
  const req = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind, instanceIds: ids },
    }),
  ).toEqual({ ok: true });
  return req;
}

function fixture(source: string, destination: string, duplicate = false) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: source, as: "attacker" },
          { card: "BT2-067", as: "rookie" },
          { card: "BT16-082", as: "ukkomon" },
          { card: "BT1-085", as: "tai" },
        ],
        trash: [
          { card: "BT18-079", as: "velgrmon" },
          { card: "BT18-077", as: "kaiser" },
          { card: "BT16-082", as: "trashUkkomon" },
          ...(duplicate ? [{ card: destination, as: "duplicate" }] : []),
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true },
  );
  s.state.memory = 2;
  return s;
}

async function attack(s: EngineSetup) {
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const req = s.decisions.at(-1)!.req;
  expect(req.options?.candidateInstanceIds).toEqual([s.perm("attacker").permanentId, s.perm("rookie").permanentId]);
  expect(req.options).toMatchObject({ min: 0, max: 1, promptKey: "digivolveHost" });
  return req;
}

// The supplied mobile screenshot stops at chooseTargets; the trash viewer is not
// the subsequent destination selector. Preserve both stages as separate assertions.
describe("Discord 1557790296379625482 — attack evolution from trash", () => {
  it.each(pairs)("$source uses its named $destination route at memory 2", async ({ source, destination, cost }) => {
    const s = fixture(source, destination);
    const original = s.perm("attacker").topCard.instanceId;
    const selected = s.inst(destination === "BT18-079" ? "velgrmon" : "kaiser").instanceId;
    await attack(s);
    await choose(s, "chooseTargets", [s.perm("attacker").permanentId]);
    await settle(() => s.perm("attacker").topCard.instanceId === selected && s.state.pendingDecision === undefined);
    expect(s.perm("attacker").stack.map((c) => c.instanceId)).toContain(original);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(selected);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain(
      destination === "BT18-079" ? "BT18-077" : "BT18-079",
    );
    expect(s.state.memory).toBe(2 - cost);
    assertNoLoudGap(s);
  });

  it.each(pairs)(
    "$source destination picker distinguishes physical copies and excludes the wrong named route",
    async ({ source, destination, other, cost }) => {
      const s = fixture(source, destination, true);
      await attack(s);
      await choose(s, "chooseTargets", [s.perm("attacker").permanentId]);
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const req = s.decisions.at(-1)!.req;
      const first = s.inst(destination === "BT18-079" ? "velgrmon" : "kaiser").instanceId;
      const selected = s.inst("duplicate").instanceId;
      expect(req.options?.candidateInstanceIds).toEqual([first, selected]);
      const illegal = s.inst(other === "BT18-079" ? "velgrmon" : "kaiser").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [illegal] },
        }).ok,
      ).toBe(false);
      expect(s.state.pendingDecision?.decisionId).toBe(req.decisionId);
      await choose(s, "selectCards", [selected]);
      await settle(() => s.perm("attacker").topCard.instanceId === selected && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(first);
      expect(s.state.memory).toBe(2 - cost);
      assertNoLoudGap(s);
    },
  );

  it.each(pairs)(
    "$source offers both ordinary level-3 routes and charges the printed cost",
    async ({ source, destination, cost }) => {
      const s = fixture(source, destination);
      await attack(s);
      await choose(s, "chooseTargets", [s.perm("rookie").permanentId]);
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([
        s.inst("velgrmon").instanceId,
        s.inst("kaiser").instanceId,
      ]);
      const selected = s.inst(destination === "BT18-079" ? "velgrmon" : "kaiser").instanceId;
      await choose(s, "selectCards", [selected]);
      await settle(() => s.perm("rookie").topCard.instanceId === selected && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(2 - (3 + cost));
      assertNoLoudGap(s);
    },
  );

  it.each(pairs)("$source permits the printed purple Tamer route from trash", async ({ source, destination, cost }) => {
    const s = fixture(source, destination);
    const tamer = s.putOnBoard(0, { card: "BT2-090", as: "matt" });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toContain(tamer.permanentId);
    await choose(s, "chooseTargets", [tamer.permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([
      s.inst("velgrmon").instanceId,
      s.inst("kaiser").instanceId,
    ]);
    const selected = s.inst(destination === "BT18-079" ? "velgrmon" : "kaiser").instanceId;
    await choose(s, "selectCards", [selected]);
    await settle(() => tamer.topCard.instanceId === selected && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(2 - (3 + cost));
    expect(tamer.stack.map((c) => c.cardId)).toContain("BT2-090");
    assertNoLoudGap(s);
  });

  it.each(pairs)(
    "$source can decline the board-host stage without moving a trash card",
    async ({ source, destination }) => {
      const s = fixture(source, destination);
      const before = [...s.state.players[0]!.trash].map((c) => c.instanceId);
      const req = await attack(s);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("ukkomon").permanentId] },
        }).ok,
      ).toBe(false);
      await choose(s, "chooseTargets", []);
      await settle(() => s.state.pendingDecision === undefined);
      expect([...s.state.players[0]!.trash].map((c) => c.instanceId)).toEqual(before);
      expect(s.state.memory).toBe(2);
      assertNoLoudGap(s);
    },
  );
});
