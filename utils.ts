import {
  parse as parsedate,
  format as formatdate,
} from "https://deno.land/std@0.69.0/datetime/mod.ts";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const readwisedateparse = (inputdate: string): string => {
  const parseddate = new Date(inputdate);
  return formatdate(parseddate, "MM/dd/yyyy hh:mm a");
};
