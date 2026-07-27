import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const content = JSON.parse(fs.readFileSync(path.join(root, "data", "product-content.json"), "utf8"));
const products = content.products || [];
const guide = content.scentGuide || {};
const questions = guide.questions || [];
const errors = [];
const fail = (message) => errors.push(message);

const byQuestion = new Map(questions.map((question) => [question.id, question]));
const getOption = (questionId, optionId) => byQuestion.get(questionId)?.options?.find((option) => option.id === optionId);

function bestDimensionMatch(product, dimension, weights, matched) {
  if (!weights || typeof weights !== "object") return 0;
  const values = dimension === "collection" ? [product.collection] : Array.isArray(product[dimension]) ? product[dimension] : [];
  let best = 0;
  for (const value of values) {
    const points = Number(weights[value] || 0);
    if (points > 0) {
      matched[dimension].push(value);
      best = Math.max(best, points);
    }
  }
  return best;
}

function scoreOption(product, questionId, option) {
  const rule = option?.score || {};
  const matched = { character: [], mood: [], room: [], collection: [], exactRoom: false, intensity: false };
  let positive = 0;
  let penalties = 0;
  for (const dimension of ["character", "mood", "room", "collection"]) {
    positive += bestDimensionMatch(product, dimension, rule[dimension], matched);
  }
  for (const scaleRule of rule.scales || []) {
    const value = product.scales?.[scaleRule.key];
    if (typeof value !== "number") continue;
    const aboveMin = typeof scaleRule.min !== "number" || value >= scaleRule.min;
    const belowMax = typeof scaleRule.max !== "number" || value <= scaleRule.max;
    const points = aboveMin && belowMax ? Number(scaleRule.points || 0) : Number(scaleRule.otherwise || 0);
    if (points >= 0) positive += points;
    else penalties += points;
  }
  if (rule.targetScale) {
    const target = rule.targetScale;
    const value = product.scales?.[target.key];
    if (typeof value === "number") {
      const distance = Math.abs(value - Number(target.target));
      const points = distance < (target.pointsByDistance || []).length
        ? Number(target.pointsByDistance[distance] || 0)
        : Number(target.farPenalty || 0);
      if (points >= 0) {
        positive += points;
        matched.intensity = points > 0;
      } else penalties += points;
    }
  }
  if (questionId === "room") {
    const exactRoom = option.id !== "kitchen" && (product.room || []).includes(option.id);
    matched.exactRoom = exactRoom;
    if (option.id !== "kitchen" && !exactRoom) penalties += Number(rule.roomMismatchPenalty || 0);
    if ((product.guide?.avoidRooms || []).includes(option.id)) penalties += Number(rule.avoidRoomPenalty || -10);
  }
  return {
    score: Math.min(positive, Number(rule.cap ?? positive)) + penalties,
    maxScore: Number(rule.cap || 0),
    matched
  };
}

function rank(answers) {
  const scored = products.map((product, index) => {
    let score = 0;
    let maxScore = 0;
    let exactRoom = false;
    let moodMatches = 0;
    let characterMatches = 0;
    for (const question of questions) {
      const option = getOption(question.id, answers[question.id]);
      const result = scoreOption(product, question.id, option);
      score += result.score;
      maxScore += result.maxScore;
      exactRoom ||= result.matched.exactRoom;
      moodMatches += new Set(result.matched.mood).size;
      characterMatches += new Set(result.matched.character).size;
    }
    return {
      product,
      index,
      score,
      percent: maxScore ? Math.max(0, Math.min(100, Math.round((score / maxScore) * 100))) : 0,
      exactRoom,
      moodMatches,
      characterMatches
    };
  });
  scored.sort((a, b) => b.score - a.score || Number(b.exactRoom) - Number(a.exactRoom) || b.moodMatches - a.moodMatches || b.characterMatches - a.characterMatches || a.index - b.index);
  return scored;
}

function combinations(arrays, prefix = [], output = []) {
  if (!arrays.length) {
    output.push(prefix);
    return output;
  }
  for (const value of arrays[0]) combinations(arrays.slice(1), [...prefix, value], output);
  return output;
}

if (questions.length !== 5) fail(`expected 5 guide questions, found ${questions.length}`);
const expectedIds = ["atmosphere", "room", "composition", "intensity", "space"];
if (JSON.stringify(questions.map((question) => question.id)) !== JSON.stringify(expectedIds)) fail("guide question order drifted");

const optionSets = questions.map((question) => question.options.map((option) => option.id));
const matrix = combinations(optionSets);
if (matrix.length !== Number(guide.verification?.matrixProfiles || 0)) fail(`profile matrix is ${matrix.length}, expected ${guide.verification?.matrixProfiles}`);

const top3Counts = new Map(products.map((product) => [product.id, 0]));
const roomStats = new Map(["living-room", "bedroom", "bathroom", "hallway", "office"].map((room) => [room, { total: 0, exact: 0 }]));
const intensityStats = new Map(["light", "moderate", "rich"].map((value) => [value, { total: 0, aligned: 0 }]));
let kitchenProfiles = 0;

for (const values of matrix) {
  const answers = Object.fromEntries(questions.map((question, index) => [question.id, values[index]]));
  const ranked = rank(answers);
  if (ranked.length !== products.length) fail("ranking lost products");
  for (const result of ranked.slice(0, 3)) {
    top3Counts.set(result.product.id, top3Counts.get(result.product.id) + 1);
    if (!(result.percent >= 0 && result.percent <= 100)) fail(`${result.product.id}: invalid match percent ${result.percent}`);
  }
  const top = ranked[0].product;
  if (roomStats.has(answers.room)) {
    const stat = roomStats.get(answers.room);
    stat.total += 1;
    if ((top.room || []).includes(answers.room)) stat.exact += 1;
  }
  const intensity = top.scales?.intensity;
  const intensityStat = intensityStats.get(answers.intensity);
  intensityStat.total += 1;
  const aligned = answers.intensity === "light" ? intensity <= 7 : answers.intensity === "moderate" ? intensity >= 5 && intensity <= 8 : intensity >= 7;
  if (aligned) intensityStat.aligned += 1;
  if (answers.room === "kitchen") {
    kitchenProfiles += 1;
    for (const result of ranked.slice(0, 3)) {
      if ((result.product.guide?.avoidRooms || []).includes("kitchen")) fail(`${result.product.id}: forbidden kitchen recommendation reached top 3`);
    }
  }
}

for (const [productId, count] of top3Counts) if (!count) fail(`${productId}: never appears in the top 3 across the full profile matrix`);
for (const [room, stat] of roomStats) {
  const rate = stat.exact / stat.total;
  if (rate < 0.85) fail(`${room}: exact-room top recommendation rate too low (${(rate * 100).toFixed(1)}%)`);
}
for (const [value, stat] of intensityStats) {
  const rate = stat.aligned / stat.total;
  if (rate < 0.8) fail(`${value}: intensity alignment rate too low (${(rate * 100).toFixed(1)}%)`);
}

for (const profile of guide.verification?.goldenProfiles || []) {
  const top = rank(profile.answers)[0]?.product?.id;
  if (!profile.expectedTop.includes(top)) fail(`golden profile expected ${profile.expectedTop.join("/")}, received ${top}`);
}

const guideJs = fs.readFileSync(path.join(root, "js", "scent-guide.js"), "utf8");
if (/92% збіг|86% збіг|79% збіг/.test(guideJs)) fail("fake fixed guide percentages remain in scent-guide.js");
if (!guideJs.includes("window.VA_SCENT_GUIDE")) fail("scent-guide.js does not use the central guide config");

if (errors.length) {
  console.error("Scent guide verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  release: content.release,
  profilesTested: matrix.length,
  kitchenProfiles,
  everyProductAppearsInTop3: true,
  exactRoomTopRate: Object.fromEntries([...roomStats].map(([key, value]) => [key, Number((value.exact / value.total * 100).toFixed(1))])),
  intensityAlignmentRate: Object.fromEntries([...intensityStats].map(([key, value]) => [key, Number((value.aligned / value.total * 100).toFixed(1))]))
}, null, 2));
