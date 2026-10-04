import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { AGENTS, routeAgent } from "./agents.js";

export function buildMcpServer(pool){
  const server=new McpServer({name:"utcos-agent-core",version:"1.0.0"},{capabilities:{tools:{}}});

  server.registerTool("list_agents",{description:"List UTC.OS agents and their roles",inputSchema:z.object({})},async()=>({
    content:[{type:"text",text:JSON.stringify(Object.values(AGENTS))}]
  }));

  server.registerTool("route_agent",{description:"Choose the best UTC.OS agent for a task",inputSchema:z.object({text:z.string()})},async({text})=>({
    content:[{type:"text",text:JSON.stringify(routeAgent(text))}]
  }));

  server.registerTool("search_memory",{description:"Search the private UTC.OS Second Brain",inputSchema:z.object({query:z.string().default(""),workspace:z.string().optional(),limit:z.number().int().min(1).max(100).default(20)})},async({query,workspace,limit})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const params=[query,limit];let sql=`
      SELECT id,title,detail,bucket,workspace,source,sensitivity,confidence,updated_at,
      ts_rank(to_tsvector('english',coalesce(title,'')||' '||coalesce(detail,'')),plainto_tsquery('english',$1)) AS rank
      FROM memories WHERE status='active'
      AND ($1='' OR to_tsvector('english',coalesce(title,'')||' '||coalesce(detail,'')) @@ plainto_tsquery('english',$1))`;
    if(workspace){params.push(workspace);sql+=" AND (workspace=$3 OR workspace='All work')";}
    sql+=" ORDER BY rank DESC,updated_at DESC LIMIT $2";
    const q=await pool.query(sql,params);
    return {content:[{type:"text",text:JSON.stringify(q.rows)}]};
  });

  server.registerTool("remember_memory",{description:"Save an explicit durable memory to the UTC.OS Second Brain",inputSchema:z.object({
    title:z.string().min(1),detail:z.string().min(1),workspace:z.string().default("All work"),bucket:z.string().default("inbox"),sensitivity:z.enum(["public-safe","private","vault"]).default("private"),source:z.string().default("chatgpt-plugin")
  })},async(input)=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const q=await pool.query(`INSERT INTO memories(title,detail,bucket,workspace,source,sensitivity,confidence,created_by)
      VALUES($1,$2,$3,$4,$5,$6,1,'chatgpt-plugin') RETURNING *`,
      [input.title,input.detail,input.bucket,input.workspace,input.source,input.sensitivity]);
    const m=q.rows[0];
    await pool.query(`INSERT INTO memory_versions(memory_id,version_no,snapshot,changed_by,reason)
      VALUES($1,1,$2::jsonb,'chatgpt-plugin','created through MCP')`,[m.id,JSON.stringify(m)]);
    return {content:[{type:"text",text:JSON.stringify(m)}]};
  });

  server.registerTool("ingest_source",{description:"Put source material into the Second Brain ingestion inbox without silently promoting it to memory",inputSchema:z.object({
    sourceType:z.string(),sourceRef:z.string().optional(),payload:z.any()
  })},async({sourceType,sourceRef,payload})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const q=await pool.query(`INSERT INTO ingestion_inbox(source_type,source_ref,payload) VALUES($1,$2,$3::jsonb) RETURNING id,status,bastion_state,received_at`,
      [sourceType,sourceRef||null,JSON.stringify(payload)]);
    return {content:[{type:"text",text:JSON.stringify(q.rows[0])}]};
  });

  return server;
}

export function createAgentCoreMcpHandler(pool){
  return createMcpHandler(()=>buildMcpServer(pool),{responseMode:"json"});
}
