export interface SearchParams {
  log_file_path: string;
  include_keywords: string[];
  exclude_keywords: string[];
  context_lines: number;
  match_limit: number;
}

export interface MatchedLine {
  lineNumber: number; // 1-based
  text: string;
}

export interface ContextBlock {
  startLine: number;
  endLine: number;
  lines: Map<number, string>; // lineNumber → text
  matchedLineNumbers: number[];
}

export interface SearchResult {
  logFilePath: string;
  totalMatches: number;
  matchLimit: number;
  matchedLines: MatchedLine[];
  contextBlocks: ContextBlock[];
  totalLines: number;
}
