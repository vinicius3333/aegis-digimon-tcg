import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-009.js";

describe("BT14-009", () => it("restricts both players from playing Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "RestrictPlay", seat: "any", mode: "play", filter: { kind: ["Digimon"] }, duration: "permanent" }] })));

it("blocks effect-play of a Digimon while leaving ordinary play intents distinguishable", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT14-009", as: "gotsumon" }], hand: [{ card: "BT14-007", as: "candidate" }] },
  });
  s.state.turnSeat = 0;
  s.state.memory = 10;
  await s.engine.recomputeContinuousEffects();

  const result = s.engine.applyIntent(0, {
    type: "play",
    instanceId: s.inst("candidate").instanceId,
  });
  expect(result.ok).toBe(false);
});
