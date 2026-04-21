export type Story = {
  headline: string;
  snap: string;
  detail?: string;
  take?: string;
  source?: string;
  entities?: string[];
};

export type BriefSection = {
  icon: string;
  label: string;
  id: string;
  stories: Story[];
};

export type Brief = {
  sections: BriefSection[];
};

export const STUB_BRIEF: Brief = {
  sections: [
    {
      icon: "⚡",
      label: "AI & Tech",
      id: "tech",
      stories: [
        {
          headline: "OpenAI quietly raises API pricing for GPT-4o by 18%",
          snap: "A mid-cycle price hike with no announcement — spotted by developers comparing invoices.",
          detail:
            "OpenAI adjusted GPT-4o input token pricing from $2.50 to $2.95 per million tokens effective this month, with no public changelog. Several developer teams flagged the change on X after comparing billing statements. OpenAI has not commented; the move follows similar quiet adjustments by Google and Anthropic in Q1.",
          take: "Mitchell's take: Cost modelling for any AI-native product just got harder — worth re-running your unit economics if you have API spend baked in.",
          source: "The Verge, Hacker News",
          entities: ["OpenAI", "GPT-4o", "AI pricing"],
        },
        {
          headline: "Cursor raises $900m at $9bn valuation in AI coding arms race",
          snap: "The AI IDE war just got a lot more expensive — and a lot more interesting.",
          detail:
            "Cursor closed a $900m Series C led by Thrive Capital, valuing the company at $9bn — up from $400m just 18 months ago. The raise will fund model training, enterprise sales, and a planned Cursor for mobile. GitHub Copilot and JetBrains AI are the immediate competitive pressure points. Some observers note the valuation implies developer tool TAM assumptions that look ambitious.",
          take: "Mitchell's take: If you are building dev tooling or anything adjacent to the coding workflow, this signals a consolidation moment — the big players are buying ground fast.",
          source: "Bloomberg, TechCrunch",
          entities: ["Cursor", "GitHub Copilot", "AI coding"],
        },
      ],
    },
    {
      icon: "⚖️",
      label: "LegalTech",
      id: "legaltech",
      stories: [
        {
          headline: "UK SRA opens consultation on AI use in legal practice",
          snap: "Regulators are finally moving — law firms have 90 days to respond.",
          detail:
            "The Solicitors Regulation Authority published a consultation paper on AI governance frameworks for law firms, covering client disclosure obligations, liability for AI-generated advice, and supervision requirements. Responses are due by 18 July. The paper stops short of banning AI use but signals mandatory disclosure rules are likely by 2026.",
          take: "Mitchell's take: For any LegalTech product touching client-facing outputs, this is the regulatory signal you want to be ahead of — build disclosure UX now, not when it becomes mandatory.",
          source: "SRA, Legal Futures",
          entities: ["SRA", "AI regulation", "LegalTech"],
        },
        {
          headline: "Harvey AI expands into contract lifecycle management",
          snap: "Harvey moves beyond research and drafting into the full contract workflow.",
          detail:
            "Harvey announced a CLM module that integrates with Salesforce and DocuSign, targeting in-house legal teams rather than law firms. Pricing has not been disclosed. The move puts Harvey in direct competition with established CLM players like Ironclad and Luminance, and signals a broader platform ambition beyond point-solution AI.",
          take: "Mitchell's take: This is the inevitable platform play — worth mapping where your product sits in the Harvey orbit and whether that is a partnership or a competitive threat.",
          source: "Harvey, Bloomberg Law",
          entities: ["Harvey AI", "CLM", "Ironclad"],
        },
      ],
    },
    {
      icon: "💳",
      label: "FinTech",
      id: "fintech",
      stories: [
        {
          headline: "Stripe launches stablecoin-backed accounts for 101 countries",
          snap: "Stripe just made dollar-denominated accounts accessible to almost anyone with an internet connection.",
          detail:
            "Stripe announced stablecoin financial accounts available to businesses in 101 countries, backed by USDC and USDB. The accounts allow dollar-denominated revenue collection without a US entity. This is the most significant expansion of Stripe's product surface in five years and directly challenges cross-border payment players like Wise and Airwallex.",
          take: "Mitchell's take: For any startup with global ambitions, this changes the conversation around cross-border treasury from a headache into a one-click decision.",
          source: "Stripe blog, FT",
          entities: ["Stripe", "USDC", "Stablecoin"],
        },
      ],
    },
    {
      icon: "📈",
      label: "Markets",
      id: "markets",
      stories: [
        {
          headline: "US 10-year Treasury yield hits 4.9% as inflation data surprises",
          snap: "Hotter than expected CPI is pushing rate cut expectations firmly into late 2025.",
          detail:
            "US CPI came in at 3.4% year-on-year versus the 3.1% consensus, sending the 10-year yield to its highest since November. Markets are now pricing just one Fed cut in 2025, down from three at the start of the year. UK gilt yields moved in sympathy. Tech valuations sensitive to discount rates saw early sell-offs.",
          take: "Mitchell's take: Higher-for-longer is back on the table — venture valuations and startup fundraising multiples will feel this before public markets do.",
          source: "FT, Bloomberg",
          entities: ["US Treasury", "Federal Reserve", "CPI"],
        },
        {
          headline: "FTSE 100 hits record high on commodities surge and weak pound",
          snap: "A weaker sterling is flattering UK large-cap earnings — the index is not as bullish as it looks.",
          detail:
            "The FTSE 100 closed at a record 8,812 driven by mining and energy stocks as commodity prices climbed. However, analysts note that approximately 80% of FTSE 100 revenues come from outside the UK, meaning the record partly reflects currency translation rather than genuine earnings strength.",
          take: "Mitchell's take: For a general investor, this is a currency story as much as an equity story — worth knowing before reading too much into the headline.",
          source: "Reuters, The Times",
          entities: ["FTSE 100", "Sterling", "Commodities"],
        },
      ],
    },
    {
      icon: "🌍",
      label: "Geopolitics",
      id: "geo",
      stories: [
        {
          headline: "US expands semiconductor export controls to 12 more countries",
          snap: "The chip war just got a bigger map — new controls target allies-of-adversaries, not just adversaries.",
          detail:
            "The Commerce Department added 12 countries to its semiconductor export restriction list, including several in Southeast Asia seen as transshipment routes for advanced chips reaching China. The move drew pushback from TSMC and ASML who flagged disruption to legitimate supply chains. The EU called for coordination before unilateral action.",
          take: "Mitchell's take: If you are building hardware-dependent products or considering manufacturing outside Western Europe and North America, your supply chain assumptions need revisiting.",
          source: "WSJ, Reuters",
          entities: ["US Commerce Dept", "TSMC", "Chip controls"],
        },
      ],
    },
    {
      icon: "🦘",
      label: "Australia",
      id: "australia",
      stories: [
        {
          headline: "Australia raises skilled worker visa income threshold to AUD 73,150",
          snap: "The TSS 482 visa floor goes up in July — affects anyone mid-application or renewing.",
          detail:
            "The Australian Department of Home Affairs confirmed the Temporary Skill Shortage visa income threshold increases from AUD 70,000 to AUD 73,150 effective 1 July 2025. Employers sponsoring workers must pay at or above the new threshold. Applications in progress before 1 July are grandfathered at the current rate. The change applies to both new nominations and renewals lodged after the effective date.",
          take: "Mitchell's take: If your relocation timeline crosses July, worth confirming your sponsoring employer is aware — this can stall a nomination if the salary offer is not updated.",
          source: "Australian Home Affairs, Migration Alliance",
          entities: ["TSS 482 visa", "Australian immigration", "Skilled worker"],
        },
      ],
    },
  ],
};

