// Credential rules shared by the profile builder (screen 29) and the credential review (screen 38), so the B7 board rule and
// the file-size unit exist once. Rule B7: "board eligible" is text, never the badge; a certified board must be a named ABMS or
// AOA board.
/** ABMS member boards are "American Board of ..."; AOA boards are "American Osteopathic Board of ..." (rule B7). */
export const NAMED_BOARD = /^American (Osteopathic )?Board of \S/i;
export const boardIsNamed = (name: string) => NAMED_BOARD.test(name.trim());

export const MB = 1024 * 1024;
/** File size in megabytes for messages and file rows; format it with lib/format. */
export const toMb = (bytes: number) => bytes / MB;
