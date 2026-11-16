import test from "node:test";
import assert from "node:assert/strict";
import { filterRelevantSources } from "../src/lib/webSearch.js";

test("search rejects unrelated pages that only share a broad topic", () => {
  const results = filterRelevantSources("Salih Güven kimdir Muğla", [
    { title: "TBMM 27. dönem milletvekilleri", snippet: "Türkiye Büyük Millet Meclisi milletvekilleri" },
    { title: "Balkesirspor 2013-14 sezonu", snippet: "Muğla ve spor haberleri" },
    { title: "Salih Güven", snippet: "Muğla'da yaşayan araştırmacı Salih Güven hakkında biyografi" },
  ]);
  assert.deepEqual(results.map(({ title }) => title), ["Salih Güven"]);
});

test("search retains a relevant single-concept result and ignores empty queries", () => {
  const source = { title: "Fotosentez", snippet: "Bitkilerde ışıkla besin üretimi" };
  assert.deepEqual(filterRelevantSources("fotosentez nedir", [source]), [source]);
  assert.deepEqual(filterRelevantSources("???", [source]), []);
});
