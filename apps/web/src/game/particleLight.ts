import evidence from "./particleLight.json";

interface Curve {
  mode: number;
  scalar: number;
  min: number;
  keys?: number[][];
}
export interface LightEmitter {
  role: string;
  capacity: number;
  emissionMs: number;
  simulationSpeed: number;
  scalingMode: number;
  simulationSpace: number;
  velocityWorld: number;
  rate: Curve;
  delay: Curve;
  lifetime: Curve;
  speed: Curve;
  size: Curve;
  rotation: Curve;
  rotationSpeed: Curve | null;
  sizeOverLife: Curve | null;
  alpha: number[][];
  shape: { enabled: boolean; type: number; radius: number; angle: number; thickness: number };
  velocity: Curve[] | null;
  transform: {
    m_LocalRotation: { x: number; y: number; z: number; w: number };
    m_LocalPosition: { x: number; y: number; z: number };
    m_LocalScale: { x: number; y: number; z: number };
  };
  renderer: {
    mode: number;
    length: number;
    meshSize: number;
    alignment: number;
    freeformStretching: boolean;
    rotateWithStretch: boolean;
    velocityScale: number;
    cameraVelocityScale: number;
    material: { name: string; tint: number[]; shaderFileId: number };
  };
}

export const LIGHT_EMITTERS: readonly LightEmitter[] = evidence.systems;
export const LIGHT_SPATIAL = evidence.spatial;
export const LANDING_EMITTERS: readonly LightEmitter[] = evidence.landing.systems;

/** A continuous-rate birth model. Unity's own frame-batched births remain unmeasured. */
export const PARTICLE_LIGHT_MS = Math.ceil(
  Math.max(
    ...LIGHT_EMITTERS.map(
      (s) => ((s.capacity / s.rate.scalar + s.lifetime.scalar + s.delay.scalar) * 1000) / s.simulationSpeed,
    ),
  ),
);

/** Clamp outside the keys, interpolate Unity's unweighted cubic Hermite tangents. */
export function lightCurve(curve: Curve, age: number, random = 0.5): number {
  if (curve.mode === 0) return curve.scalar;
  if (curve.mode === 3) return curve.min + (curve.scalar - curve.min) * random;
  const keys = curve.keys!;
  if (age <= keys[0]![0]!) return keys[0]![1]! * curve.scalar;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!,
      b = keys[i]!;
    if (age > b[0]!) continue;
    const span = b[0]! - a[0]!,
      t = (age - a[0]!) / span;
    return (
      ((2 * t ** 3 - 3 * t ** 2 + 1) * a[1]! +
        (t ** 3 - 2 * t ** 2 + t) * span * a[3]! +
        (-2 * t ** 3 + 3 * t ** 2) * b[1]! +
        (t ** 3 - t ** 2) * span * b[2]!) *
      curve.scalar
    );
  }
  return keys.at(-1)![1]! * curve.scalar;
}

export function lightAlpha(keys: readonly number[][], age: number): number {
  if (age <= keys[0]![0]!) return keys[0]![1]!;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!,
      b = keys[i]!;
    if (age <= b[0]!) return a[1]! + ((b[1]! - a[1]!) * (age - a[0]!)) / (b[0]! - a[0]!);
  }
  return keys.at(-1)![1]!;
}

export type LightVector = [number, number, number];
type Vector = LightVector;
export interface LightParticle {
  emitter: LightEmitter;
  bornAt: number;
  diesAt: number;
  position: Vector;
  velocity: Vector;
  rotation: number;
  rotationSpeed: number;
  size: number;
}

function rotate([x, y, z]: Vector, q: LightEmitter["transform"]["m_LocalRotation"]): Vector {
  const tx = 2 * (q.y * z - q.z * y),
    ty = 2 * (q.z * x - q.x * z),
    tz = 2 * (q.x * y - q.y * x);
  return [x + q.w * tx + q.y * tz - q.z * ty, y + q.w * ty + q.z * tx - q.x * tz, z + q.w * tz + q.x * ty - q.y * tx];
}

/** Seeded spatial sampling is repeatable for comparisons, not a replay of native random seeds. */
export function createLightParticles(
  seed = 1,
  spawnScale: readonly number[] = LIGHT_SPATIAL.spawnScale,
  emitters: readonly LightEmitter[] = LIGHT_EMITTERS,
): readonly LightParticle[] {
  let state = seed >>> 0;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return emitters.flatMap((emitter) => {
    const particles: LightParticle[] = [];
    const { shape } = emitter;
    for (let i = 0; i < emitter.capacity; i++) {
      const birthTime = ((i + 1) / emitter.rate.scalar) * 1000 + emitter.delay.scalar * 1000;
      if (birthTime > emitter.emissionMs + emitter.delay.scalar * 1000) break;
      const bornAt = birthTime / emitter.simulationSpeed;
      const angle = random() * Math.PI * 2;
      let position: Vector = [0, 0, 0],
        direction: Vector = [0, 0, 1];
      if (shape.enabled && shape.type === 4) {
        const radius = Math.sqrt(random()) * shape.radius;
        const pitch = Math.atan((radius / shape.radius) * Math.tan((shape.angle * Math.PI) / 180));
        position = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
        direction = [Math.cos(angle) * Math.sin(pitch), Math.sin(angle) * Math.sin(pitch), Math.cos(pitch)];
      } else if (shape.enabled) {
        const z = shape.type === 2 ? random() : random() * 2 - 1;
        const radial = Math.sqrt(1 - z * z);
        direction = [Math.cos(angle) * radial, Math.sin(angle) * radial, z];
        const inner = shape.radius * (1 - shape.thickness);
        const radius = Math.cbrt(inner ** 3 + random() * (shape.radius ** 3 - inner ** 3));
        position = direction.map((n) => n * radius) as Vector;
      }
      const speed = lightCurve(emitter.speed, 0, emitter.speed.mode === 3 ? random() : 0.5);
      const velocity = direction.map(
        (n, axis) => n * speed + (emitter.velocity ? lightCurve(emitter.velocity[axis]!, 0, random()) : 0),
      ) as Vector;
      const localPosition = emitter.transform.m_LocalPosition;
      const localScale = emitter.transform.m_LocalScale;
      const rotated = rotate(
        position.map((value, axis) => value * [localScale.x, localScale.y, localScale.z][axis]!) as Vector,
        emitter.transform.m_LocalRotation,
      );
      // Shape scaling widens the birth surface; it never scales particle size or speed.
      const bornPosition = rotated.map(
        (value, axis) => (value + [localPosition.x, localPosition.y, localPosition.z][axis]!) * spawnScale[axis]!,
      ) as Vector;
      particles.push({
        emitter,
        bornAt,
        diesAt: bornAt + (lightCurve(emitter.lifetime, 0) * 1000) / emitter.simulationSpeed,
        position: bornPosition,
        velocity: rotate(velocity, emitter.transform.m_LocalRotation),
        rotation: lightCurve(emitter.rotation, 0, random()),
        rotationSpeed: emitter.rotationSpeed ? lightCurve(emitter.rotationSpeed, 0, random()) : 0,
        size: lightCurve(emitter.size, 0),
      });
    }
    return particles;
  });
}

/** Landing has its own unscaled birth volumes and four short-lived groups. */
export function createLandingParticles(seed = 1): readonly LightParticle[] {
  return createLightParticles(seed, evidence.landing.spawnScale, LANDING_EMITTERS).map((particle) => ({
    ...particle,
    position: [particle.position[0], particle.position[1] + evidence.landing.height, particle.position[2]],
  }));
}

export const LANDING_LIGHT_MS = Math.ceil(
  Math.max(
    ...LANDING_EMITTERS.map(
      (s) =>
        (Math.min((s.capacity / s.rate.scalar) * 1000, s.emissionMs) + (s.lifetime.scalar + s.delay.scalar) * 1000) /
        s.simulationSpeed,
    ),
  ),
);

export interface LightPose {
  x: number;
  y: number;
  angle: number;
  size: number;
  alpha: number;
  tint: number;
  /** Classic stretched billboards shorten when their motion points at the camera. */
  stretch: number;
  meshHeight: number;
}

/** Camera-space vector using the authored camera; slot pixel calibration stays separate. */
export function lightViewVector(vector: Vector): Vector {
  const q = LIGHT_SPATIAL.cameraRotation;
  return rotate(vector, { x: -q.x, y: -q.y, z: -q.z, w: q.w });
}

/** Local perspective at the card's plane, preserving Aegis's existing anchor and pixel scale. */
export function lightPose(particle: LightParticle, elapsedMs: number): LightPose | null {
  if (elapsedMs < particle.bornAt || elapsedMs >= particle.diesAt) return null;
  const seconds = ((elapsedMs - particle.bornAt) * particle.emitter.simulationSpeed) / 1000;
  const age = (elapsedMs - particle.bornAt) / (particle.diesAt - particle.bornAt);
  const emitter = particle.emitter;
  const position = lightViewVector(
    particle.position.map((value, axis) => value + particle.velocity[axis]! * seconds) as Vector,
  );
  const velocity = lightViewVector(particle.velocity);
  const depth = LIGHT_SPATIAL.planeDistance + position[2];
  const depthScale = LIGHT_SPATIAL.planeDistance / depth;
  // Differentiate the perspective projection: depth motion also moves an
  // off-axis particle sideways. Its long axis follows that visible motion.
  const velocityX = velocity[0] - (position[0] * velocity[2]) / depth;
  const velocityY = -velocity[1] + (position[1] * velocity[2]) / depth;
  const projectedSpeed = Math.hypot(velocityX, velocityY);
  const speed = Math.hypot(...velocity);
  const stretched = emitter.renderer.mode === 1 && !emitter.renderer.freeformStretching;
  // These two emitter groups transition white into the existing Aegis edge hue.
  const tint =
    emitter.role === "core-needles"
      ? 0
      : emitter.role === "long-beams" || emitter.role === "soft-rays"
        ? Math.max(0, Math.min(1, (age - 964 / 65535) / ((31804 - 964) / 65535)))
        : 1;
  return {
    x: position[0] * depthScale,
    y: -position[1] * depthScale,
    angle: stretched ? Math.atan2(velocityY, velocityX) : particle.rotation + particle.rotationSpeed * seconds,
    size: particle.size * (emitter.sizeOverLife ? lightCurve(emitter.sizeOverLife, age) : 1) * depthScale,
    alpha: lightAlpha(emitter.alpha, age),
    tint,
    stretch: stretched && speed > 0 ? projectedSpeed / speed : 1,
    meshHeight:
      emitter.renderer.mode === 4
        ? Math.abs(lightViewVector(rotate([0, 0, 1], emitter.transform.m_LocalRotation))[1])
        : 1,
  };
}
