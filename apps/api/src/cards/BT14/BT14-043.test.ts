import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-043.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-043", () =>
  it("may suspend one own Digimon to suspend an opposing Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent" } },
          cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon"] } } },
        },
      ],
    })));

it("suspends an opposing Digimon after paying with its own Digimon", async () => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT14-043", as: "source" }] }, 1: { battleArea: [{ card: "BT14-044", as: "target" }] } },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("target").isSuspended);
  expect(s.perm("target").isSuspended).toBe(true);
});

it("Q2415 pays its own suspend cost even with no opposing Digimon", async () => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT14-043", as: "source" }] }, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("source").isSuspended);
  expect(s.perm("source").isSuspended).toBe(true);
});
