const baseColors = {
  black: '#030712',
  white: '#f9fafb',
  grayLighter: '#f3f4f6',
  grayLight: '#d1d5db',
  gray: '#4b5563',
  grayDark: '#374151',
  grayDarker: '#1f2937',
  blue: '#1d4ed8',
  yellow: '#ca8a04',
  green: '#15803d',
  purple: '#7e22ce',
  pink: '#be185d',
  teal: '#0f766e',
  cyan: '#0e7490',
  red: '#b91c1c',
}

const Color = {
  ...baseColors,
  primary: '#eab308',
  secondary: '#2563eb',
  textColor: baseColors.black,
  textMuted: '#6b7280',
  textHint: '#9ca3af',
  borderColor: '#e5e7eb',
  borderColorGray: '#9ca3af',
}

export default Color

export function colorYiq(hex) {
  var r = parseInt(hex.substr(1, 2), 16),
      g = parseInt(hex.substr(3, 2), 16),
      b = parseInt(hex.substr(5, 2), 16),
      yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 196) ? Color.black : Color.white;
}