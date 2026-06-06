export const Colors = {
  bg:       '#0c0a06',
  bg2:      '#131009',
  bg3:      '#1c1710',
  card:     '#18140d',
  border:   'rgba(212,160,60,0.15)',
  gold:     '#d4a03c',
  gold2:    '#f0c060',
  goldDim:  'rgba(212,160,60,0.08)',
  red:      '#c0392b',
  green:    '#27ae60',
  text:     '#f5ead8',
  muted:    '#8a7a60',
  radius:   18,
  navH:     68,
} as const;

export type ColorKey = keyof typeof Colors;
