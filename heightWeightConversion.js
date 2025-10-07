// ------------------------------
// Helpers
// ------------------------------
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ------------------------------
// Height (0..127)  <->  feet/inches
// Calibrated so height=64 -> 67 inches exactly.
// Range: 36" (3'0") .. 84" (7'0").
// ------------------------------
const HEIGHT_MIN_IN = 36;
const HEIGHT_MAX_IN = 84;
const HEIGHT_RANGE_IN = HEIGHT_MAX_IN - HEIGHT_MIN_IN;

// Calibration target: slider mid (64) should be 67"
const HEIGHT_MID_SLIDER = 64;
const HEIGHT_MID_IN = 67;

// Compute exponent k so that x0^k = y0 (bias curve, invertible)
const x0 = HEIGHT_MID_SLIDER / 127;                       // ~0.50394
const y0 = (HEIGHT_MID_IN - HEIGHT_MIN_IN) / HEIGHT_RANGE_IN; // 31/48 ≈ 0.64583
const HEIGHT_EXP = Math.log(y0) / Math.log(x0);           // ≈ 0.638 (computed once)

/** 0..127 -> { feet, inches, totalInches } */
function miiHeightToFeetInches(heightValue) {
  const hv = clamp(heightValue | 0, 0, 127);
  const x = hv / 127;
  const s = Math.pow(x, HEIGHT_EXP); // calibrated bias
  const inches = HEIGHT_MIN_IN + s * HEIGHT_RANGE_IN;

  const totalInches = Math.round(inches);
  const feet = Math.floor(totalInches / 12);
  const inchesR = totalInches % 12;

  return { feet, inches: inchesR, totalInches };
}

/** inches -> 0..127 (inverse of the calibrated mapping) */
function inchesToMiiHeight(targetInches) {
  const y = clamp((targetInches - HEIGHT_MIN_IN) / HEIGHT_RANGE_IN, 0, 1);
  const x = Math.pow(y, 1 / HEIGHT_EXP);
  return Math.round(x * 127);
}

// ------------------------------
// Weight (0..127) + height(0..127)  <->  pounds
// Baseline by BMI; composition slider is nonlinear & invertible.
// Center (64) -> multiplier 1.0.
// ------------------------------
const BMI_AVG = 23.5;      // gives ~150 lb at 67"
const WEIGHT_SPREAD = 0.35; // ±35% around baseline at extremes
const WEIGHT_GAMMA = 1.6;   // steeper near ends, softer center

/** weight slider + height slider -> pounds */
function miiWeightToPounds(weightValue, heightValue) {
  const wv = clamp(weightValue | 0, 0, 127);
  const hv = clamp(heightValue | 0, 0, 127);

  // Height in inches using the calibrated mapping
  const { totalInches: H } = miiHeightToFeetInches(hv);

  // BMI baseline
  const base = (BMI_AVG * H * H) / 703;

  // Nonlinear symmetric multiplier around 1.0 (64 -> 0 offset)
  const d = clamp((wv - 64) / 63, -1, 1);
  const multiplier = 1 + Math.sign(d) * WEIGHT_SPREAD * Math.pow(Math.abs(d), WEIGHT_GAMMA);

  return Math.round(base * multiplier);
}

/** pounds + height slider -> weight slider (inverse of above) */
function poundsToMiiWeight(pounds, heightValue) {
  const hv = clamp(heightValue | 0, 0, 127);
  const { totalInches: H } = miiHeightToFeetInches(hv);
  const base = (BMI_AVG * H * H) / 703;

  // Guard against tiny numeric drift outside the spread
  const mult = clamp(pounds / base, 1 - WEIGHT_SPREAD * 1.0001, 1 + WEIGHT_SPREAD * 1.0001);

  let d;
  if (Math.abs(mult - 1) < 1e-9) {
    d = 0;
  } else if (mult > 1) {
    d = Math.pow((mult - 1) / WEIGHT_SPREAD, 1 / WEIGHT_GAMMA);
  } else {
    d = -Math.pow((1 - mult) / WEIGHT_SPREAD, 1 / WEIGHT_GAMMA);
  }

  const wv = Math.round(64 + 63 * clamp(d, -1, 1));
  return clamp(wv, 0, 127);
}

// ------------------------------
// Quick checks (should match your expectations)
// ------------------------------
// Average points
// console.log(miiHeightToFeetInches(64), miiWeightToPounds(64, 64)); // ~5'7", ~150 lb
// Extremes
// console.log(miiHeightToFeetInches(0),   miiWeightToPounds(0, 0));       // 3'0",  ~28 lb
// console.log(miiHeightToFeetInches(127), miiWeightToPounds(127, 127));   // 7'0", ~318 lb
// Inverses
// const h = miiHeightToFeetInches(64);
// console.log(inchesToMiiHeight(h.totalInches)); // ~64
// const lbs = miiWeightToPounds(96, 64);
// console.log(lbs);                              // ~135
// console.log(poundsToMiiWeight(lbs, 64));       // ~96


// ------------------------------
// Quick sanity checks
// ------------------------------
// Average points
console.log(miiHeightToFeetInches(64), miiWeightToPounds(64, 64)); // ~5'0", ~150 lb
// // Extremes
console.log(miiHeightToFeetInches(0), miiWeightToPounds(0, 0));//3'0, 28 lb
console.log(miiHeightToFeetInches(127), miiWeightToPounds(127, 127));//7'0 318 lb
// // Inverses
const h = miiHeightToFeetInches(64);
console.log(inchesToMiiHeight(h.totalInches)); // ~64
const lbs = miiWeightToPounds(96, 64);
console.log(lbs);//168
console.log(poundsToMiiWeight(lbs, 64)); // ~96
