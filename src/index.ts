import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchLog } from "./log-searcher.js";
import { formatResult } from "./formatter.js";

const server = new McpServer({
  name: "log-search",
  version: "1.0.0",
});

server.registerTool(
  "search_log",
  {
    description:
      "Search a log file for lines matching include keywords, with optional exclude filtering and context lines around each match.",
    inputSchema: {
      log_file_path: z
        .string()
        .describe("Absolute path to the log file to search"),
      include_keywords: z
        .array(z.string())
        .describe("Match lines that contain ANY of these keywords (case-insensitive)"),
      exclude_keywords: z
        .array(z.string())
        .default([])
        .describe("Skip lines that contain ANY of these keywords (case-insensitive). Default: []"),
      context_lines: z
        .number()
        .int()
        .min(0)
        .default(25)
        .describe("Number of lines before and after each match to include as context. Default: 25"),
      match_limit: z
        .number()
        .int()
        .min(1)
        .default(20)
        .describe("Maximum number of matching lines to return. Default: 20"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await searchLog({
        log_file_path: params.log_file_path,
        include_keywords: params.include_keywords,
        exclude_keywords: params.exclude_keywords ?? [],
        context_lines: params.context_lines ?? 25,
        match_limit: params.match_limit ?? 20,
      });
      return {
        content: [{ type: "text", text: formatResult(result) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
