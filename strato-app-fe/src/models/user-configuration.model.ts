export interface IUserConfiguration {
  id?: string;
  username?: string;
  language: string; // e.g., 'en', 'cs', 'auto'
  theme: string;    // 'dark' | 'light' | 'auto'
  color: string;    // Accent color name
  backgroundType: string;
  radiusType: string;
  defaultFont: string;
  codeFont: string;
}