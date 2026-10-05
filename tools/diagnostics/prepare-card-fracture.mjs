#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { input: { type: "string" }, check: { type: "boolean" } } });
if (!values.input) throw new Error("Provide --input with the authored BreakBlock.fbx mesh");
const buffer = await readFile(values.input);
if (buffer.readUInt32LE(23) !== 7400) throw new Error("Expected binary FBX 7400");
let cursor = 27;
function property() {
  const type = String.fromCharCode(buffer[cursor++]);
  const scalar = {
    Y: ["readInt16LE", 2],
    C: ["readUInt8", 1],
    I: ["readInt32LE", 4],
    F: ["readFloatLE", 4],
    D: ["readDoubleLE", 8],
    L: ["readBigInt64LE", 8],
  }[type];
  if (scalar) {
    const value = buffer[scalar[0]](cursor);
    cursor += scalar[1];
    return value;
  }
  if (type === "S" || type === "R") {
    const length = buffer.readUInt32LE(cursor);
    cursor += 4;
    const value = buffer.subarray(cursor, cursor + length);
    cursor += length;
    return type === "S" ? value.toString() : value;
  }
  const array = {
    f: ["readFloatLE", 4],
    d: ["readDoubleLE", 8],
    l: ["readBigInt64LE", 8],
    i: ["readInt32LE", 4],
    b: ["readUInt8", 1],
    c: ["readUInt8", 1],
  }[type];
  if (!array) throw new Error(`Unsupported FBX property ${type}`);
  const count = buffer.readUInt32LE(cursor),
    encoding = buffer.readUInt32LE(cursor + 4),
    length = buffer.readUInt32LE(cursor + 8);
  cursor += 12;
  let raw = buffer.subarray(cursor, cursor + length);
  cursor += length;
  if (encoding === 1) raw = inflateSync(raw);
  if (raw.length !== count * array[1]) throw new Error("Invalid FBX array length");
  return Array.from({ length: count }, (_, index) => raw[array[0]](index * array[1]));
}
function node() {
  const end = buffer.readUInt32LE(cursor),
    count = buffer.readUInt32LE(cursor + 4),
    length = buffer[cursor + 12];
  cursor += 13;
  if (!end) return null;
  const name = buffer.subarray(cursor, cursor + length).toString();
  cursor += length;
  const properties = Array.from({ length: count }, property);
  const children = [];
  while (cursor < end - 13) {
    const child = node();
    if (!child) break;
    children.push(child);
  }
  cursor = end;
  return { name, properties, children };
}
const roots = [];
while (cursor < buffer.length) {
  const root = node();
  if (!root) break;
  roots.push(root);
}
const geometries = roots.find((root) => root.name === "Objects").children.filter((child) => child.name === "Geometry");
const polygons = geometries.map((geometry) => {
  const coordinates = geometry.children.find((child) => child.name === "Vertices").properties[0];
  const vertices = Array.from({ length: coordinates.length / 3 }, (_, index) =>
    coordinates.slice(index * 3, index * 3 + 3),
  );
  const faces = [],
    current = [];
  for (const index of geometry.children.find((child) => child.name === "PolygonVertexIndex").properties[0]) {
    current.push(vertices[index < 0 ? -index - 1 : index]);
    if (index < 0) {
      faces.push([...current]);
      current.length = 0;
    }
  }
  const front = faces.filter((face) => face.every((vertex) => Math.abs(vertex[2]) < 1e-6));
  if (front.length !== 1) throw new Error("Expected one planar front polygon per fracture piece");
  return front[0].map(([x, y]) => [Number(((x + 1) * 50).toFixed(6)), Number(((1 - y) * 50).toFixed(6))]);
});
if (
  polygons.length !== 41 ||
  polygons.flat(2).some((value) => !Number.isFinite(value) || value < -0.001 || value > 100.001)
)
  throw new Error("Authored fracture no longer has 41 pieces inside the card plane");
const hash = createHash("sha256").update(buffer).digest("hex");
const output = new URL("../../apps/web/src/game/fieldFracture.json", import.meta.url);
const content = JSON.stringify({ source: "BreakBlock.fbx", sha256: hash, polygons }, null, 2) + "\n";
if (values.check) {
  if ((await readFile(output, "utf8")) !== content)
    throw new Error("Generated fracture differs from the authored mesh");
} else await writeFile(output, content);
console.log(`41 authored fracture polygons ${values.check ? "verified" : "extracted"}; sha256 ${hash}`);
