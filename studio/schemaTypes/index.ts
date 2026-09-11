import type { SchemaTypeDefinition } from "sanity";

import { faq } from "./objects/faq";
import { guideSection } from "./objects/guideSection";
import { research } from "./objects/research";
import { richText } from "./objects/richText";

import { author } from "./documents/author";
import { experiment, experimentVariant } from "./documents/experiment";
import { guide } from "./documents/guide";
import { leadMagnet } from "./documents/leadMagnet";
import { nursingPage } from "./documents/nursingPage";
import { seoPage } from "./documents/seoPage";
import { topic } from "./documents/topic";

export const schemaTypes: SchemaTypeDefinition[] = [
  /* documents */
  guide,
  seoPage,
  nursingPage,
  topic,
  leadMagnet,
  experiment,
  author,
  /* objects */
  guideSection,
  faq,
  richText,
  research,
  experimentVariant,
];
