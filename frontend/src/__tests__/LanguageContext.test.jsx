import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { LanguageProvider, useLanguage } from '../context/LanguageContext.jsx'
import { translations } from '../locales/index.js'

// Mock translations
vi.mock('../locales/index.js', () => ({
  translations: {
    EN: {
      'common.search': 'Search',
      'common.login': 'Login',
      'common.welcome': 'Welcome {name}',
    },
    FR: {
      'common.search': 'Rechercher',
      'common.login': 'Connexion',
      'common.welcome': 'Bienvenue {name}',
    },
  },
}))

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up
    delete localStorage.targetalent_language
    delete localStorage.digitalia_language
  })

  const wrapper = ({ children }) => <LanguageProvider>{children}</LanguageProvider>

  describe('initial state', () => {
    it('should load EN language by default', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('EN')
    })

    it('should load saved language from localStorage', () => {
      localStorage.setItem('targetalent_language', 'FR')

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('FR')
    })

    it('should load from legacy digitalia_language key', () => {
      localStorage.setItem('digitalia_language', 'FR')

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('FR')
    })

    it('should prefer targetalent_language over legacy key', () => {
      localStorage.setItem('targetalent_language', 'EN')
      localStorage.setItem('digitalia_language', 'FR')

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('EN')
    })

    it('should default to EN for invalid saved value', () => {
      localStorage.setItem('targetalent_language', 'ES')

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('EN')
    })

    it('should handle localStorage errors gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.lang).toBe('EN')
      getItemSpy.mockRestore()
    })
  })

  describe('setLang', () => {
    it('should change language to FR', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.setLang('FR')
      })

      expect(result.current.lang).toBe('FR')
    })

    it('should change language to EN', () => {
      localStorage.setItem('targetalent_language', 'FR')
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.setLang('EN')
      })

      expect(result.current.lang).toBe('EN')
    })

    it('should save language to localStorage', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.setLang('FR')
      })

      expect(localStorage.getItem('targetalent_language')).toBe('FR')
    })

    it('should handle localStorage errors when saving', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(() => {
        act(() => {
          result.current.setLang('FR')
        })
      }).not.toThrow()
      setItemSpy.mockRestore()
    })
  })

  describe('toggleLanguage', () => {
    it('should toggle from EN to FR', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.toggleLanguage()
      })

      expect(result.current.lang).toBe('FR')
    })

    it('should toggle from FR to EN', () => {
      localStorage.setItem('targetalent_language', 'FR')
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.toggleLanguage()
      })

      expect(result.current.lang).toBe('EN')
    })

    it('should save toggled language to localStorage', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      act(() => {
        result.current.toggleLanguage()
      })

      expect(localStorage.getItem('targetalent_language')).toBe('FR')
    })
  })

  describe('t (translation function)', () => {
    it('should translate key in EN', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.search')).toBe('Search')
    })

    it('should translate key in FR', () => {
      localStorage.setItem('targetalent_language', 'FR')
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.search')).toBe('Rechercher')
    })

    it('should replace parameters in translation', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.welcome', { name: 'John' })).toBe('Welcome John')
    })

    it('should replace multiple parameters', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.welcome', { name: 'John', age: '30' })).toBe('Welcome John')
    })

    it('should fallback to EN translation when key not found in current language', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.login')).toBe('Login')
    })

    it('should return key itself when translation not found', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('should handle empty params', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.search', {})).toBe('Search')
    })

    it('should handle missing params in translation string', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.search', { name: 'John' })).toBe('Search')
    })
  })

  describe('integration', () => {
    it('should update translations when language changes', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.search')).toBe('Search')

      act(() => {
        result.current.setLang('FR')
      })

      expect(result.current.t('common.search')).toBe('Rechercher')
    })

    it('should work with toggle and translation together', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper })

      expect(result.current.t('common.login')).toBe('Login')

      act(() => {
        result.current.toggleLanguage()
      })

      expect(result.current.t('common.login')).toBe('Connexion')
    })
  })
})
