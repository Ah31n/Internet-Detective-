import { DarkTheme } from 'expo-router';

import { palette } from './tokens';

export const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.brass,
    background: palette.ink,
    card: palette.inkSoft,
    text: palette.white,
    border: palette.line,
    notification: palette.rust,
  },
};
