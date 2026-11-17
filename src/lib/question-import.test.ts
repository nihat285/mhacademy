import { describe, expect, it } from "vitest";
import { parseQuestionsFromText } from "./question-import";

describe("parseQuestionsFromText", () => {
  it("parses options on separate lines with an answer key at the end", () => {
    const r = parseQuestionsFromText(`TEST 1
1. 2x + 3 = 11 tənliyinin kökünü tapın.
A) 2
B) 4
C) 6
D) 8
2. Kvadratın tərəfi 5 olarsa, sahəsi nəyə bərabərdir?
A) 10 B) 20 C) 25 D) 30
3) Hansı ədəd sadədir?
A. 9  B. 15  C. 17  D. 21  E. 25

Cavablar: 1-B 2-C 3-C`);
    expect(r.questions).toHaveLength(3);
    expect(r.questions[0]).toMatchObject({ no: 1, text: "2x + 3 = 11 tənliyinin kökünü tapın.", options: ["2", "4", "6", "8"], correct: 1 });
    expect(r.questions[1]).toMatchObject({ options: ["10", "20", "25", "30"], correct: 2 });
    expect(r.questions[2]).toMatchObject({ options: ["9", "15", "17", "21", "25"], correct: 2 });
    expect(r.notes).toEqual([]);
  });

  it("keeps numbers inside a question and multi-line stems", () => {
    const r = parseQuestionsFromText(`1. Bir ədədin 3 mislinə 5 əlavə etsək
2 alarıq. Ədəd neçədir?
A) 1 B) 2 C) 3 D) 4
2. İkinci sual
A) a B) b
Cavab: B`);
    expect(r.questions).toHaveLength(2);
    expect(r.questions[0].text).toBe("Bir ədədin 3 mislinə 5 əlavə etsək 2 alarıq. Ədəd neçədir?");
    expect(r.questions[1].correct).toBe(1);
  });

  it("reads inline answers and a headless trailing key", () => {
    const r = parseQuestionsFromText(`1. Sual bir?
A) x B) y C) z
Düzgün cavab: C
2. Sual iki?
A) x B) y C) z
1-C 2-A`);
    expect(r.questions.map((q) => q.correct)).toEqual([2, 0]);
  });

  it("flags missing key and missing options", () => {
    const r = parseQuestionsFromText(`1. Yalnız mətn
2. Variantlı
A) 1 B) 2`);
    expect(r.questions[0].options).toEqual([]);
    expect(r.questions[1].correct).toBeNull();
    expect(r.notes.length).toBeGreaterThan(1);
  });

  it("returns a note when nothing is found", () => {
    const r = parseQuestionsFromText("salam dünya");
    expect(r.questions).toEqual([]);
    expect(r.notes[0]).toMatch(/Sual tapılmadı/);
  });
});
