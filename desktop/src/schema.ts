/**
 * A checker for the JSON Schema words the contracts use, and no others. A contract that
 * uses a word this file does not know is refused when the checker is made, so a check is
 * never passed by a word that was skipped.
 *
 * A problem names where the value first fails and the rule it breaks. It never holds a
 * value from the case: a key the schema does not name is written as `*`.
 */

type SchemaObject = { readonly [word: string]: unknown };
type Schema = SchemaObject | boolean;

/** Words that change what a value may be. */
const CHECKS = new Set([
  "$ref",
  "type",
  "const",
  "enum",
  "anyOf",
  "oneOf",
  "properties",
  "required",
  "additionalProperties",
  "propertyNames",
  "maxProperties",
  "items",
  "minItems",
  "maxItems",
  "pattern",
  "minLength",
  "maxLength",
  "format",
  "minimum",
  "maximum",
]);

/** Words that say what a schema is, and change nothing. */
const NOTES = new Set(["$schema", "$id", "$defs", "title", "description"]);

const FORMATS = new Set(["date", "date-time"]);

function isSchemaObject(value: unknown): value is SchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every word of every schema below this one is known. Throws on the first that is not. */
export function knownWords(schema: unknown, where = "#"): void {
  if (typeof schema === "boolean") return;
  if (!isSchemaObject(schema)) throw new Error(`${where}: a schema must be an object`);
  for (const [word, inside] of Object.entries(schema)) {
    if (!CHECKS.has(word) && !NOTES.has(word)) throw new Error(`${where}: unknown word ${word}`);
    if (word === "format" && !FORMATS.has(String(inside))) {
      throw new Error(`${where}: unknown format ${String(inside)}`);
    }
    if (word === "properties" || word === "$defs") {
      if (!isSchemaObject(inside)) throw new Error(`${where}/${word}: must be an object`);
      for (const [name, part] of Object.entries(inside))
        knownWords(part, `${where}/${word}/${name}`);
    } else if (word === "anyOf" || word === "oneOf") {
      if (!Array.isArray(inside)) throw new Error(`${where}/${word}: must be a list`);
      inside.forEach((part, index) => knownWords(part, `${where}/${word}/${index}`));
    } else if (word === "items" || word === "additionalProperties" || word === "propertyNames") {
      knownWords(inside, `${where}/${word}`);
    }
  }
}

/** The value is plain data, as JSON could carry it: no class, no cycle, no NaN. */
export function plainProblem(value: unknown): string | null {
  const open = new Set<unknown>();
  const walk = (inside: unknown, path: string): string | null => {
    if (inside === null || typeof inside === "boolean" || typeof inside === "string") return null;
    if (typeof inside === "number") return Number.isFinite(inside) ? null : `${path}: finite`;
    if (typeof inside !== "object") return `${path}: plain data`;
    if (open.has(inside)) return `${path}: plain data`;
    const proto: unknown = Object.getPrototypeOf(inside);
    const list = Array.isArray(inside);
    if (list ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) {
      return `${path}: plain data`;
    }
    open.add(inside);
    const entries: [string, unknown][] = list
      ? inside.map((item, index) => [String(index), item] as [string, unknown])
      : Object.entries(inside);
    for (const [key, item] of entries) {
      const problem = walk(item, `${path}/${list ? key : "*"}`);
      if (problem !== null) return problem;
    }
    open.delete(inside);
    return null;
  };
  return walk(value, "");
}

function isRealDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** RFC 3339 date-time, as JSON Schema's format names it: a real day, a real time, an offset. */
function isRealDateTime(text: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))$/.exec(text);
  if (match === null || !isRealDate(match[1] ?? "")) return false;
  const [hour, minute, second] = [Number(match[2]), Number(match[3]), Number(match[4])];
  const offset = match[7] === undefined ? [0, 0] : [Number(match[7]), Number(match[8])];
  return (
    hour <= 23 && minute <= 59 && second <= 60 && (offset[0] ?? 0) <= 23 && (offset[1] ?? 0) <= 59
  );
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case "null":
      return value === null;
    case "boolean":
      return typeof value === "boolean";
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "array":
      return Array.isArray(value);
    case "object":
      return isSchemaObject(value);
    default:
      return false;
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface Place {
  /** The document the schema sits in, by its $id. */
  base: string;
  schema: Schema;
}

export class Checker {
  private readonly documents = new Map<string, SchemaObject>();
  private readonly patterns = new Map<string, RegExp>();

  /** Each schema must carry an absolute $id. A $ref may name another by a relative one. */
  constructor(schemas: readonly unknown[]) {
    for (const schema of schemas) {
      knownWords(schema);
      if (!isSchemaObject(schema) || typeof schema.$id !== "string") {
        throw new Error("a schema needs an $id");
      }
      this.documents.set(new URL(schema.$id).href, schema);
    }
  }

  /**
   * The first problem with the value under the schema at this address, such as
   * `https://duly.local/contracts/case.schema.json` or `...#/$defs/write_call`.
   * Null when the value matches.
   */
  problem(address: string, value: unknown): string | null {
    const plain = plainProblem(value);
    if (plain !== null) return plain;
    const place = this.resolve(address);
    return this.check(place, value, "");
  }

  private resolve(address: string): Place {
    const url = new URL(address);
    const fragment = url.hash.slice(1);
    url.hash = "";
    const document = this.documents.get(url.href);
    if (document === undefined) throw new Error(`no schema ${url.href}`);
    let schema: unknown = document;
    for (const step of fragment.split("/").filter((part) => part !== "")) {
      const key = decodeURIComponent(step).replaceAll("~1", "/").replaceAll("~0", "~");
      schema = isSchemaObject(schema) ? schema[key] : undefined;
    }
    if (typeof schema !== "boolean" && !isSchemaObject(schema)) {
      throw new Error(`no schema at ${address}`);
    }
    return { base: url.href, schema };
  }

  private pattern(source: string): RegExp {
    let found = this.patterns.get(source);
    if (found === undefined) {
      found = new RegExp(source, "u");
      this.patterns.set(source, found);
    }
    return found;
  }

  private check(place: Place, value: unknown, path: string): string | null {
    const { base, schema } = place;
    if (schema === true) return null;
    if (schema === false) return `${path || "/"}: false`;
    const at = (word: string) => `${path || "/"}: ${word}`;
    const inside = (part: unknown): Place => ({ base, schema: part as Schema });

    if (typeof schema.$ref === "string") {
      const problem = this.check(this.resolve(new URL(schema.$ref, base).href), value, path);
      if (problem !== null) return problem;
    }
    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((type) => typeMatches(String(type), value))) return at("type");
    }
    if ("const" in schema && !sameJson(schema.const, value)) return at("const");
    if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJson(item, value))) {
      return at("enum");
    }
    if (Array.isArray(schema.anyOf)) {
      const some = schema.anyOf.some((part) => this.check(inside(part), value, path) === null);
      if (!some) return at("anyOf");
    }
    if (Array.isArray(schema.oneOf)) {
      const matches = schema.oneOf.filter((part) => this.check(inside(part), value, path) === null);
      if (matches.length !== 1) return at("oneOf");
    }

    if (typeof value === "string") {
      const length = [...value].length;
      if (typeof schema.minLength === "number" && length < schema.minLength) return at("minLength");
      if (typeof schema.maxLength === "number" && length > schema.maxLength) return at("maxLength");
      if (typeof schema.pattern === "string" && !this.pattern(schema.pattern).test(value)) {
        return at("pattern");
      }
      if (schema.format === "date" && !isRealDate(value)) return at("format");
      if (schema.format === "date-time" && !isRealDateTime(value)) return at("format");
    }
    if (typeof value === "number") {
      if (typeof schema.minimum === "number" && value < schema.minimum) return at("minimum");
      if (typeof schema.maximum === "number" && value > schema.maximum) return at("maximum");
    }
    if (Array.isArray(value)) {
      if (typeof schema.minItems === "number" && value.length < schema.minItems) {
        return at("minItems");
      }
      if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
        return at("maxItems");
      }
      if (schema.items !== undefined) {
        for (const [index, item] of value.entries()) {
          const problem = this.check(inside(schema.items), item, `${path}/${index}`);
          if (problem !== null) return problem;
        }
      }
    }
    if (isSchemaObject(value)) return this.checkObject(place, schema, value, path);
    return null;
  }

  private checkObject(
    place: Place,
    schema: SchemaObject,
    value: SchemaObject,
    path: string,
  ): string | null {
    const at = (word: string) => `${path || "/"}: ${word}`;
    const inside = (part: unknown): Place => ({ base: place.base, schema: part as Schema });
    const named = isSchemaObject(schema.properties) ? schema.properties : {};
    const keys = Object.keys(value);

    if (typeof schema.maxProperties === "number" && keys.length > schema.maxProperties) {
      return at("maxProperties");
    }
    if (Array.isArray(schema.required)) {
      for (const name of schema.required) {
        if (typeof name === "string" && !Object.hasOwn(value, name)) return at(`required ${name}`);
      }
    }
    for (const key of keys) {
      const own = Object.hasOwn(named, key);
      const shown = own ? `${path}/${key}` : `${path}/*`;
      if (schema.propertyNames !== undefined) {
        const problem = this.check(inside(schema.propertyNames), key, shown);
        if (problem !== null) return `${shown}: propertyNames`;
      }
      const part = own ? named[key] : schema.additionalProperties;
      if (part === undefined) continue;
      const problem = this.check(inside(part), value[key], shown);
      if (problem !== null)
        return own || part !== false ? problem : `${shown}: additionalProperties`;
    }
    return null;
  }
}
