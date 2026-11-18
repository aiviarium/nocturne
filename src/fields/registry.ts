// The kinds, by id: the one place a field's kind is turned into its implementation.
import type { FieldKind } from "./kind"
import { blob } from "./kinds/blob"
import { boolean } from "./kinds/boolean"
import { bytes } from "./kinds/bytes"
import { currency } from "./kinds/currency"
import { date } from "./kinds/date"
import { datetime } from "./kinds/datetime"
import { enumKind } from "./kinds/enum"
import { json } from "./kinds/json"
import { longtext } from "./kinds/longtext"
import { number } from "./kinds/number"
import { ref } from "./kinds/ref"
import { richtext } from "./kinds/richtext"
import { secret } from "./kinds/secret"
import { tags } from "./kinds/tags"
import { text } from "./kinds/text"
import { vector } from "./kinds/vector"
import type { FieldKindId } from "./spec"

export const FIELD_KINDS: Record<FieldKindId, FieldKind> = {
  text,
  longtext,
  richtext,
  number,
  currency,
  boolean,
  date,
  datetime,
  enum: enumKind,
  ref,
  tags,
  secret,
  json,
  blob,
  bytes,
  vector,
}
