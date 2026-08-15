import { describe, expect, it } from "vitest";
import { extractBalancedJsonFragments, extractBalancedJsonPrefix } from "./balanced-json.js";

describe("extractBalancedJsonPrefix", () => {
  it("skips an opener inside quoted prose", () => {
    const raw = 'prefix "notjson{here}" middle {"a":[1,{"b":"c"}]} suffix';

    expect(extractBalancedJsonPrefix(raw)?.json).toBe('{"a":[1,{"b":"c"}]}');
  });

  it("skips an escaped quote inside quoted prose", () => {
    const raw = 'say "he said \\"{nope}\\" loudly" then {"ok":true}';

    expect(extractBalancedJsonPrefix(raw)?.json).toBe('{"ok":true}');
  });

  it("keeps braces that appear inside a string of the value itself", () => {
    const raw = '{"a":"}{","b":[1]}';

    expect(extractBalancedJsonPrefix(raw)?.json).toBe(raw);
  });

  it("reports the index of the value it returns", () => {
    const raw = 'noise "x{y}" {"a":1}';

    expect(extractBalancedJsonPrefix(raw)).toEqual({
      json: '{"a":1}',
      startIndex: raw.indexOf('{"a":1}'),
      endIndex: raw.length - 1,
    });
  });

  it("honours the openers option", () => {
    const raw = '[1,2] {"a":1}';

    expect(extractBalancedJsonPrefix(raw, { openers: ["{"] })?.json).toBe('{"a":1}');
  });

  it("returns null when there is no balanced value", () => {
    expect(extractBalancedJsonPrefix('prose "with {braces}" only')).toBeNull();
    expect(extractBalancedJsonPrefix("no json here")).toBeNull();
  });
});

describe("extractBalancedJsonFragments", () => {
  it("does not report quoted prose as a fragment", () => {
    const raw = '"{skip}" {"a":1} tail "{skip too}" [2]';

    expect(extractBalancedJsonFragments(raw).map((fragment) => fragment.json)).toEqual([
      '{"a":1}',
      "[2]",
    ]);
  });
});
