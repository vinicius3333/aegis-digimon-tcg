import { $numFields, $values, ArraySchema, MapSchema, Schema } from "@colyseus/schema";

type SchemaClass = typeof Schema & { new (): Schema };
type FieldMetadata = { name: string };

/**
 * Restores two @colyseus/schema 3 behaviors that version 5 dropped and that the client, the bot
 * harness and many tests rely on. Only the classes passed in are affected.
 *
 * 1. Own, enumerable field accessors. Version 5 keeps field accessors on the prototype, so
 *    `{ ...permanent }` or `Object.keys(state)` see no fields at all. Version 3 installed them
 *    on each instance.
 * 2. Field defaults on decoded instances. Version 5 builds them with `Object.create(prototype)`,
 *    so a field the server withholds (the hidden deck, the opponent's hand, an unrevealed
 *    `cardId`) decodes as `undefined` instead of its declared default.
 */
export function installSchemaCompat(classes: readonly SchemaClass[]): void {
  const ownAccessors = new Map<Function, PropertyDescriptorMap>();
  for (const klass of classes) ownAccessors.set(klass, enumerableAccessors(klass));

  const initialize = Schema.initialize;
  Schema.initialize = function (instance: Schema) {
    initialize.call(this, instance);
    const accessors = ownAccessors.get(instance.constructor);
    if (accessors !== undefined) Object.defineProperties(instance, accessors);
  };

  for (const klass of classes) {
    const accessors = ownAccessors.get(klass)!;
    const defaults = decoderDefaults(klass);
    const initializeForDecoder = klass.initializeForDecoder;
    klass.initializeForDecoder = function (this: SchemaClass) {
      const instance = initializeForDecoder.call(this);
      Object.defineProperties(instance, accessors);
      const values = (instance as unknown as Record<symbol, unknown[]>)[$values]!;
      for (const [index, createDefault] of defaults) values[index] = createDefault();
      return instance as never;
    } as typeof klass.initializeForDecoder;
  }
}

function fieldNames(klass: SchemaClass): Map<number, string> {
  const metadata = (klass as unknown as Record<symbol, Record<PropertyKey, unknown>>)[Symbol.metadata]!;
  const lastFieldIndex = metadata[$numFields as unknown as PropertyKey] as number;
  const names = new Map<number, string>();
  for (let index = 0; index <= lastFieldIndex; index++) {
    const field = metadata[index] as FieldMetadata | undefined;
    if (field !== undefined) names.set(index, field.name);
  }
  return names;
}

function enumerableAccessors(klass: SchemaClass): PropertyDescriptorMap {
  const accessors: PropertyDescriptorMap = {};
  for (const name of fieldNames(klass).values()) {
    const descriptor = prototypeDescriptor(klass.prototype, name);
    if (descriptor !== undefined) accessors[name] = { ...descriptor, enumerable: true, configurable: true };
  }
  return accessors;
}

function prototypeDescriptor(prototype: object | null, name: string): PropertyDescriptor | undefined {
  for (let current = prototype; current !== null; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, name);
    if (descriptor !== undefined) return descriptor;
  }
  return undefined;
}

function decoderDefaults(klass: SchemaClass): Map<number, () => unknown> {
  const template = new klass() as unknown as Record<string, unknown>;
  const defaults = new Map<number, () => unknown>();
  for (const [index, name] of fieldNames(klass)) {
    const value = template[name];
    if (value === undefined) continue;
    if (value instanceof ArraySchema) defaults.set(index, () => ArraySchema.initializeForDecoder());
    else if (value instanceof MapSchema) defaults.set(index, () => MapSchema.initializeForDecoder());
    else if (value instanceof Schema) {
      const childClass = value.constructor as SchemaClass;
      defaults.set(index, () => childClass.initializeForDecoder());
    } else defaults.set(index, () => value);
  }
  return defaults;
}
