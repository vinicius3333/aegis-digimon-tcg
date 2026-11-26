import { useEffect, useState } from "react";

type Params<Loaded> = { load: (key: string) => Promise<Loaded | undefined>; key: string | undefined };

export function useLoadedRulings<Loaded>({ load, key }: Params<Loaded>): Loaded | undefined {
  const [loaded, setLoaded] = useState<{ key: string; value: Loaded }>();
  useEffect(() => {
    if (key === undefined) {
      return;
    }
    let active = true;
    void load(key).then((value) => {
      if (active && value !== undefined) {
        setLoaded({ key, value });
      }
    });
    return () => {
      active = false;
    };
  }, [load, key]);
  return loaded !== undefined && loaded.key === key ? loaded.value : undefined;
}
