import test from "node:test";
import assert from "node:assert/strict";
import { buildMcpServer } from "../src/mcp.js";

test("MCP server builds without a database",()=>{
  const server=buildMcpServer(null);
  assert.ok(server);
});
