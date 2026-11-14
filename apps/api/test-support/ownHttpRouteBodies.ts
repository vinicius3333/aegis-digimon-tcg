import { METHODS } from "node:http";
import type { Express } from "express";

export function ownHttpRouteBodies(application: Express) {
  const pending = new Set<Promise<unknown>>();
  const failures: unknown[] = [];
  const registrations = new Set([...METHODS.map((method) => method.toLowerCase()), "all", "use"]);
  let retired = false;
  function wrap(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(wrap);
    if (typeof value !== "function") return value;
    return new Proxy(value, {
      apply(handler, receiver, args) {
        if (retired) {
          const response = args[handler.length === 4 ? 2 : 1];
          response.sendStatus(503);
          return;
        }
        const result: unknown = Reflect.apply(handler, receiver, args);
        if (result && (typeof result === "object" || typeof result === "function") && "then" in result) {
          const body = Promise.resolve(result);
          pending.add(body);
          void body.then(
            () => pending.delete(body),
            (error: unknown) => {
              failures.push(error);
              pending.delete(body);
            },
          );
        }
        return result;
      },
    });
  }
  const app = new Proxy(application, {
    get(target, property, receiver) {
      const method: unknown = Reflect.get(target, property, receiver);
      if (typeof property !== "string" || !registrations.has(property) || typeof method !== "function") return method;
      return new Proxy(method, {
        apply(register, _receiver, args) {
          if (property === "get" && args.length === 1) return Reflect.apply(register, target, args);
          const result: unknown = Reflect.apply(register, target, args.map(wrap));
          return result === target ? app : result;
        },
      });
    },
  });
  return {
    app,
    failures,
    retire() {
      retired = true;
    },
    async drain() {
      while (pending.size) await Promise.allSettled([...pending]);
    },
  };
}
