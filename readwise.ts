import {
  ISource,
  IAllSources,
  IHighlight,
  IAllHighlights,
  ConfigOptions,
} from "./types.ts";
import {
  getConfig,
  setConfig,
  writeDestinationFile,
  getLocalMetadata,
  getLocalExtras,
  getDestinationFileName,
  getDestinationFileContent,
} from "./filetools.ts";
import { delay } from "./utils.ts";
import { ensureDirSync } from "https://deno.land/std/fs/mod.ts";
import {
  parse as parsedate,
  format as formatdate,
} from "https://deno.land/std@0.69.0/datetime/mod.ts";

const config: ConfigOptions = await getConfig();

const entityMap = new Map<string, string>(
  Object.entries({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
  })
);

export function escape_html(source: string) {
  return String(source).replace(/[&<>"'\/]/g, (s: string) => entityMap.get(s)!);
}

function sortHighlights(a: IHighlight, b: IHighlight) {
  return a.location - b.location;
}
// const config = JSON.parse(
//   await Deno.readTextFile("/Users/matt.williams/readwiseconfig.json")
// );
const lastupdatequery = config.last_update
  ? `&updated__gt=${config.last_update}`
  : "";

let mostrecentupdate = config.last_update
  ? new Date(config.last_update)
  : new Date(2000, 1, 1);

// function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

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
      Authorization: `TOKEN ${config.readwise_access_token}`,
      type: "GET",
      "Content-Type": "application/json",
    },
  }
).then(async (results) => {
  const allSources: IAllSources = await results.json();

  for (const item of allSources.results) {
    // allSources.results.map(async (item: ISource) => {

    const {
      id: bookId,
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
        `https://readwise.io/api/v2/highlights/?book_id=${bookId}`,
        {
          method: "GET",
          headers: {
            Authorization: `TOKEN ${config.readwise_access_token}`,
            type: "GET",
            "Content-Type": "application/json",
          },
        }
      ).then(async (result) => await result.json());

      if ((await allHighlights.count) > 0) {
        const localfilecontents = getDestinationFileContent(
          config.destination_dir,
          category,
          book_title
        );
        //   Deno.readTextFileSync(
        //   getDestinationFileName(config.destination_dir, category, book_title)
        // );
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

        let mdoutput = `${titletext}## Source:\n${authortext}${categorytext}${updatedtext}${coverurltext}${highlightsurltext}${sourceurltext}\n${getLocalExtras(
          localfilecontents,
          `${bookId}top`
        )}\n \n-----\n ## Highlights:\n\n`;

        allHighlights.results.sort(sortHighlights).map((result: IHighlight) => {
          // const localfilecontents = await get
          const highlightedtext =
            result.text && result.text != "AirrQuote"
              ? `>${escape_html(
                  result.text.replace(/\b\W*\n\W\n*\W*\n*\W*\n*\W*\b/gm, "\n>")
                )} ^rw${result.id}hl\n\n`
              : "";
          const notetext = result.note
            ? `Comment: ${escape_html(result.note)} ^rw${result.id}comment\n`
            : "";
          const highlightedattext = result.highlighted_at
            ? `\nHighlighted: ${readwisedateparse(result.highlighted_at)}\n`
            : `\nHighlighted: unknown\n`;
          const highlightupdatededattext =
            result.highlighted_at != result.updated
              ? `Updated: ${readwisedateparse(result.updated)}\n`
              : ``;

          let highlighttitle =
            result.text.length >= 60
              ? `${result.text.substring(0, 60)}...`
              : `${result.text.substring(0, result.text.length)}`;
          highlighttitle = highlighttitle.replace(
            /\b\W*\n\W\n*\W*\n*\W*\n*\W*\b/gm,
            " "
          );
          const highlighturltext = result.url ? `${result.url}\n` : "";
          if (`${highlightedtext}${notetext}`.length > 1) {
            mdoutput += `### ${highlighttitle}\n${highlightedtext}${notetext}${highlightedattext}${highlightupdatededattext}${highlighturltext}\n${getLocalExtras(
              localfilecontents,
              result.id
            )}\n\n------\n\n`;
          }
        });

        await writeDestinationFile(
          book_title,
          config.destination_dir,
          category,
          mdoutput
        );
        // try {
        //   ensureDirSync(`${config.destination_dir}/${category}`);
        //   await Deno.writeTextFile(
        //     `${config.destination_dir}/${category}/${book_title.replace(
        //       /\//g,
        //       "-"
        //     )}.md`,
        //     mdoutput
        //   );
        // } catch (error) {
        //   console.log(`Error writing file for ${book_title}-${error}`);
        // }
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

config.last_update = new Date(mostrecentupdate.getTime() + 1).toISOString();
// console.log(config.READWISE_ACCESS_TOKEN);
await Deno.writeTextFile(
  "/Users/matt.williams/readwiseconfig.json",
  JSON.stringify(config, null, 2)
);

// config.set("test", "123");

// console.log(allHighlights);
