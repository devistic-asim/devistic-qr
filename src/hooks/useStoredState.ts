import { useEffect, useState } from 'react';

function readStored<T>(key: string, fallback: T, sanitize: (value: unknown) => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return sanitize(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function useStoredState<T>(key: string, fallback: T, sanitize: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback, sanitize));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The in-memory copy still works for this visit if storage is full.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
