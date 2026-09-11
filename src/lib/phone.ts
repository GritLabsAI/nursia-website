/**
 * Country codes and number validation for phone sign-in.
 *
 * Firebase only accepts E.164 — a plus, a country code, then national digits —
 * and rejects anything else outright. Asking someone to type that themselves is
 * how a form loses signups: people type brackets, dashes, a leading zero, or
 * their number exactly as it appears in their own contacts app, and every one of
 * those is a rejection with a message that does not explain itself.
 *
 * So the country is picked, not typed, and the number is validated against that
 * country's own length before an SMS is ever requested. A wrong number caught
 * here costs nothing; a wrong number caught by Firebase costs a message from a
 * quota and thirty seconds of somebody waiting for a text that is not coming.
 *
 * The list leads with the countries that actually sit the NCLEX-RN. It is the
 * American exam, but a large share of candidates are trained in the Philippines,
 * India, and Nigeria, and a list that makes them scroll past twenty European
 * countries first is a list written for the wrong audience.
 */

export type Country = {
  /** ISO 3166-1 alpha-2, and the select's value */
  code: string;
  name: string;
  /** including the plus */
  dial: string;
  /** national digits, excluding the trunk prefix people sometimes type */
  min: number;
  max: number;
  /** shown as the placeholder, in that country's own habits */
  example: string;
  /** takes a definite article: "numbers in *the* Philippines" */
  the?: boolean;
};

/* Lengths are national significant numbers — what you would dial from abroad
   after the country code. Where a country genuinely varies, the range covers
   mobile numbers rather than every landline plan. */
export const COUNTRIES: Country[] = [
  {
    code: "US",
    name: "United States",
    dial: "+1",
    min: 10,
    max: 10,
    example: "555 123 4567",
    the: true,
  },
  {
    code: "PH",
    name: "Philippines",
    dial: "+63",
    min: 10,
    max: 10,
    example: "917 123 4567",
    the: true,
  },
  { code: "IN", name: "India", dial: "+91", min: 10, max: 10, example: "98765 43210" },
  { code: "NG", name: "Nigeria", dial: "+234", min: 10, max: 10, example: "802 123 4567" },
  { code: "CA", name: "Canada", dial: "+1", min: 10, max: 10, example: "416 555 0123" },
  {
    code: "GB",
    name: "United Kingdom",
    dial: "+44",
    min: 9,
    max: 10,
    example: "7400 123456",
    the: true,
  },
  { code: "AU", name: "Australia", dial: "+61", min: 9, max: 9, example: "412 345 678" },
  { code: "IE", name: "Ireland", dial: "+353", min: 9, max: 9, example: "85 123 4567" },
  { code: "NZ", name: "New Zealand", dial: "+64", min: 8, max: 10, example: "21 123 4567" },
  {
    code: "AE",
    name: "United Arab Emirates",
    dial: "+971",
    min: 9,
    max: 9,
    example: "50 123 4567",
    the: true,
  },
  { code: "SA", name: "Saudi Arabia", dial: "+966", min: 9, max: 9, example: "51 234 5678" },
  { code: "QA", name: "Qatar", dial: "+974", min: 8, max: 8, example: "3312 3456" },
  { code: "KW", name: "Kuwait", dial: "+965", min: 8, max: 8, example: "500 12345" },
  { code: "KE", name: "Kenya", dial: "+254", min: 9, max: 9, example: "712 123456" },
  { code: "GH", name: "Ghana", dial: "+233", min: 9, max: 9, example: "24 123 4567" },
  { code: "ZA", name: "South Africa", dial: "+27", min: 9, max: 9, example: "82 123 4567" },
  { code: "PK", name: "Pakistan", dial: "+92", min: 10, max: 10, example: "301 2345678" },
  { code: "BD", name: "Bangladesh", dial: "+880", min: 10, max: 10, example: "1812 345678" },
  { code: "NP", name: "Nepal", dial: "+977", min: 10, max: 10, example: "984 1234567" },
  { code: "LK", name: "Sri Lanka", dial: "+94", min: 9, max: 9, example: "71 234 5678" },
  { code: "JM", name: "Jamaica", dial: "+1", min: 10, max: 10, example: "876 555 0123" },
  {
    code: "TT",
    name: "Trinidad and Tobago",
    dial: "+1",
    min: 10,
    max: 10,
    example: "868 555 0123",
  },
  { code: "MX", name: "Mexico", dial: "+52", min: 10, max: 10, example: "55 1234 5678" },
  { code: "EG", name: "Egypt", dial: "+20", min: 10, max: 10, example: "100 123 4567" },
  { code: "JO", name: "Jordan", dial: "+962", min: 9, max: 9, example: "79 012 3456" },
  { code: "SG", name: "Singapore", dial: "+65", min: 8, max: 8, example: "8123 4567" },
  { code: "MY", name: "Malaysia", dial: "+60", min: 9, max: 10, example: "12 345 6789" },
  { code: "DE", name: "Germany", dial: "+49", min: 10, max: 11, example: "1512 3456789" },
  { code: "FR", name: "France", dial: "+33", min: 9, max: 9, example: "6 12 34 56 78" },
  { code: "ES", name: "Spain", dial: "+34", min: 9, max: 9, example: "612 34 56 78" },
  { code: "IT", name: "Italy", dial: "+39", min: 9, max: 10, example: "312 345 6789" },
  { code: "BR", name: "Brazil", dial: "+55", min: 10, max: 11, example: "11 91234 5678" },
  { code: "JP", name: "Japan", dial: "+81", min: 10, max: 10, example: "90 1234 5678" },
  { code: "KR", name: "South Korea", dial: "+82", min: 9, max: 10, example: "10 1234 5678" },
  { code: "CN", name: "China", dial: "+86", min: 11, max: 11, example: "131 2345 6789" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export const findCountry = (code: string): Country =>
  COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;

export const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "");

/**
 * Drop the trunk prefix.
 *
 * Most of the world writes its own numbers with a leading zero that is only
 * dialled domestically — 07400 in the UK, 0917 in the Philippines — and E.164
 * does not want it. People type their number the way they know it, so strip the
 * zero rather than rejecting them for it.
 *
 * Not for the +1 countries, where no such prefix exists and a leading zero is
 * simply a wrong number worth failing on.
 */
export function stripTrunk(country: Country, national: string): string {
  const digits = digitsOnly(national);
  if (country.dial === "+1") return digits;
  return digits.replace(/^0+/, "");
}

/** The full E.164 string Firebase wants. */
export function toE164(country: Country, national: string): string {
  return `${country.dial}${stripTrunk(country, national)}`;
}

/**
 * What is wrong with this number, in words, or null if nothing is.
 *
 * Says which country it is judging against, because the commonest mistake is a
 * right number under the wrong flag, and "that number is too short" on its own
 * sends someone hunting for a digit they have not lost.
 */
export function nationalError(country: Country, national: string): string | null {
  const digits = stripTrunk(country, national);
  if (!digits) return "Enter your mobile number.";
  if (digits.length < country.min || digits.length > country.max) {
    /* Phrased around the country rather than the number, because "a India
       number" is the kind of sentence that makes a form look unfinished. */
    const where = country.the ? `the ${country.name}` : country.name;
    return `Numbers in ${where} are ${lengthPhrase(country)} long. That is ${digits.length}.`;
  }
  return null;
}

const lengthPhrase = (c: Country) =>
  c.min === c.max ? `${c.min} digits` : `${c.min}–${c.max} digits`;

const GROUPS: Record<number, number[]> = {
  8: [4, 4],
  9: [3, 3, 3],
  10: [3, 3, 4],
  11: [3, 4, 4],
};

/**
 * Grouped for reading back: "+1 555 123 4567". Display only.
 *
 * The dial code is matched against the list rather than guessed from the
 * digits. Guessing splits +1 555… into "+155 5…", because the longest possible
 * country code is three digits and a regex has no way to know this one is not.
 */
export function formatE164(e164: string): string {
  if (!e164.startsWith("+")) return e164;
  const dial =
    COUNTRIES.map((c) => c.dial)
      .filter((d) => e164.startsWith(d))
      .sort((a, b) => b.length - a.length)[0] ?? e164.slice(0, 2);

  const rest = e164.slice(dial.length);
  if (!rest) return dial;
  /* Grouped the way each length is actually written down: 8 digits is two
     fours in Singapore, 10 is 3-3-4 across the +1 countries and India. */
  const groups = GROUPS[rest.length] ?? [3, 3, 3, 3];
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= rest.length) break;
    parts.push(rest.slice(i, i + size));
    i += size;
  }
  if (i < rest.length) parts.push(rest.slice(i));
  return `${dial} ${parts.join(" ")}`;
}
