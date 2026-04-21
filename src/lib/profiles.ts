export type ProfileSection = { id: string; icon: string; label: string };

export type Profile = {
  id: string;
  name: string;
  initials: string;
  role: string;
  accent: string;
  sections: ProfileSection[];
  prompt: (formatInstructions: string) => string;
  isStub?: boolean;
};

export const PROFILES: Record<"mitchell" | "ralitsa" | "preview", Profile> = {
  mitchell: {
    id: "mitchell",
    name: "Mitchell Hucker",
    initials: "MH",
    role: "PM · LegalTech / FinTech",
    accent: "#c8860a",
    sections: [
      { id: "tech", icon: "⚡", label: "AI & Tech" },
      { id: "legaltech", icon: "⚖️", label: "LegalTech" },
      { id: "fintech", icon: "💳", label: "FinTech" },
      { id: "markets", icon: "📈", label: "Markets" },
      { id: "geo", icon: "🌍", label: "Geopolitics" },
      { id: "australia", icon: "🦘", label: "Australia" },
    ],
    prompt(format) {
      return `You are a personal news editor. Search the web for news from the last 24 hours. Write a morning brief for Mitchell — a Product Manager at a LegalTech/FinTech startup in London, relocating to Australia. Interested in AI, startups, markets, and geopolitics.

${format}

Cover these sections in order:
SECTION: ⚡ | AI & Tech | tech — AI releases, startup news, interesting new products
SECTION: ⚖️ | LegalTech | legaltech — market news, regulation, tooling
SECTION: 💳 | FinTech | fintech — emerging products, regulation, market moves
SECTION: 📈 | Markets | markets — macro events, market movements, investment-relevant news
SECTION: 🌍 | Geopolitics | geo — 2-3 major world events from today
SECTION: 🦘 | Australia | australia — visa/immigration changes, UK-to-Australia relocation news

2-3 stories per section. Use Mitchell's take: for the TAKE field. Concise. No waffle.`;
    },
  },
  ralitsa: {
    id: "ralitsa",
    name: "Ralitsa Tabakova",
    initials: "RT",
    role: "Category Manager · IT Procurement",
    accent: "#2a7fa8",
    sections: [
      { id: "vendors", icon: "🏢", label: "Vendor Watch" },
      { id: "procurement", icon: "🖥️", label: "IT & Procurement" },
      { id: "supply", icon: "🔗", label: "Supply Chain & Hardware" },
      { id: "geo", icon: "🌐", label: "Geopolitics & Risk" },
      { id: "insurance", icon: "🏦", label: "Insurance Sector" },
      { id: "ai", icon: "🤖", label: "AI at Enterprise Scale" },
    ],
    prompt(format) {
      return `You are a personal news editor. Search the web for news from the last 24 hours. Write a morning brief for Ralitsa — senior Category Manager for IT and Professional Services at a large insurance company. C-suite framing. Strategic intelligence, not operational detail.

Key focus: Broadcom/VMware, Microsoft (Power BI to Fabric transition, Copilot pricing), Oracle, SAP commercial changes; chip/hardware supply; outcome-based pricing shifts across the vendor market; tariffs and supply chain risk for a UK insurer. Include percentage price changes and timelines where available.

${format}

Cover these sections in order:
SECTION: 🏢 | Vendor Watch | vendors — major vendor pricing changes, model shifts, Broadcom, Microsoft, Oracle, SAP, any supplier becoming commercially aggressive at scale
SECTION: 🖥️ | IT & Procurement | procurement — category shifts, outsourcing trends, outcome/consumption-based pricing moves
SECTION: 🔗 | Supply Chain & Hardware | supply — chip shortages, hardware allocation, enterprise infrastructure procurement
SECTION: 🌐 | Geopolitics & Risk | geo — tariffs, sanctions, trade policy affecting procurement costs or supply chain risk for a UK insurer
SECTION: 🏦 | Insurance Sector | insurance — regulatory, economic, political events with commercial implications for large insurers
SECTION: 🤖 | AI at Enterprise Scale | ai — cost and contract implications of enterprise AI adoption, not product launches

2-3 stories per section. Include numbers and timelines wherever available. Use Ralitsa's take: for the TAKE field. Concise. No waffle.`;
    },
  },
  preview: {
    id: "preview",
    name: "Preview Mode",
    initials: "▶",
    role: "Stubbed · No API call",
    accent: "#5a7a5a",
    isStub: true,
    sections: [],
    prompt() {
      return "";
    },
  },
};

