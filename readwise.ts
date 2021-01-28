import { ISource, IAllSources, IHighlight, IAllHighlights } from "./types.ts";
import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";
import {
  parse as parsedate,
  format as formatdate,
} from "https://deno.land/std@0.69.0/datetime/mod.ts";

const config = JSON.parse(
  await Deno.readTextFile("/Users/matt.williams/readwiseconfig.json")
);
const lastupdatequery = config.lastupdate
  ? `&updated__gt=${config.lastupdate}`
  : "";

let mostrecentupdate = config.lastupdate
  ? new Date(config.lastupdate)
  : new Date(2000, 1, 1);
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const readwisedateparse = (inputdate: string): string => {
  // const parseddate = parsedate(inputdate, "yyyy-MM-dd'T'HH:mm:ss.SSSZ");
  const parseddate = new Date(inputdate);
  if (parseddate > mostrecentupdate) {
    mostrecentupdate = parseddate;
  }
  return formatdate(parseddate, "MM/dd/yyyy hh:mm a");
};

await fetch(
  `https://readwise.io/api/v2/books/?page_size=500${lastupdatequery}`,
  {
    headers: {
      Authorization: `TOKEN ${config.READWISE_ACCESS_TOKEN}`,
      type: "GET",
      "Content-Type": "application/json",
    },
  }
).then(async (results) => {
  const allSources: IAllSources = await results.json();

  for (const item of allSources.results) {
    // allSources.results.map(async (item: ISource) => {

    const {
      id: book_id,
      title: book_title,
      author,
      category,
      num_highlights,
      last_highlight_at,
      updated,
      cover_image_url,
      highlights_url,
      source_url,
    } = item;

    if (num_highlights > 0) {
      console.log(`Syncing: ${book_title}`);
      await delay(3000);
      const allHighlights: IAllHighlights = await fetch(
        `https://readwise.io/api/v2/highlights/?book_id=${book_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `TOKEN ${config.READWISE_ACCESS_TOKEN}`,
            type: "GET",
            "Content-Type": "application/json",
          },
        }
      ).then(async (result) => await result.json());

      if ((await allHighlights.count) > 0) {
        const titletext = book_title
          ? `Notes for ${book_title}\n\n`
          : `Notes for unamed resource\n\n`;
        const authortext = author ? `Author: ${author}\n` : "";
        const categorytext = category ? `Category: ${category}\n` : "";
        const updatedtext = updated
          ? `Updated: ${readwisedateparse(updated)}\n`
          : `Updated: unknown\n`;
        const coverurltext = cover_image_url
          ? cover_image_url.includes("readwise")
            ? ""
            : `CoverImageUrl: \n![|200](${cover_image_url})\n`
          : "";
        const highlightsurltext = highlights_url
          ? `Highlights URL: ${highlights_url}\n`
          : "";
        const sourceurltext = source_url ? `SourceUrl: ${source_url}\n` : "";

        let mdoutput = `${titletext}${authortext}${categorytext}${updatedtext}${coverurltext}${highlightsurltext}${sourceurltext}\n\nHighlights:\n\n`;

        allHighlights.results.map((result: IHighlight) => {
          const highlightedtext = result.text
            ? `==${result.text.replace(
                /\b\W*\n\W\n*\W*\n*\W*\n*\W*\b/gm,
                "\n"
              )}== ^rw${result.id}hl\n\n`
            : "";
          const notetext = result.note
            ? `Comment: ${result.note} ^rw${result.id}comment\n`
            : "";
          const highlightedattext = result.highlighted_at
            ? `\nHighlighted: ${readwisedateparse(result.highlighted_at)}\n`
            : `\nHighlighted: unknown\n`;
          const highlightupdatededattext =
            result.highlighted_at != result.updated
              ? `Updated: ${readwisedateparse(result.updated)}\n`
              : ``;
          const highlighturltext = result.url ? `${result.url}\n` : "";
          mdoutput += `${highlightedtext}${notetext}${highlightedattext}${highlightupdatededattext}${highlighturltext}\n------\n\n`;
        });
        try {
          ensureDirSync(`${config.LOCAL_FOLDER}/${category}`);
          await Deno.writeTextFile(
            `${config.LOCAL_FOLDER}/${category}/${book_title.replace(
              /\//g,
              "-"
            )}.md`,
            mdoutput
          );
        } catch (error) {
          console.log(`Error writing file for ${book_title}-${error}`);
        }
      } else {
        console.log(
          `Ignoring ${book_title} - ${JSON.stringify(allHighlights)}`
        );
      }
      // console.log(`${book_id}-${book_title} - ${highlights.count}`);
      // console.log(highlights.count);

      //end map
      // });
    } else {
      console.log(`num highlights = 0 ${book_title}`);
    }
  }
  //end map

  // allSources.map(() => {
  //   console.log(source);
  // });
  // allSources.forEach(async (source: { id: string }) => {
  //   console.log(await source.id);
  // });
});

config.lastupdate = new Date(mostrecentupdate.getTime() + 1).toISOString();
// console.log(config.READWISE_ACCESS_TOKEN);
await Deno.writeTextFile(
  "/Users/matt.williams/readwiseconfig.json",
  JSON.stringify(config, null, 2)
);

// config.set("test", "123");

// console.log(allHighlights);
