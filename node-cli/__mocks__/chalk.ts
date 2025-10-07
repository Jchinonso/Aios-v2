/**
 * Mock chalk for Jest tests
 */

const identity = (str: string) => str;

const chalk = {
  gray: identity,
  blue: identity,
  green: identity,
  yellow: identity,
  red: identity,
  cyan: identity,
  magenta: identity,
  white: identity,
  bold: identity,
  dim: identity,
};

export default chalk;
