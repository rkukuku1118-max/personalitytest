import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("src/data/test-definitions.json", "utf8"));

const expectedQuestionCounts = {
  "60": 60,
  "100": 100,
};

for (const [testId, test] of Object.entries(data)) {
  const expectedCount = expectedQuestionCounts[testId];

  if (!expectedCount) {
    throw new Error(`Unexpected test id: ${testId}`);
  }

  if (test.questions.length !== expectedCount) {
    throw new Error(`${testId}: expected ${expectedCount} questions, got ${test.questions.length}`);
  }

  const questionIds = new Set(test.questions.map((question) => question.id));

  for (const domain of test.domains) {
    for (const facet of domain.facets) {
      for (const item of facet.items) {
        if (!questionIds.has(item.number)) {
          throw new Error(`${testId}: scoring item ${item.number} is missing from questions`);
        }
      }
    }
  }
}

console.log("Data validation passed.");
