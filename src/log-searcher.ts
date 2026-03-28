import * as fs from "fs";
import * as readline from "readline";
import type { SearchParams, MatchedLine, ContextBlock, SearchResult } from "./types.js";

export async function searchLog(params: SearchParams): Promise<SearchResult> {
  const { log_file_path, include_keywords, exclude_keywords, context_lines, match_limit } = params;

  // Validate file
  try {
    await fs.promises.access(log_file_path, fs.constants.R_OK);
  } catch {
    throw new Error(`File not readable or does not exist: ${log_file_path}`);
  }

  const stat = await fs.promises.stat(log_file_path);
  if (!stat.isFile()) {
    throw new Error(`Path is not a file: ${log_file_path}`);
  }

  // Stream and collect all lines + matches
  const allLines = new Map<number, string>();
  const matchedLines: MatchedLine[] = [];
  let totalMatches = 0;

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(log_file_path, { encoding: "utf8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lineNumber = 0;

    rl.on("line", (text) => {
      lineNumber++;
      allLines.set(lineNumber, text);

      const lower = text.toLowerCase();
      const included = include_keywords.some((kw) => lower.includes(kw.toLowerCase()));
      if (!included) return;

      const excluded = exclude_keywords.some((kw) => lower.includes(kw.toLowerCase()));
      if (excluded) return;

      totalMatches++;
      if (matchedLines.length < match_limit) {
        matchedLines.push({ lineNumber, text });
      }
    });

    rl.on("close", resolve);
    rl.on("error", reject);
    stream.on("error", reject);
  });

  const totalLines = allLines.size;

  // Build context blocks from matched lines
  const contextBlocks = buildContextBlocks(matchedLines, allLines, context_lines, totalLines);

  return {
    logFilePath: log_file_path,
    totalMatches,
    matchLimit: match_limit,
    matchedLines,
    contextBlocks,
    totalLines,
  };
}

function buildContextBlocks(
  matchedLines: MatchedLine[],
  allLines: Map<number, string>,
  contextSize: number,
  totalLines: number
): ContextBlock[] {
  if (matchedLines.length === 0) return [];

  // Compute ranges for each matched line
  const ranges = matchedLines.map((m) => ({
    start: Math.max(1, m.lineNumber - contextSize),
    end: Math.min(totalLines, m.lineNumber + contextSize),
    matchedLineNumber: m.lineNumber,
  }));

  // Merge overlapping/adjacent ranges
  ranges.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number; matchedLineNumbers: number[] }[] = [];

  for (const range of ranges) {
    if (merged.length === 0) {
      merged.push({ start: range.start, end: range.end, matchedLineNumbers: [range.matchedLineNumber] });
    } else {
      const last = merged[merged.length - 1];
      if (range.start <= last.end + 1) {
        // Overlapping or adjacent — merge
        last.end = Math.max(last.end, range.end);
        last.matchedLineNumbers.push(range.matchedLineNumber);
      } else {
        merged.push({ start: range.start, end: range.end, matchedLineNumbers: [range.matchedLineNumber] });
      }
    }
  }

  // Build ContextBlock objects
  return merged.map((m) => {
    const lines = new Map<number, string>();
    for (let ln = m.start; ln <= m.end; ln++) {
      const text = allLines.get(ln);
      if (text !== undefined) {
        lines.set(ln, text);
      }
    }
    return {
      startLine: m.start,
      endLine: m.end,
      lines,
      matchedLineNumbers: m.matchedLineNumbers,
    };
  });
}
