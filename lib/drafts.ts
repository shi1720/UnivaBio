import { useCallback, useState, type SetStateAction } from "react";

// Drafts live only in this tab's memory. Never put health notes in localStorage.
const drafts = new Map<string, unknown>();
export function clearDrafts() {
  drafts.clear();
}
export function clearDraft(key: string) {
  drafts.delete(key);
}
export function useDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() =>
    drafts.has(key) ? (drafts.get(key) as T) : initial,
  );
  const update = useCallback(
    (next: SetStateAction<T>) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function"
            ? (next as (value: T) => T)(previous)
            : next;
        drafts.set(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, update] as const;
}
