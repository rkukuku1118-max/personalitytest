import { useMemo, useState } from "react";
import { TESTS, type Norm, type TestDefinition, type TestId } from "./data/tests";

type Answers = Record<number, number>;
type AnswersByTest = Record<TestId, Answers>;

type FacetScore = {
  id: string;
  label: string;
  score: number;
  answered: number;
  total: number;
  norm?: Norm;
  z?: number;
};

type DomainScore = {
  id: string;
  label: string;
  score: number;
  answered: number;
  total: number;
  norm?: Norm;
  z?: number;
  facets: FacetScore[];
};

const TEST_IDS: TestId[] = ["100", "60"];

const INITIAL_ANSWERS: AnswersByTest = {
  "60": {},
  "100": {},
};

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreAnswer(answer: number | undefined, reverse: boolean) {
  if (!answer) return undefined;
  return reverse ? 6 - answer : answer;
}

function formatScore(value: number) {
  return value.toFixed(2);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function zScore(score: number, norm?: Norm) {
  if (!norm) return undefined;
  return (score - norm.mean) / norm.sd;
}

function interpretation(z?: number) {
  if (z === undefined) return undefined;
  if (z >= 1) return "高め";
  if (z >= 0.35) return "やや高め";
  if (z <= -1) return "低め";
  if (z <= -0.35) return "やや低め";
  return "平均付近";
}

function scoreInterpretation(score: number) {
  if (score >= 4) return "高い";
  if (score >= 3.35) return "やや高い";
  if (score <= 2) return "低い";
  if (score <= 2.65) return "やや低い";
  return "平均的";
}

function scoreProgress(answered: number, total: number, z?: number) {
  if (answered !== total) return `${answered}/${total}`;
  return interpretation(z) ?? "参考値";
}

function evaluationText(score: number, z?: number) {
  return interpretation(z) ?? scoreInterpretation(score);
}

function evaluationTone(score: number, z?: number) {
  if (z === undefined) {
    if (score >= 3.35) return "high";
    if (score <= 2.65) return "low";
    return "average";
  }
  if (z >= 0.35) return "high";
  if (z <= -0.35) return "low";
  return "average";
}

function calculateScores(test: TestDefinition, answers: Answers): DomainScore[] {
  return test.domains.map((domain) => {
    const facets = domain.facets.map((facet) => {
      const scoredItems = facet.items
        .map((item) => scoreAnswer(answers[item.number], item.reverse))
        .filter((value): value is number => value !== undefined);
      const score = mean(scoredItems);
      const norm = test.norms.facets[facet.id];

      return {
        id: facet.id,
        label: facet.label,
        score,
        answered: scoredItems.length,
        total: facet.items.length,
        norm,
        z: scoredItems.length === facet.items.length ? zScore(score, norm) : undefined,
      };
    });

    const domainItems = domain.facets.flatMap((facet) => facet.items);
    const scoredItems = domainItems
      .map((item) => scoreAnswer(answers[item.number], item.reverse))
      .filter((value): value is number => value !== undefined);
    const score = mean(scoredItems);
    const norm = test.norms.domains[domain.id];

    return {
      id: domain.id,
      label: domain.label,
      score,
      answered: scoredItems.length,
      total: domainItems.length,
      norm,
      z: scoredItems.length === domainItems.length ? zScore(score, norm) : undefined,
      facets,
    };
  });
}

function buildDemoAnswers(test: TestDefinition): Answers {
  return Object.fromEntries(
    test.questions.map((question) => {
      const value = ((question.id * 7) % 5) + 1;
      return [question.id, value];
    }),
  );
}

function App() {
  const [activeTestId, setActiveTestId] = useState<TestId>("100");
  const [answersByTest, setAnswersByTest] = useState<AnswersByTest>(INITIAL_ANSWERS);
  const [questionIndex, setQuestionIndex] = useState(0);

  const activeTest = TESTS[activeTestId];
  const answers = answersByTest[activeTestId];
  const currentQuestion = activeTest.questions[questionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / activeTest.questions.length) * 100;
  const isComplete = answeredCount === activeTest.questions.length;

  const scores = useMemo(() => calculateScores(activeTest, answers), [activeTest, answers]);
  const completeDomainCount = scores.filter((score) => score.answered === score.total).length;

  function updateAnswer(questionId: number, value: number) {
    setAnswersByTest((current) => ({
      ...current,
      [activeTestId]: {
        ...current[activeTestId],
        [questionId]: value,
      },
    }));

    if (questionIndex < activeTest.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
    }
  }

  function switchTest(testId: TestId) {
    setActiveTestId(testId);
    setQuestionIndex(0);
  }

  function jumpToNextMissing() {
    const nextMissing = activeTest.questions.findIndex((question) => !answers[question.id]);
    if (nextMissing >= 0) setQuestionIndex(nextMissing);
  }

  function clearAnswers() {
    setAnswersByTest((current) => ({
      ...current,
      [activeTestId]: {},
    }));
    setQuestionIndex(0);
  }

  function fillDemoAnswers() {
    setAnswersByTest((current) => ({
      ...current,
      [activeTestId]: buildDemoAnswers(activeTest),
    }));
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">HEXACO-PI-R self-report PoC</p>
            <h1>HEXACO性格テスト</h1>
          </div>
          <div className="test-switch" aria-label="テスト種別">
            {TEST_IDS.map((testId) => (
              <button
                key={testId}
                className={testId === activeTestId ? "is-active" : ""}
                type="button"
                onClick={() => switchTest(testId)}
              >
                {TESTS[testId].label}
              </button>
            ))}
          </div>
        </header>

        <section className="status-band" aria-label="回答状況">
          <div>
            <span className="status-value">
              {answeredCount}/{activeTest.questions.length}
            </span>
            <span className="status-label">回答済み</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <button type="button" className="ghost-button" onClick={jumpToNextMissing} disabled={isComplete}>
            次の未回答
          </button>
        </section>

        <div className="main-grid">
          <section className="question-panel" aria-labelledby="question-heading">
            <div className="question-meta">
              <span>Q{currentQuestion.id}</span>
              <span>{activeTest.label}</span>
            </div>
            <h2 id="question-heading">{currentQuestion.text}</h2>
            <div className="answer-grid" role="radiogroup" aria-label="回答">
              {activeTest.responseOptions.map((label, index) => {
                const value = index + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    className={answers[currentQuestion.id] === value ? "answer-option is-selected" : "answer-option"}
                    onClick={() => updateAnswer(currentQuestion.id, value)}
                    aria-pressed={answers[currentQuestion.id] === value}
                  >
                    <span className="answer-number">{value}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="question-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                disabled={questionIndex === 0}
              >
                前へ
              </button>
              <div className="question-dots" aria-label="質問ナビゲーション">
                {activeTest.questions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    className={[
                      index === questionIndex ? "is-current" : "",
                      answers[question.id] ? "is-answered" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`質問${question.id}`}
                    onClick={() => setQuestionIndex(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => setQuestionIndex((index) => Math.min(activeTest.questions.length - 1, index + 1))}
                disabled={questionIndex === activeTest.questions.length - 1}
              >
                次へ
              </button>
            </div>
          </section>

          <aside className="results-panel" aria-label="結果">
            <div className="result-summary">
              <span className="pill">{isComplete ? "集計完了" : "回答中"}</span>
              <h2>性格特性スコア</h2>
              <strong>{isComplete ? `${completeDomainCount}/${scores.length}` : `${Math.round(progress)}%`}</strong>
              <p>
                {isComplete
                  ? "各因子と下位尺度の5段階平均を一覧できます。"
                  : "回答に応じて因子と下位尺度の進捗が更新されます。"}
              </p>
            </div>

            <section className="domain-list" aria-label="因子と下位尺度のスコア">
              <h3>因子と下位尺度</h3>
              <div className="domain-stack">
                {scores.map((domain) => (
                  <DomainScoreBlock key={domain.id} domain={domain} />
                ))}
              </div>
            </section>

            <div className="utility-actions">
              <button type="button" className="secondary-button" onClick={fillDemoAnswers}>
                デモ入力
              </button>
              <button type="button" className="danger-button" onClick={clearAnswers} disabled={answeredCount === 0}>
                クリア
              </button>
            </div>

            <p className="source-note">
              質問文と採点情報は変換済みJSONを参照しています。心理・医療上の診断ではありません。
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

type DomainScoreBlockProps = {
  domain: DomainScore;
};

function DomainScoreBlock({ domain }: DomainScoreBlockProps) {
  const complete = domain.answered === domain.total;

  return (
    <article className="domain-block">
      <div className="domain-header">
        <div>
          <h4>{domain.label}</h4>
          <span>{scoreProgress(domain.answered, domain.total, domain.z)}</span>
        </div>
        <strong>{complete ? formatScore(domain.score) : "--"}</strong>
      </div>
      <div className="score-bar" aria-hidden="true">
        <span style={{ width: `${complete ? clampPercent((domain.score / 5) * 100) : 0}%` }} />
      </div>
      <div className="facet-grid" aria-label={`${domain.label}の下位尺度`}>
        {domain.facets.map((facet) => (
          <ScoreRow
            key={facet.id}
            label={facet.label}
            score={facet.score}
            complete={facet.answered === facet.total}
            answered={facet.answered}
            total={facet.total}
            evaluation={evaluationText(facet.score, facet.z)}
            tone={evaluationTone(facet.score, facet.z)}
          />
        ))}
      </div>
    </article>
  );
}

type ScoreRowProps = {
  label: string;
  score: number;
  complete: boolean;
  answered: number;
  total: number;
  evaluation: string;
  tone: string;
};

function ScoreRow({ label, score, complete, answered, total, evaluation, tone }: ScoreRowProps) {
  const width = complete ? clampPercent((score / 5) * 100) : 0;

  return (
    <article className="score-row">
      <div className="score-row-header">
        <span>{label}</span>
        <strong>{complete ? formatScore(score) : "--"}</strong>
      </div>
      <div className="score-bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
      <div className="score-row-meta">
        {complete ? (
          <span className={`score-evaluation is-${tone}`}>評価: {evaluation}</span>
        ) : (
          <small>回答: {answered}/{total}</small>
        )}
      </div>
    </article>
  );
}

export default App;
