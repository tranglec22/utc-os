import test from "node:test";
import assert from "node:assert/strict";
import { routeAgent } from "../src/agents.js";

test("speaking a core agent name selects that distinct identity", () => {
  for (const [message, id] of [
    ["Margaret, prioritize this technical project", "margaret"],
    ["Kara, plan security reviews", "kara"],
    ["Jarvis, troubleshoot the design", "jarvis"],
    ["Sauce Sensei, make the music artwork", "sauce"],
    ["Bastion, review it before publishing", "bastion"]
  ]) assert.equal(routeAgent(message).id, id);
});

test("topic routing and Chief of Staff fallback remain intact", () => {
  assert.equal(routeAgent("This needs music design").id, "sauce");
  assert.equal(routeAgent("Fix the automation system").id, "jarvis");
  assert.equal(routeAgent("Review security permissions").id, "bastion");
  assert.equal(routeAgent("Hello mothership").id, "kara");
});
