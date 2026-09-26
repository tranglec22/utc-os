import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const OUT = new URL("../data/job-radar.json", import.meta.url);
const key = process.env.XAI_API_KEY;

if (!key) {
  console.log("XAI_API_KEY is not configured. Keeping the existing verified radar feed.");
  process.exit(0);
}

const now = new Date();
const from = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
const isoDay = d => d.toISOString().slice(0,10);

const prompt = `
You are the research engine for UP2CODE Painting & Contracting's Pittsburgh Job Radar.
Find CURRENT, publicly verifiable opportunities that a small experienced painting/finishing contractor could realistically pursue around Pittsburgh / Allegheny County / practical Western Pennsylvania.

Search source families broadly:
- official government/housing authority/public procurement and bid portals
- subcontractor and restoration networks
- Indeed and other job boards for contract/subcontractor/crew work
- Craigslist/classifieds/local boards
- public X posts when they contain a real opportunity with a public action path

Target scopes: interior/exterior painting, high-end residential painting, commercial painting, drywall/plaster hang/finish/repair, cabinet/refinish work, deck/fence coatings, maintenance/turnover work, punch-list/repair work, and subcontract packages where those trades can be separated.

Hard rules:
- Return only opportunities with a working public source URL.
- Never invent contact info, compensation, dates, licenses, insurance, credentials or scope.
- Exclude decorative/art painting, automotive painting and unrelated industrial roles unless the actual scope is a strong UP2CODE fit.
- Prefer postings checked in the last 45 days, but allow older postings only when clearly ongoing and still live.
- Dedupe semantically identical reposts.
- Score 0-100 using scope fit, freshness, Pittsburgh-area fit, public action path, value/repeat potential and evidence quality.
- Use HOT for 75-100, WARM for 50-74, WATCH below 50.
- status must be NEW. No outreach is automatic.
- If a requirement (insurance/license/crew size/travel) may block the opportunity, state it plainly.

Return ONLY valid JSON in this shape:
{"opportunities":[
  {
    "title":"...",
    "company":"...",
    "category":"Customer Project|Crew Work|Public Bid",
    "location":"...",
    "score":0,
    "band":"HOT|WARM|WATCH",
    "project":"...",
    "summary":"...",
    "source":"...",
    "sourceUrl":"https://...",
    "posted":"YYYY-MM-DD or null",
    "deadline":"short text or null",
    "radarNotes":"what was verified and any gating requirement",
    "whyFits":"...",
    "followUp":"review/verification step, not an automatic send"
  }
]}
`;

const body = {
  model:"grok-4.7",
  input:[{role:"user",content:prompt}],
  tools:[
    {type:"web_search"},
    {type:"x_search",from_date:isoDay(from),to_date:isoDay(now)}
  ],
  reasoning:{effort:"low"}
};

const res = await fetch("https://api.x.ai/v1/responses", {
  method:"POST",
  headers:{
    "Authorization":`Bearer ${key}`,
    "Content-Type":"application/json"
  },
  body:JSON.stringify(body)
});

if (!res.ok) throw new Error(`xAI radar failed: ${res.status} ${await res.text()}`);
const data = await res.json();
const text = String(data.output_text || "").trim()
  .replace(/^\`\`\`(?:json)?\s*/i,"")
  .replace(/\s*\`\`\`$/,"");

let parsed;
try { parsed = JSON.parse(text); }
catch (err) {
  throw new Error("Grok did not return parseable JSON: " + text.slice(0,500));
}

const raw = Array.isArray(parsed.opportunities) ? parsed.opportunities : [];
const cleanUrl = u => {
  try {
    const x = new URL(String(u || ""));
    x.hash = "";
    ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"].forEach(k=>x.searchParams.delete(k));
    return x.toString();
  } catch { return ""; }
};
const idFor = x => "radar-" + createHash("sha1").update(x).digest("hex").slice(0,14);
const seen = new Set();

const leads = [];
for (const x of raw) {
  const sourceUrl = cleanUrl(x.sourceUrl);
  if (!sourceUrl || !/^https?:/.test(sourceUrl)) continue;
  const key = sourceUrl.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  const score = Math.max(0,Math.min(100,Number(x.score)||0));
  leads.push({
    id:idFor(key),
    title:String(x.title||"Opportunity").slice(0,180),
    company:String(x.company||x.source||"Public source").slice(0,160),
    category:String(x.category||"Crew Work").slice(0,80),
    location:String(x.location||"Pittsburgh area").slice(0,180),
    score,
    band:["HOT","WARM","WATCH"].includes(x.band) ? x.band : score>=75?"HOT":score>=50?"WARM":"WATCH",
    status:"NEW",
    unread:true,
    project:String(x.project||"").slice(0,1200),
    aiSummary:String(x.summary||"").slice(0,1400),
    source:String(x.source||"Web").slice(0,100),
    sourceUrl,
    radarNotes:String(x.radarNotes||"").slice(0,1200),
    whyFits:String(x.whyFits||"").slice(0,900),
    followUp:String(x.followUp||"Review the public source before acting.").slice(0,900),
    timeline:String(x.deadline||x.posted||"Current posting").slice(0,300),
    note:"—",
    live:true
  });
  if (leads.length >= 50) break;
}

if (!leads.length) {
  console.log("No verified leads returned; preserving prior feed.");
  process.exit(0);
}

let previous = null;
try { previous = JSON.parse(await readFile(OUT,"utf8")); } catch {}
const out = {
  format:"utc-os-job-radar",
  version:2,
  generatedAt:new Date().toISOString(),
  provider:"xAI Grok 4.7 + web_search + x_search",
  note:"Public opportunity feed only. Verify source before acting. No automatic outreach.",
  previousGeneratedAt:previous?.generatedAt || null,
  leads
};
await writeFile(OUT, JSON.stringify(out,null,2)+"\n");
console.log(`Wrote ${leads.length} verified radar leads.`);
