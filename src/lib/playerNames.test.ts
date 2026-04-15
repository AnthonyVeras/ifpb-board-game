import { describe, expect, it } from 'vitest'
import { sanitizePlayerName, validatePlayerName, validatePlayerNameList } from './playerNames'

describe('playerNames', () => {
  it('normalizes spacing when sanitizing', () => {
    expect(sanitizePlayerName('  Ana   Maria  ')).toBe('Ana Maria')
  })

  it('blocks reserved system names', () => {
    expect(validatePlayerName('  Sistema ')).toBe('Esse nome é reservado pelo sistema.')
  })

  it('blocks duplicates after normalization', () => {
    expect(validatePlayerNameList(['Ana', '  ana  '])).toBe('Os jogadores precisam ter nomes diferentes.')
  })
})
