import { diffWords } from "diff";

export function diffText(a: string, b: string) {
  return diffWords(a, b);
}
