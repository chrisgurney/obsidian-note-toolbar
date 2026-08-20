import tip_en_daily_notes from 'Help/Tips/en/daily-notes.md';
import tip_en_getting_started from 'Help/Tips/en/getting-started.md';
import tip_en_mobile_tips from 'Help/Tips/en/mobile-tips.md';
import { CURRENT_RELEASE } from 'version';

const TIPS = {
    en: {
        'getting-started': tip_en_getting_started,
        'daily-notes': tip_en_daily_notes,
        'mobile-tips': tip_en_mobile_tips
    }
} as const;

/**
 * Returns the release note for a specific release.
 *
 * @returns Release content, or null.
 */
export function getRelease(): string {
    return CURRENT_RELEASE;
}

/**
 * Returns the provided tip.
 *
 * @param filename The name of the Tip to return, without the extension.
 * @returns Tip content, or null.
 */
export function getTip(id: string, language = 'en'): string | null {
    const lang = language in TIPS ? (language as keyof typeof TIPS) : 'en';
    const tips = TIPS[lang];

    const key = id.replace(/\.md$/, '');

    return (tips as Record<string, string>)[key]
        ?? (TIPS.en as Record<string, string>)[key]
        ?? null;
}