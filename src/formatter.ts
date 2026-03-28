import type { SearchResult } from "./types.js";

const DIVIDER = "=".repeat(80);

export function formatResult(result: SearchResult): string {
  const { logFilePath, totalMatches, matchLimit, matchedLines, contextBlocks } = result;
  const matchesReturned = matchedLines.length;
  const lines: string[] = [];

  lines.push(`Log file            : ${logFilePath}`);
  lines.push(`Total matches found : ${totalMatches}`);

  if (totalMatches > matchLimit) {
    lines.push(`Matches returned    : ${matchesReturned} (limit: ${matchLimit})`);
    lines.push(`\u26a0\ufe0f  Results capped at ${matchLimit}. Refine your keywords or increase match_limit to see more.`);
  } else {
    lines.push(`Matches returned    : ${matchesReturned}`);
  }

  lines.push(`Context blocks      : ${contextBlocks.length}`);

  if (contextBlocks.length === 0) {
    return lines.join("\n");
  }

  lines.push("");

  contextBlocks.forEach((block, index) => {
    lines.push(DIVIDER);
    lines.push(`Block ${index + 1} of ${contextBlocks.length}`);

    const matchedStr = block.matchedLineNumbers.join(", ");
    lines.push(`Matched lines: ${matchedStr}  |  Context: L${block.startLine}\u2013L${block.endLine}`);

    const matchedSet = new Set(block.matchedLineNumbers);

    for (let ln = block.startLine; ln <= block.endLine; ln++) {
      const text = block.lines.get(ln) ?? "";
      const lineNumStr = String(ln).padStart(6, " ");
      const marker = matchedSet.has(ln) ? "  >>> MATCH  " : "             ";
      lines.push(`${lineNumStr}${marker}${text}`);
    }
  });

  lines.push(DIVIDER);

  return lines.join("\n");
}
