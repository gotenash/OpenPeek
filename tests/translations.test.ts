import { describe, it, expect } from 'vitest';
import { translations } from '../src/i18n/translations';

describe('Translations Parity', () => {
  it('has identical top-level sections in fr and en', () => {
    const frKeys = Object.keys(translations.fr).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it('has non-empty navigation labels for both languages', () => {
    expect(translations.fr.nav.recorder).toBeTruthy();
    expect(translations.en.nav.recorder).toBeTruthy();
    expect(translations.fr.nav.settings).toBeTruthy();
    expect(translations.en.nav.settings).toBeTruthy();
  });

  it('has non-empty dashboard labels', () => {
    expect(translations.fr.dashboard.ready).toBeTruthy();
    expect(translations.en.dashboard.ready).toBeTruthy();
  });
});
