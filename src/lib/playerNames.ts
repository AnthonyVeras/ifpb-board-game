const RESERVED_PLAYER_NAMES = new Set(['sistema'])

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizePlayerName(value: string): string {
  return collapseWhitespace(value).toLocaleLowerCase('pt-BR')
}

export function sanitizePlayerName(value: string): string {
  return collapseWhitespace(value).slice(0, 20)
}

export function validatePlayerName(
  value: string,
  existingNames: string[] = [],
  currentNormalizedName?: string,
): string | null {
  const sanitized = sanitizePlayerName(value)
  const normalized = normalizePlayerName(sanitized)

  if (!sanitized) {
    return 'Digite um nome para continuar.'
  }

  if (RESERVED_PLAYER_NAMES.has(normalized)) {
    return 'Esse nome é reservado pelo sistema.'
  }

  const duplicated = existingNames.some(existing => {
    const normalizedExisting = normalizePlayerName(existing)
    return normalizedExisting === normalized && normalizedExisting !== currentNormalizedName
  })

  if (duplicated) {
    return 'Já existe um jogador com esse nome.'
  }

  return null
}

export function validatePlayerNameList(values: string[]): string | null {
  const seen = new Set<string>()

  for (const value of values) {
    const error = validatePlayerName(value)
    if (error) {
      return error
    }

    const normalized = normalizePlayerName(value)
    if (seen.has(normalized)) {
      return 'Os jogadores precisam ter nomes diferentes.'
    }
    seen.add(normalized)
  }

  return null
}

export { RESERVED_PLAYER_NAMES }
