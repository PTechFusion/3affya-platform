// Moved to lib/otp.ts (shared with patient sign-in, screen 18). Kept so the claim flow's imports stay as they were.
export { checkCode, codeDigits, prototypeWrongCode, type CodeProblem } from "@/lib/otp";
