interface ISource {
  id: string;
  title: string;
  author: string;
  category: string;
  num_highlights: number;
  last_highlight_at: string;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string;
}

interface IAllSources {
  count: number;
  next: string;
  previous: string;
  results: ISource[];
}

interface IHighlight {
  "id": string;
  "text": string;
  "note": string;
  "location": number;
  "location_type": string;
  "highlighted_at": string;
  "url": string;
  "color": string;
  "updated": string;
  "book_id": string;
}

interface IAllHighlights {
  "count": number;
  "next": string;
  "previous": string;
  results: IHighlight[];
  }