import { createContext, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";

export type RegisterParticleLight = (dispose: () => void) => () => void;
export const ParticleLightScopeContext = createContext<RegisterParticleLight | undefined>(undefined);

/** A scene can finish; its enclosing match view still owns all remaining lights. */
export function ParticleLightScope({ children }: { children: ReactNode }) {
  const lights = useRef(new Set<() => void>());
  const register = useMemo<RegisterParticleLight>(
    () => (dispose) => {
      lights.current.add(dispose);
      return () => lights.current.delete(dispose);
    },
    [],
  );
  useLayoutEffect(
    () => () => {
      for (const dispose of lights.current) dispose();
      lights.current.clear();
    },
    [],
  );
  return <ParticleLightScopeContext.Provider value={register}>{children}</ParticleLightScopeContext.Provider>;
}
