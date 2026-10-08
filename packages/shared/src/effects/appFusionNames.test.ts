import { describe, expect, it } from "vitest";
import { appFusionCostFor } from "./data.js";

describe("App Fusion current exact names", () => {
  it("matches the current name set with the distinct linked material in either order", () => {
    expect(appFusionCostFor("EX10-073", { topNames: ["sukamon", "warudamon"], linkedNames: ["Cometmon"] })).toBe(0);
    expect(appFusionCostFor("EX10-073", { topNames: ["cometmon"], linkedNames: ["Warudamon"] })).toBe(0);
  });

  it("does not treat a replaced or partial name as the printed required name", () => {
    for (const name of ["sukamon", "warudamon x antibody", "waruda", ""]) {
      expect(appFusionCostFor("EX10-073", { topNames: [name], linkedNames: ["Cometmon"] })).toBeUndefined();
    }
  });

  it("requires a different name on a physical link even when the host has both names", () => {
    expect(appFusionCostFor("EX10-073", { topNames: ["warudamon", "cometmon"], linkedNames: [] })).toBeUndefined();
    expect(appFusionCostFor("EX10-073", { topNames: ["warudamon"], linkedNames: ["WARUDAMON"] })).toBeUndefined();
  });

  it("assigns two exact identities to two physical materials even when host aliases overlap", () => {
    for (const topNames of [
      ["warudamon", "cOmEtMoN"],
      ["COMETMON", "WARUDAMON"],
    ]) {
      expect(appFusionCostFor("EX10-073", { topNames, linkedNames: ["WaRuDaMoN"] })).toBe(0);
      expect(appFusionCostFor("EX10-073", { topNames, linkedNames: ["Mienumon"] })).toBeUndefined();
      expect(appFusionCostFor("EX10-073", { topNames, linkedNames: [] })).toBeUndefined();
    }
  });

  it("keeps the existing single-name caller contract", () => {
    expect(appFusionCostFor("EX10-073", { topName: "Warudamon", linkedNames: ["Cometmon"] })).toBe(0);
  });
});
