import release_en_1_33 from 'Help/Releases/en/1.33.md';
import tip_en_getting_started from 'Help/Tips/en/getting-started.md';
import tip_en_daily_notes from 'Help/Tips/en/daily-notes.md';
import tip_en_mobile_tips from 'Help/Tips/en/mobile-tips.md';

const RELEASES = {
    en: {
        '1.33': release_en_1_33
    }
} as const;

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
 * @param version The tag name of the release to get the release note for.
 * @returns Release content, or null.
 */
export function getRelease(version: string, language = 'en'): string | null {
    const lang = language in RELEASES ? (language as keyof typeof RELEASES) : 'en';
    const releases = RELEASES[lang];

    return (releases as Record<string, string>)[version]
        ?? (RELEASES.en as Record<string, string>)[version]
        ?? null;
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