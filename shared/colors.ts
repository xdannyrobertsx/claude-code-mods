/**
 * The palette every mod draws with. Pass a value anywhere a `color`, `borderColor` or
 * `backgroundColor` prop takes one: `<Text color={colors.gold}>`.
 *
 * These are fixed hex values built for a dark background (`background`, #14161b), so unlike
 * Claude Code's theme keys (`suggestion`, `claude`, …) they don't change with a light or dark
 * theme, and most of them read poorly on a light one.
 */
export const colors = {
  // Base
  background: '#14161b',
  foreground: '#e0e2ea',
  foregroundDim: '#eef1f8',

  // Semantic
  /** Success, highlight, cursor. */
  gold: '#ffcc00',
  /** Error, critical, accent. */
  red: '#f54e5c',
  /** Soft warning, git branch. */
  pink: '#ed8796',
  /** OK, runtimes, git status. */
  green: '#a6da95',
  /** Paths, navigation. */
  sky: '#91d7e3',
  /** Secondary accent, info. */
  sapphire: '#7dc4e4',
  /** Tertiary info. */
  blue: '#a6dbff',

  // Neutrals
  /** Selection, bright black. */
  selection: '#4f5258',
  nearBlack: '#07080d',
} as const

export type ColorName = keyof typeof colors
