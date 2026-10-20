// Dev-only role switch for the prototype (task 1.7). NEXT_PUBLIC_DEV_ROLE_SWITCH is inlined at build time, so when it is
// unset the switch is dead code and compiled out. It never grants access: authorisation lives in RLS and server code.
export const devRoleSwitchEnabled = process.env.NEXT_PUBLIC_DEV_ROLE_SWITCH === "1";

export type Portal = "patient" | "professional" | "admin";
export const portals: Portal[] = ["patient", "professional", "admin"];
