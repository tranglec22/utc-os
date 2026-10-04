import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { AGENTS, routeAgent } from "./agents.js";
import { reviewIngestion } from "./bastion.js";
import { assertNormalMemorySensitivity } from "./memory-policy.js";
import { vaultConfigured, storeVaultEntry } from "./vault.js";

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
    title:z.string().min(1),detail:z.string().min(1),workspace:z.string().default("All work"),bucket:z.string().default("inbox"),sensitivity:z.enum(["public-safe","private"]).default("private"),source:z.string().default("chatgpt-plugin")
  })},async(input)=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    assertNormalMemorySensitivity(input.sensitivity);
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


  server.registerTool("update_memory",{description:"Update an existing non-vault memory while preserving version history",inputSchema:z.object({
    id:z.string().uuid(),title:z.string().min(1).optional(),detail:z.string().min(1).optional(),workspace:z.string().optional(),bucket:z.string().optional(),
    sensitivity:z.enum(["public-safe","private"]).optional(),confidence:z.number().min(0).max(1).optional(),reason:z.string().default("updated through MCP")
  })},async(input)=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const current=await pool.query("SELECT * FROM memories WHERE id=$1",[input.id]);
    if(!current.rowCount)return {content:[{type:"text",text:"Memory not found."}],isError:true};
    if(input.sensitivity)assertNormalMemorySensitivity(input.sensitivity);
    const next={...current.rows[0]};
    for(const key of ["title","detail","workspace","bucket","sensitivity","confidence"])if(input[key]!==undefined)next[key]=input[key];
    const updated=await pool.query(`UPDATE memories SET title=$2,detail=$3,workspace=$4,bucket=$5,sensitivity=$6,confidence=$7,updated_at=now() WHERE id=$1 RETURNING *`,
      [input.id,next.title,next.detail,next.workspace,next.bucket,next.sensitivity,next.confidence]);
    const vn=await pool.query("SELECT COALESCE(MAX(version_no),0)+1 AS n FROM memory_versions WHERE memory_id=$1",[input.id]);
    await pool.query(`INSERT INTO memory_versions(memory_id,version_no,snapshot,changed_by,reason) VALUES($1,$2,$3::jsonb,'mcp-agent',$4)`,
      [input.id,vn.rows[0].n,JSON.stringify(updated.rows[0]),input.reason]);
    return {content:[{type:"text",text:JSON.stringify(updated.rows[0])}]};
  });

  server.registerTool("archive_memory",{description:"Archive a memory without deleting its version history",inputSchema:z.object({
    id:z.string().uuid(),reason:z.string().default("archived through MCP")
  })},async({id,reason})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const q=await pool.query("UPDATE memories SET status='archived',updated_at=now() WHERE id=$1 RETURNING *",[id]);
    if(!q.rowCount)return {content:[{type:"text",text:"Memory not found."}],isError:true};
    const vn=await pool.query("SELECT COALESCE(MAX(version_no),0)+1 AS n FROM memory_versions WHERE memory_id=$1",[id]);
    await pool.query(`INSERT INTO memory_versions(memory_id,version_no,snapshot,changed_by,reason) VALUES($1,$2,$3::jsonb,'mcp-agent',$4)`,
      [id,vn.rows[0].n,JSON.stringify(q.rows[0]),reason]);
    return {content:[{type:"text",text:JSON.stringify(q.rows[0])}]};
  });

  server.registerTool("list_ingestion",{description:"List Second Brain intake waiting for Bastion review",inputSchema:z.object({
    state:z.enum(["unreviewed","approved","flagged","rejected"]).optional(),limit:z.number().int().min(1).max(100).default(25)
  })},async({state,limit})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const params=[limit];let sql="SELECT id,source_type,source_ref,received_at,status,bastion_state,notes FROM ingestion_inbox";
    if(state){params.push(state);sql+=" WHERE bastion_state=$2";}
    sql+=" ORDER BY received_at DESC LIMIT $1";
    const q=await pool.query(sql,params);
    return {content:[{type:"text",text:JSON.stringify(q.rows)}]};
  });

  server.registerTool("review_ingestion",{description:"Apply Bastion review to an ingestion item. Approval only promotes a structured explicit memory candidate; secret-like material stays blocked.",inputSchema:z.object({
    id:z.string().uuid(),decision:z.enum(["approved","flagged","rejected"]),reason:z.string().optional()
  })},async({id,decision,reason})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const found=await client.query("SELECT * FROM ingestion_inbox WHERE id=$1 FOR UPDATE",[id]);
      if(!found.rowCount){await client.query("ROLLBACK");return {content:[{type:"text",text:"Ingestion item not found."}],isError:true};}
      const item=found.rows[0];
      if(decision!=="approved"){
        await client.query(`UPDATE ingestion_inbox SET bastion_state=$2,status=CASE WHEN $2='rejected' THEN 'rejected' ELSE status END,processed_at=CASE WHEN $2='rejected' THEN now() ELSE processed_at END,notes=$3 WHERE id=$1`,
          [id,decision,reason||("Marked "+decision+" through MCP")]);
        await client.query("COMMIT");
        return {content:[{type:"text",text:JSON.stringify({id,state:decision})}]};
      }
      const review=reviewIngestion(item);
      if(review.state!=="approved"){await client.query("ROLLBACK");return {content:[{type:"text",text:review.reason}],isError:true};}
      const m=review.candidate;
      assertNormalMemorySensitivity(m.sensitivity);
      const created=await client.query(`INSERT INTO memories(title,detail,bucket,workspace,source,sensitivity,confidence,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,'bastion-mcp') RETURNING *`,
        [m.title,m.detail,m.bucket,m.workspace,m.source,m.sensitivity,m.confidence]);
      await client.query(`INSERT INTO memory_versions(memory_id,version_no,snapshot,changed_by,reason) VALUES($1,1,$2::jsonb,'bastion-mcp','promoted through MCP review')`,
        [created.rows[0].id,JSON.stringify(created.rows[0])]);
      await client.query("UPDATE ingestion_inbox SET status='processed',bastion_state='approved',processed_at=now(),notes=$2 WHERE id=$1",[id,reason||review.reason]);
      await client.query("COMMIT");
      return {content:[{type:"text",text:JSON.stringify({id,state:"approved",memory:created.rows[0]})}]};
    }catch(error){await client.query("ROLLBACK");return {content:[{type:"text",text:"Review failed: "+error.message}],isError:true};}
    finally{client.release();}
  });

  server.registerTool("list_vault_metadata",{description:"List encrypted Safety Vault item metadata. This never decrypts protected contents.",inputSchema:z.object({
    workspace:z.string().optional(),limit:z.number().int().min(1).max(100).default(25)
  })},async({workspace,limit})=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    const params=[limit];let sql="SELECT id,title,workspace,source,created_by,created_at,updated_at FROM vault_entries WHERE deleted_at IS NULL";
    if(workspace){params.push(workspace);sql+=" AND workspace=$2";}
    sql+=" ORDER BY updated_at DESC LIMIT $1";
    const q=await pool.query(sql,params);
    return {content:[{type:"text",text:JSON.stringify(q.rows)}]};
  });

  server.registerTool("store_vault_item",{description:"Encrypt and store sensitive material in the Safety Vault. This does not expose or search the plaintext afterward.",inputSchema:z.object({
    title:z.string().min(1),plaintext:z.string().min(1),workspace:z.string().default("All work"),source:z.string().default("mcp-agent")
  })},async(input)=>{
    if(!pool)return {content:[{type:"text",text:"Second Brain database is not configured."}],isError:true};
    if(!vaultConfigured())return {content:[{type:"text",text:"Safety Vault is not configured."}],isError:true};
    const entry=await storeVaultEntry(pool,process.env.UTCOS_VAULT_KEY,{...input,createdBy:"mcp-agent"});
    await pool.query("INSERT INTO agent_events(agent_id,event_type,payload) VALUES('bastion','vault.store.mcp',$1::jsonb)",[JSON.stringify({id:entry.id,title:entry.title,workspace:entry.workspace})]);
    return {content:[{type:"text",text:JSON.stringify(entry)}]};
  });

  return server;
}

export function createAgentCoreMcpHandler(pool){
  return createMcpHandler(()=>buildMcpServer(pool),{responseMode:"json"});
}
