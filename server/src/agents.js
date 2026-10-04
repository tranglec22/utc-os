export const AGENTS = {
  margaret: {
    id: "margaret",
    name: "Margaret",
    role: "Executive / Strategy / People / Business",
    teamTitle: "CEO / Executive Intelligence",
    tagline: "Vision turns into legacy.",
    routes: ["strategy", "executive", "priority", "business"]
  },
  kara: {
    id: "kara",
    name: "Kara",
    role: "Chief of Staff / Daily Operations / Creative Flow",
    teamTitle: "Co-Pilot / Chief of Staff",
    tagline: "Ideas become reality.",
    routes: ["daily", "planning", "operations", "coordination"]
  },
  jarvis: {
    id: "jarvis",
    name: "Jarvis",
    role: "System Intelligence / Automation / Technology",
    teamTitle: "System Core / Technical Intelligence",
    tagline: "Complex made simple.",
    routes: ["systems", "coding", "automation", "diagnostics"]
  },
  sauce: {
    id: "sauce",
    name: "Sauce Sensei",
    role: "Creative Director / Lil Wiz-Nap / Music",
    teamTitle: "Creative Architect + Aesthetic Director",
    tagline: "Art changes dimensions.",
    routes: ["creative", "music", "visual", "design"]
  },
  bastion: {
    id: "bastion",
    name: "Bastion",
    role: "Security / Permissions / Truth-State",
    teamTitle: "Security + Verification Gate",
    tagline: "Trust requires proof.",
    routes: ["security", "verification", "permissions", "truth"]
  }
};

const ROUTE_ORDER = [
  ["security", "bastion"],
  ["verification", "bastion"],
  ["permission", "bastion"],
  ["creative", "sauce"],
  ["music", "sauce"],
  ["design", "sauce"],
  ["system", "jarvis"],
  ["code", "jarvis"],
  ["automation", "jarvis"],
  ["daily", "kara"],
  ["plan", "kara"],
  ["schedule", "kara"],
  ["strategy", "margaret"],
  ["priority", "margaret"],
  ["business", "margaret"]
];

export function routeAgent(input = "") {
  const text = String(input).toLowerCase();
  for (const [needle, id] of ROUTE_ORDER) {
    if (text.includes(needle)) return AGENTS[id];
  }
  return AGENTS.kara;
}
