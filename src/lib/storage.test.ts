import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getAllowClarifyingQuestions, setAllowClarifyingQuestions } from './storage';

describe('storage clarifying questions preference', () => {
  const STORAGE_KEY = 'recipe-flow-allow-clarifying-questions';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAllowClarifyingQuestions', () => {
    it('should return true by default when no value is stored', () => {
      const result = getAllowClarifyingQuestions();
      expect(result).toBe(true);
    });

    it('should return true when "true" is stored', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const result = getAllowClarifyingQuestions();
      expect(result).toBe(true);
    });

    it('should return false when "false" is stored', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const result = getAllowClarifyingQuestions();
      expect(result).toBe(false);
    });

    it('should return true for any invalid stored value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid');
      const result = getAllowClarifyingQuestions();
      expect(result).toBe(true);
    });
  });

  describe('setAllowClarifyingQuestions', () => {
    it('should store true value', () => {
      setAllowClarifyingQuestions(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('should store false value', () => {
      setAllowClarifyingQuestions(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('should persist value that can be retrieved', () => {
      setAllowClarifyingQuestions(false);
      expect(getAllowClarifyingQuestions()).toBe(false);

      setAllowClarifyingQuestions(true);
      expect(getAllowClarifyingQuestions()).toBe(true);
    });
  });
});
