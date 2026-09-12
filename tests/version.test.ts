import { describe, it, expect } from 'vitest';
import { APP_VERSION } from '../src/version';
import pkg from '../package.json';

describe('Version Consistency', () => {
  it('defines a valid semver APP_VERSION', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);
  });

  it('matches version in package.json', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
});
