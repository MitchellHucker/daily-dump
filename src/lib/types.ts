export interface Story {
  headline: string;
  snap: string;
  detail: string;
  take: string;
  source: string;
  entities: string[];
}

export interface Section {
  id: string;
  icon: string;
  label: string;
  stories: Story[];
}

export interface BriefResponse {
  sections: Section[];
}

