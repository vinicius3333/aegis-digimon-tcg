import { describe, expect, it } from "vitest";
import {
  createLightParticles,
  LIGHT_EMITTERS,
  lightAlpha,
  lightCurve,
  lightPose,
  PARTICLE_LIGHT_MS,
  LIGHT_SPATIAL,
  lightViewVector,
  createLandingParticles,
  LANDING_EMITTERS,
  LANDING_LIGHT_MS,
} from "./particleLight";
import { TIMINGS, CARD_BURST_PEAK_MS } from "./timings";

describe("extracted colour light", () => {
  it("bounds continuous births to six child capacities and excludes the disabled root", () => {
    const particles = createLightParticles();
    expect(LIGHT_EMITTERS.map((s) => s.capacity)).toEqual([3, 1, 75, 1, 150, 75]);
    expect(particles).toHaveLength(305);
    expect(particles.filter((p) => lightPose(p, 0))).toHaveLength(0);
    expect(particles.filter((p) => lightPose(p, 150))).toHaveLength(305);
    expect(particles.filter((p) => lightPose(p, 502))).toHaveLength(304);
    expect(particles.some((p) => lightPose(p, 1149))).toBe(true);
    expect(particles.some((p) => lightPose(p, 1150))).toBe(false);
    expect(TIMINGS.cardBurst).toBe(PARTICLE_LIGHT_MS);
    expect(CARD_BURST_PEAK_MS).toBe(200);
  });

  it("evaluates growing/shrinking cubic size curves rather than a common opacity hump", () => {
    const halo = LIGHT_EMITTERS.find((s) => s.role === "halo")!;
    expect(lightCurve(halo.sizeOverLife!, 0)).toBeCloseTo(50 * 0.16923079);
    expect(lightCurve(halo.sizeOverLife!, 0.25)).toBeCloseTo(50 * (0.16923079 + (1 - 0.16923079) * 0.15625));
    expect(lightCurve(halo.sizeOverLife!, 1)).toBe(50);
    const sparks = LIGHT_EMITTERS.find((s) => s.role === "sparks")!;
    expect(lightCurve(sparks.sizeOverLife!, 0.25)).toBeCloseTo(0.84375);
    expect(lightAlpha(halo.alpha, 0)).toBe(0);
    expect(lightAlpha(halo.alpha, 0.49411764705882355)).toBe(1);
    expect(lightAlpha(halo.alpha, 1)).toBe(0);
    expect(lightAlpha(LIGHT_EMITTERS[0]!.alpha, 0)).toBe(1);
  });

  it("uses deterministic, finite paths with bounded signed rotation and velocity", () => {
    const first = createLightParticles(42),
      again = createLightParticles(42),
      different = createLightParticles(43);
    expect(first).toEqual(again);
    expect(first).not.toEqual(different);
    for (const particle of first.filter((p) => p.emitter.role === "sparks"))
      expect(
        Math.hypot(...particle.position.map((value, axis) => value / LIGHT_SPATIAL.spawnScale[axis]!)),
      ).toBeCloseTo(2);
    for (const particle of first) {
      expect(Math.abs(particle.rotation)).toBeLessThanOrEqual(Math.PI);
      expect(Math.abs(particle.rotationSpeed)).toBeLessThanOrEqual(Math.PI / 2);
      for (const age of [particle.bornAt, (particle.bornAt + particle.diesAt) / 2, particle.diesAt - 1]) {
        const pose = lightPose(particle, age)!;
        expect(Object.values(pose).every(Number.isFinite)).toBe(true);
        expect(pose.alpha).toBeGreaterThanOrEqual(0);
        expect(pose.alpha).toBeLessThanOrEqual(1);
        expect(pose.size).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("scales only the birth surface, retaining each particle's size, velocity and lifetime", () => {
    const scaled = createLightParticles(42),
      unscaled = createLightParticles(42, [1, 1, 1]);
    expect(LIGHT_SPATIAL.spawnScale).toEqual([4, 1, 4]);
    scaled.forEach((particle, index) => {
      const plain = unscaled[index]!;
      particle.position.forEach((value, axis) =>
        expect(value).toBeCloseTo(plain.position[axis]! * LIGHT_SPATIAL.spawnScale[axis]!),
      );
      expect(particle.velocity).toEqual(plain.velocity);
      expect(particle.size).toBe(plain.size);
      expect(particle.bornAt).toBe(plain.bornAt);
      expect(particle.diesAt).toBe(plain.diesAt);
      expect(particle.emitter.scalingMode).toBe(2);
      expect(particle.emitter.simulationSpace).toBe(0);
    });
  });

  it("aligns classic stretched particles with velocity rather than spinning their long axes", () => {
    for (const particle of createLightParticles(42).filter((p) => p.emitter.renderer.mode === 1)) {
      const pose = lightPose(particle, particle.bornAt + 200)!;
      const spun = lightPose({ ...particle, rotation: 1.3, rotationSpeed: 0.7 }, particle.bornAt + 200)!;
      const next = lightPose(particle, particle.bornAt + 200.001)!;
      expect(pose.angle).toBeCloseTo(Math.atan2(next.y - pose.y, next.x - pose.x));
      expect(spun.angle).toBe(pose.angle);
      expect(pose.stretch).toBeGreaterThan(0);
      expect(Number.isFinite(pose.stretch)).toBe(true);
    }
  });

  it("retains height and depth while projecting through the authored camera", () => {
    const up = lightViewVector([0, 1, 0]),
      back = lightViewVector([0, 0, 1]);
    expect(up[1]).toBeCloseTo(Math.cos((85 * Math.PI) / 180));
    expect(up[2]).toBeCloseTo(-Math.sin((85 * Math.PI) / 180));
    expect(back[1]).toBeCloseTo(Math.sin((85 * Math.PI) / 180));
    const original = createLightParticles()[0]!;
    const far = lightPose({ ...original, position: [10, 0, 10], velocity: [0, 0, 0] }, original.bornAt)!;
    const near = lightPose({ ...original, position: [10, 0, -10], velocity: [0, 0, 0] }, original.bornAt)!;
    expect(near.size).toBeGreaterThan(far.size);
    expect(near.x).toBeGreaterThan(far.x);
    expect(near.y).toBeGreaterThan(0);
    expect(far.y).toBeLessThan(0);
  });

  it("uses the ten-unit XZ mesh for the halo and ring rather than billboard bounds", () => {
    for (const particle of createLightParticles().filter((p) => p.emitter.renderer.mode === 4)) {
      expect(particle.emitter.renderer.meshSize).toBe(10);
      expect(particle.emitter.renderer.alignment).toBe(2);
      expect(lightPose(particle, particle.bornAt + 250)!.meshHeight).toBeCloseTo(Math.sin((85 * Math.PI) / 180));
    }
    expect(
      LIGHT_EMITTERS.filter((emitter) => emitter.renderer.mode !== 4).every(
        (emitter) => emitter.renderer.meshSize === 1,
      ),
    ).toBe(true);
  });
});

describe("extracted landing particles", () => {
  it("keeps the four landing groups separate from hatch/fracture and finishes in400 ms", () => {
    const particles = createLandingParticles();
    expect(LANDING_EMITTERS.map((s) => s.capacity)).toEqual([50, 75, 50, 15]);
    expect(LANDING_EMITTERS.every((s) => s.simulationSpeed === 2.5)).toBe(true);
    expect(particles).toHaveLength(190);
    expect(particles.filter((p) => lightPose(p, 0))).toHaveLength(0);
    expect(particles.filter((p) => lightPose(p, 200))).toHaveLength(190);
    expect(particles.filter((p) => lightPose(p, 220))).toHaveLength(68);
    expect(particles.some((p) => lightPose(p, 399))).toBe(true);
    expect(particles.some((p) => lightPose(p, 400))).toBe(false);
    expect(LANDING_LIGHT_MS).toBe(400);
    expect(PARTICLE_LIGHT_MS).toBe(1150);
  });

  it("accelerates birth, death, movement and spin together rather than only fading sooner", () => {
    for (const particle of createLandingParticles(42)) {
      const slow = {
        ...particle,
        bornAt: particle.bornAt * 2.5,
        diesAt: particle.diesAt * 2.5,
        emitter: { ...particle.emitter, simulationSpeed: 1 },
      };
      for (const afterBirth of [100, 190]) {
        const time = particle.bornAt + afterBirth;
        const fastPose = lightPose(particle, time)!,
          slowPose = lightPose(slow, time * 2.5)!;
        expect(fastPose).not.toBeNull();
        expect(slowPose).not.toBeNull();
        for (const key of Object.keys(fastPose) as (keyof typeof fastPose)[])
          expect(fastPose[key]).toBeCloseTo(slowPose[key], 10);
      }
    }
  });

  it("samples the10–20 speed range and signed spin with repeatable three-dimensional paths", () => {
    const particles = createLandingParticles(42);
    expect(particles).toEqual(createLandingParticles(42));
    expect(particles).not.toEqual(createLandingParticles(43));
    const stars = particles.filter((p) => p.emitter.role === "landing-stars");
    const speeds = stars.map((p) => Math.hypot(...p.velocity));
    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(20.00001);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(8);
    expect(stars.some((p) => p.rotationSpeed < 0)).toBe(true);
    expect(stars.some((p) => p.rotationSpeed > 0)).toBe(true);
    for (const particle of particles) {
      const pose = lightPose(particle, particle.bornAt + 100)!;
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(pose.alpha).toBeGreaterThanOrEqual(0);
      expect(pose.alpha).toBeLessThanOrEqual(1);
      const radius = Math.hypot(particle.position[0], particle.position[1] - 0.05, particle.position[2]);
      expect(radius).toBeLessThanOrEqual(particle.emitter.shape.radius + 1e-6);
    }
    for (const particle of particles.filter(
      (p) => p.emitter.role === "landing-stars" || p.emitter.role === "landing-sparks",
    ))
      expect(Math.hypot(particle.position[0], particle.position[1] - 0.05, particle.position[2])).toBeCloseTo(0.01, 6);
  });
});
