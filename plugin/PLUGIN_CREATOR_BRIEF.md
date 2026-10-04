# Plugin Creator brief: UTC.OS Agents

Create one personal plugin named **UTC.OS Agents**.

Use `plugin/UTC_OS_AGENTS_SKILL.md` as the main skill/instructions.

The plugin represents five distinct routable roles:
- Margaret
- Kara
- Jarvis
- Sauce Sensei
- Bastion

The roles must share one memory source and must not fork separate copies of the user's durable memory.

## App connection

Attach the deployed UTC.OS Agent Core MCP app when available.

Remote MCP endpoint:

`https://<AGENT-CORE-HOST>/mcp`

Expected tools:
- list_agents
- route_agent
- search_memory
- remember_memory
- update_memory
- archive_memory
- ingest_source
- list_ingestion
- review_ingestion
- list_vault_metadata
- store_vault_item

Do not expose Safety Vault plaintext as a generic plugin tool.

## Authentication

Do not hardcode the Agent Core bearer key into a plugin, skill, reference file, Site, or repository.

For a ChatGPT-distributed MCP app, replace the development bearer-key path with a ChatGPT-supported authentication mechanism before enabling private memory access. The existing bearer key remains appropriate for Echo Trace and the user's own Mothership clients.

## Invocation behavior

The user should be able to invoke the plugin with `@UTC.OS Agents` and then address a role naturally, for example:
- "Margaret, make the call on this."
- "Kara, brief my day."
- "Jarvis, diagnose this."
- "Sauce Sensei, review the visual direction."
- "Bastion, verify whether this is actually connected."

If no role is named, route intelligently.

## Required truth behavior

Never manufacture connection or execution states. If the MCP app is unavailable, the plugin may still use its role skill, but it must state that shared Second Brain tools are unavailable for that request rather than pretending memory was read or written.
