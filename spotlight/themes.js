/**
 * Card themes.
 *
 * Five distinct directions over one set of markup, so the layout is written
 * once and a theme only changes surface: palette, ornament, composition.
 * Pick one with --theme=<key>; out/designs.html renders all of them side by
 * side on the same person so they can be compared properly.
 *
 * Each theme overrides the base rules in build-spotlights.js under a
 * .card--<key> class.
 */
"use strict";

const THEMES = {

  // ---------------------------------------------------------------------
  // The original. Deep navy, blue and gold glows, outlined 27.
  // ---------------------------------------------------------------------
  navy: {
    label: "Navy — the house style",
    note: "Matches the Invitational site exactly.",
    css: ""   // base styles are already the navy treatment
  },

  // ---------------------------------------------------------------------
  // Gallery invitation: ivory stock, ink serif, bronze foil. The one that
  // looks least like a social graphic and most like something printed.
  // ---------------------------------------------------------------------
  ivory: {
    label: "Ivory — gallery invitation",
    note: "Light stock, ink serif, bronze foil. Stands out in a dark feed.",
    css: `
  .card--ivory { color: #17222B;
    background: linear-gradient(168deg, #FCF9F3 0%, #F4ECDD 54%, #EDE2CE 100%); }
  .card--ivory .glow {
    background:
      radial-gradient(54% 46% at 88% 4%, rgba(168,129,47,.16) 0%, transparent 70%),
      radial-gradient(46% 44% at 2% 100%, rgba(18,48,79,.10) 0%, transparent 72%),
      radial-gradient(120% 100% at 50% 50%, transparent 52%, rgba(120,98,62,.12) 100%); }
  .card--ivory .grain { opacity: .14; mix-blend-mode: multiply; }
  .card--ivory .numeral { -webkit-text-stroke: 2px rgba(18,48,79,.085); }
  .card--ivory .frame { border-color: rgba(18,48,79,.16); }
  .card--ivory .frame::before, .card--ivory .frame::after { border-color: #A8812F; }
  .card--ivory .kicker {
    background: linear-gradient(92deg, #C29A47 0%, #7A5A1C 52%, #C29A47 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .card--ivory .eyebrow { color: #0C6256; }
  .card--ivory .name { color: #0F1A24; text-shadow: none; }
  .card--ivory .dash { background: linear-gradient(90deg, #A8812F 0%, rgba(168,129,47,0) 100%); }
  .card--ivory .title { color: #4C5C68; }
  .card--ivory .company { color: #0C6256; }
  .card--ivory .quote { color: #2A3842; border-left-color: #A8812F; }
  .card--ivory .rule { background: linear-gradient(90deg, rgba(18,48,79,.38), rgba(18,48,79,0)); }
  .card--ivory .when { color: #0F1A24; }
  .card--ivory .where { color: #6E7C88; }
  .card--ivory .badge { color: #7A5A1C; border-color: rgba(168,129,47,.55); }`
  },

  // ---------------------------------------------------------------------
  // Golf heritage: deep fairway green and gold. The most "club" of the set,
  // and the most obviously about golf without a single golf cliché on it.
  // ---------------------------------------------------------------------
  emerald: {
    label: "Emerald — club heritage",
    note: "Fairway green and gold. Reads as a golf club without any clipart.",
    css: `
  .card--emerald { color: #F6F2E6;
    background: linear-gradient(168deg, #0B4430 0%, #06281C 50%, #021510 100%); }
  .card--emerald .glow {
    background:
      radial-gradient(54% 46% at 86% 4%, rgba(106,201,146,.22) 0%, transparent 70%),
      radial-gradient(46% 44% at 2% 100%, rgba(212,170,86,.26) 0%, transparent 72%),
      radial-gradient(120% 100% at 50% 50%, transparent 46%, rgba(1,10,7,.66) 100%); }
  .card--emerald .numeral { -webkit-text-stroke: 2px rgba(222,189,120,.10); }
  .card--emerald .frame { border-color: rgba(222,189,120,.26); }
  .card--emerald .frame::before, .card--emerald .frame::after { border-color: rgba(222,189,120,.92); }
  .card--emerald .kicker {
    background: linear-gradient(92deg, #EBD69B 0%, #C09A4C 52%, #EBD69B 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .card--emerald .eyebrow { color: #93D7AE; }
  .card--emerald .dash { background: linear-gradient(90deg, #EBD69B 0%, #C09A4C 70%, rgba(192,154,76,0) 100%); }
  .card--emerald .title { color: #C8D8CB; }
  .card--emerald .company { color: #9FDCB8; }
  .card--emerald .quote { border-left-color: rgba(222,189,120,.85); color: #E8F0E9; }
  .card--emerald .rule { background: linear-gradient(90deg, rgba(222,189,120,.8), rgba(222,189,120,0)); }
  .card--emerald .where { color: #8FA897; }
  .card--emerald .badge { color: #EBD69B; border-color: rgba(222,189,120,.46); }`
  },

  // ---------------------------------------------------------------------
  // Las Vegas, done properly: symmetrical deco composition, gold linework,
  // everything centred. The only theme that changes the layout rather than
  // just the palette.
  // ---------------------------------------------------------------------
  deco: {
    label: "Deco — Las Vegas",
    note: "Symmetrical, centred, gold linework. The most formal of the five.",
    css: `
  .card--deco { color: #F7F3EA; padding: 96px 110px 88px;
    background: linear-gradient(168deg, #16121C 0%, #0C0A12 52%, #060509 100%); }
  .card--deco .glow {
    background:
      radial-gradient(60% 50% at 50% -6%, rgba(231,199,127,.20) 0%, transparent 72%),
      radial-gradient(70% 46% at 50% 106%, rgba(231,199,127,.13) 0%, transparent 74%),
      radial-gradient(120% 100% at 50% 50%, transparent 44%, rgba(3,2,6,.72) 100%); }
  .card--deco .numeral { display: none; }

  /* A double rule rather than a single hairline — deco is about repetition. */
  .card--deco .frame { inset: 36px; border-color: rgba(231,199,127,.42);
    box-shadow: inset 0 0 0 7px rgba(10,8,14,.9), inset 0 0 0 8px rgba(231,199,127,.22); }
  .card--deco .frame::before, .card--deco .frame::after { width: 40px; height: 40px;
    border-width: 2px; border-color: rgba(231,199,127,.95); }

  .card--deco .card-top { justify-content: center; gap: 22px; }
  .card--deco .mark { order: -1; width: 54px; height: 54px; }
  .card--deco .kicker { font-size: 18px; letter-spacing: 7px; }

  .card--deco .card-body { align-items: center; text-align: center;
    max-width: none; padding-top: 30px; }
  .card--deco .eyebrow { letter-spacing: 6px; color: #e7c77f; }
  .card--deco .name { font-size: 96px; letter-spacing: -1.4px; }
  .card--deco .dash { width: 240px; margin: 36px auto 0;
    background: linear-gradient(90deg, rgba(231,199,127,0), #e7c77f 50%, rgba(231,199,127,0)); }
  .card--deco .company { color: #e7c77f; font-size: 36px; letter-spacing: 2.4px;
    text-transform: uppercase; font-weight: 700; }
  .card--deco .title { color: #cbbfae; }
  .card--deco .quote { border-left: 0; padding: 0; max-width: 820px; }

  .card--deco .rule { background: linear-gradient(90deg,
    rgba(231,199,127,0), rgba(231,199,127,.75) 50%, rgba(231,199,127,0)); }
  .card--deco .foot-row { flex-direction: column; gap: 18px; text-align: center; }
  .card--deco .where { color: #9b9289; }
  .card--deco .badge { border-color: rgba(231,199,127,.5); color: #e7c77f; }`
  },

  // ---------------------------------------------------------------------
  // Everything stripped out: no frame, no watermark, no glow. One enormous
  // name and a single gold mark. Confidence as a design device.
  // ---------------------------------------------------------------------
  mono: {
    label: "Mono — stripped back",
    note: "No frame, no watermark. Just the name, very large. Most modern.",
    css: `
  .card--mono { color: #FFFFFF; background: #101114; padding: 96px 100px 88px; }
  .card--mono .glow { background:
    radial-gradient(90% 70% at 50% 120%, rgba(255,255,255,.055) 0%, transparent 70%); }
  .card--mono .grain { opacity: .05; }
  .card--mono .numeral, .card--mono .frame { display: none; }

  .card--mono .kicker { background: none; color: #7E848E;
    -webkit-text-fill-color: #7E848E; letter-spacing: 4.6px; font-size: 17px; }
  .card--mono .mark { opacity: .55; width: 56px; height: 56px; }

  .card--mono .card-body { max-width: 940px; padding-top: 0; }
  .card--mono .eyebrow { color: #6F7681; letter-spacing: 3.6px; font-size: 16px; }
  .card--mono .name { font-family: 'Manrope', sans-serif; font-weight: 800;
    font-size: 126px; line-height: .94; letter-spacing: -5px; text-shadow: none; }
  .card--mono .dash { width: 58px; height: 4px; margin-top: 40px; background: #E7C77F; }
  .card--mono .title { color: #A7AEB8; }
  .card--mono .company { color: #FFFFFF; font-weight: 600; font-size: 38px;
    letter-spacing: -.4px; }
  .card--mono .quote { border-left-color: #E7C77F; color: #D7DCE3;
    font-family: 'Manrope', sans-serif; font-style: normal; font-size: 30px; }

  .card--mono .rule { background: rgba(255,255,255,.14); }
  .card--mono .where { color: #7E848E; }
  .card--mono .badge { border-color: rgba(255,255,255,.22); color: #C9CED6; }`
  }
};

const THEME_KEYS = Object.keys(THEMES);
const ALL_THEME_CSS = THEME_KEYS.map((k) => THEMES[k].css).filter(Boolean).join("\n");

module.exports = { THEMES, THEME_KEYS, ALL_THEME_CSS };
