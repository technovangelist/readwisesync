import { ensureDirSync, existsSync } from "https://deno.land/std/fs/mod.ts";
import { ConfigOptions } from "./types.ts";
const configFile = "/Users/matt.williams/readwiseconfig.json";

export function getLocalMetadata(
  localfilecontents: string,
  locationcode: string
) {
  // console.log(localfilecontents);
  const startstring = `<!--start${locationcode}-->\n`;
  const endstring = `\n<!--end${locationcode}-->`;

  let startindex = -1,
    endindex = -1;
  let outputstring = `${startstring}${endstring}\n\n`;
  // console.log(startstring);
  startindex = localfilecontents.indexOf(startstring);
  if (startindex > 0) {
    // console.log(start);
    endindex = localfilecontents.indexOf(endstring) + endstring.length;
    // console.log(end);
    outputstring = localfilecontents.substring(startindex, endindex);
  }

  return outputstring;
}

export function getLocalExtras(
  localfilecontents: string,
  locationcode: string
) {
  // console.log(localfilecontents);
  const startstring = `%%${locationcode}start%%\n#### Extras:\n`;
  const endstring = `\n%%${locationcode}end%%`;

  let startindex = -1,
    endindex = -1;
  let outputstring = `${startstring}${endstring}\n\n`;
  // console.log(startstring);
  startindex = localfilecontents.indexOf(startstring);
  if (startindex > 0) {
    // console.log(start);
    endindex = localfilecontents.indexOf(endstring) + endstring.length;
    // console.log(end);
    outputstring = localfilecontents.substring(startindex, endindex);
  }

  return outputstring;
}
export async function getConfig(): Promise<ConfigOptions> {
  // const configFile = "/Users/matt.williams/readwiseconfig.json";

  const config = JSON.parse(await Deno.readTextFile(configFile));
  ensureDirSync(config.destination_dir);

  return config;
}

export async function setConfig(config: ConfigOptions) {
  await Deno.writeTextFile(configFile, JSON.stringify(config));
}

export async function writeDestinationFile(
  bookTitle: string,
  destinationDir: string,
  category: string,
  outputContent: string
) {
  const destinationFileName = getDestinationFileName(
    destinationDir,
    category,
    bookTitle
  );
  try {
    ensureDirSync(`${destinationDir}/${category}`);
    await Deno.writeTextFile(destinationFileName, outputContent);
  } catch (error) {
    console.log(`Error writing file for ${bookTitle}-${error}`);
  }
}

export function getDestinationFileName(
  destinationDir: string,
  category: string,
  bookTitle: string
) {
  return `${destinationDir}/${category}/${bookTitle.replace(/\//g, "-")}.md`;
}

export function getDestinationFileContent(
  destinationDir: string,
  category: string,
  bookTitle: string
): string {
  const filename = getDestinationFileName(destinationDir, category, bookTitle);
  let filecontents = "";
  if (existsSync(filename)) {
    filecontents = Deno.readTextFileSync(filename);
  }
  return filecontents;
}
