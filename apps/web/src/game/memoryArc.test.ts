import { describe, expect, it } from "vitest";
import {
  MEMORY_CELL_COUNT,
  clampMemory,
  memoryArcPath,
  memoryCellCenterPercent,
  memoryCellDistance,
  memoryCellIndex,
  memoryPredictionPath,
  predictedMemory,
  shouldDrawMemoryArc,
  shouldDrawMemoryPrediction,
} from "./memoryArc";

describe("memory gauge geometry", () => {
  it("has one chip per value from +10 to −10", () => {
    expect(MEMORY_CELL_COUNT).toBe(21);
    expect(memoryCellIndex(10)).toBe(0);
    expect(memoryCellIndex(0)).toBe(10);
    expect(memoryCellIndex(-10)).toBe(20);
  });

  it("clamps values past either end onto the last chip", () => {
    expect(clampMemory(14)).toBe(10);
    expect(clampMemory(-14)).toBe(-10);
    expect(memoryCellIndex(-99)).toBe(20);
  });

  it("puts a chip centre in the middle of its share of the track", () => {
    expect(memoryCellCenterPercent(0)).toBeCloseTo((10.5 / 21) * 100);
    expect(memoryCellCenterPercent(10)).toBeLessThan(memoryCellCenterPercent(-10));
  });

  it("measures a change in chips", () => {
    expect(memoryCellDistance(3, 1)).toBe(2);
    expect(memoryCellDistance(-2, 3)).toBe(5);
  });
});

describe("shouldDrawMemoryArc", () => {
  it("ignores a single step, which the marker pop already tells", () => {
    expect(shouldDrawMemoryArc(3, 2)).toBe(false);
    expect(shouldDrawMemoryArc(3, 3)).toBe(false);
  });

  it("traces a jump of two chips or more", () => {
    expect(shouldDrawMemoryArc(3, 1)).toBe(true);
    expect(shouldDrawMemoryArc(-1, 6)).toBe(true);
  });
});

describe("memoryArcPath", () => {
  it("starts on the old chip and lands on the new one", () => {
    const [, startX, , , , , endX] = memoryArcPath(3, -2).split(" ");
    expect(Number(startX)).toBeCloseTo(memoryCellCenterPercent(3), 2);
    expect(Number(endX)).toBeCloseTo(memoryCellCenterPercent(-2), 2);
  });

  it("rises higher the further memory moved", () => {
    // Smaller y is higher up the box.
    const control = (path: string) => Number(path.split(" ")[5]);
    expect(control(memoryArcPath(3, -6))).toBeLessThan(control(memoryArcPath(3, 1)));
  });

  it("stops rising once the arc reaches the top of the box", () => {
    expect(memoryArcPath(10, -10).split(" ")[5]).toBe(memoryArcPath(9, -10).split(" ")[5]);
  });
});

describe("memory prediction", () => {
  it("takes the cost off the current value and clamps it to the gauge", () => {
    expect(predictedMemory(4, 3)).toBe(1);
    expect(predictedMemory(-8, 6)).toBe(-10);
    expect(predictedMemory(2, 0)).toBe(2);
  });

  it("draws only when the prediction would actually move the marker", () => {
    expect(shouldDrawMemoryPrediction(3, 3)).toBe(false);
    expect(shouldDrawMemoryPrediction(3, 2)).toBe(true);
  });

  it("nests inside the arc a real change of the same size would leave", () => {
    // The two can be on screen at once — a card is picked up while the last
    // change is still fading — so they must never be read as one line.
    const prediction = memoryPredictionPath(5, 1);
    const actual = memoryArcPath(5, 1);
    const predictedApex = Number(prediction.split(" Q ")[1]!.split(" ")[1]);
    const actualApex = Number(actual.split(" Q ")[1]!.split(" ")[1]);
    expect(predictedApex).toBeGreaterThan(actualApex);
  });

  it("starts and ends on the chips it names, on the same baseline as the real arc", () => {
    const path = memoryPredictionPath(6, 2);
    expect(path.startsWith(`M ${Math.round(memoryCellCenterPercent(6) * 100) / 100} 60`)).toBe(true);
    expect(path.endsWith(` ${Math.round(memoryCellCenterPercent(2) * 100) / 100} 60`)).toBe(true);
  });
});
