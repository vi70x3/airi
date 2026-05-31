import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'
import * as v from 'valibot'

/**
 * Creates a CRC32 lookup table for PNG chunk checksums.
 */
export function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
}

const crc32Table = createCrc32Table()

/**
 * Computes CRC32 checksum for a byte array.
 */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i += 1) {
    crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Concatenates multiple Uint8Arrays into one.
 */
export function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

/**
 * Converts a 32-bit unsigned integer to big-endian 4-byte array.
 */
export function uint32ToBytes(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff])
}

/**
 * Creates a PNG tEXt chunk with the given keyword and text value.
 */
export function createPngTextChunk(keyword: string, text: string): Uint8Array {
  const typeBytes = new TextEncoder().encode('tEXt')
  const dataBytes = new TextEncoder().encode(`${keyword}\0${text}`)
  const crcBytes = uint32ToBytes(crc32(concatUint8Arrays([typeBytes, dataBytes])))

  return concatUint8Arrays([uint32ToBytes(dataBytes.length), typeBytes, dataBytes, crcBytes])
}

/**
 * Injects a tEXt chunk into a PNG byte array, placing it before the IEND chunk.
 */
export function injectPngTextChunk(pngBytes: Uint8Array, keyword: string, text: string): Uint8Array {
  let insertOffset = -1
  for (let offset = 8; offset < pngBytes.length - 8; ) {
    const length =
      ((pngBytes[offset] << 24) | (pngBytes[offset + 1] << 16) | (pngBytes[offset + 2] << 8) | pngBytes[offset + 3]) >>>
      0
    const type = String.fromCharCode(
      pngBytes[offset + 4],
      pngBytes[offset + 5],
      pngBytes[offset + 6],
      pngBytes[offset + 7],
    )
    if (type === 'IEND') {
      insertOffset = offset
      break
    }
    offset += 12 + length
  }

  if (insertOffset === -1) {
    throw new Error('PNG is missing IEND chunk')
  }

  const chunk = createPngTextChunk(keyword, text)
  return concatUint8Arrays([pngBytes.slice(0, insertOffset), chunk, pngBytes.slice(insertOffset)])
}

/**
 * Decodes a base64 string to UTF-8.
 *
 * Uses TextDecoder with Uint8Array for modern, spec-compliant binary-safe decoding
 * instead of deprecated escape/unescape functions.
 */
export function base64ToUtf8(input: string): string {
  const binary = atob(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Encodes a UTF-8 string to base64.
 *
 * Uses TextEncoder with Uint8Array for modern, spec-compliant binary-safe encoding
 * instead of deprecated escape/unescape functions.
 */
export function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const binary = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return btoa(binary)
}

/**
 * Valibot schema for chara_card_v2 payload validation
 */
export const CharaCardV2Schema = v.object({
  spec: v.optional(v.string()),
  spec_version: v.optional(v.string()),
  data: v.optional(
    v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      personality: v.optional(v.string()),
      scenario: v.optional(v.string()),
      first_mes: v.optional(v.string()),
      mes_example: v.optional(v.string()),
      creator_notes: v.optional(v.string()),
      system_prompt: v.optional(v.string()),
      post_history_instructions: v.optional(v.string()),
      alternate_greetings: v.optional(v.array(v.string())),
      tags: v.optional(v.array(v.string())),
      creator: v.optional(v.string()),
      character_version: v.optional(v.string()),
      extensions: v.optional(v.record(v.unknown())),
    }),
  ),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  personality: v.optional(v.string()),
  scenario: v.optional(v.string()),
  first_mes: v.optional(v.string()),
  mes_example: v.optional(v.string()),
  creator_notes: v.optional(v.string()),
  system_prompt: v.optional(v.string()),
  post_history_instructions: v.optional(v.string()),
  alternate_greetings: v.optional(v.array(v.string())),
  tags: v.optional(v.array(v.string())),
  creator: v.optional(v.string()),
  character_version: v.optional(v.string()),
  extensions: v.optional(v.record(v.unknown())),
})

/**
 * Parsed PNG chara payload with core card fields and optional extensions.
 */
export interface ParsedCharaPayload {
  [key: string]: unknown
  spec?: string
  spec_version?: string
  data?: {
    name?: string
    description?: string
    personality?: string
    scenario?: string
    first_mes?: string
    mes_example?: string
    creator_notes?: string
    system_prompt?: string
    post_history_instructions?: string
    alternate_greetings?: string[]
    tags?: string[]
    creator?: string
    character_version?: string
    extensions?: Record<string, unknown>
  }
  name?: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  alternate_greetings?: string[]
  tags?: string[]
  creator?: string
  character_version?: string
  extensions?: Record<string, unknown>
}

/**
 * Extracts the `chara` text chunk from a PNG ArrayBuffer.
 * Parses the base64-encoded JSON payload as a Card or ccv3.CharacterCardV3.
 */
export function parsePngCharaPayload(buffer: ArrayBuffer): ParsedCharaPayload {
  const bytes = new Uint8Array(buffer)

  for (let offset = 8; offset < bytes.length - 8; ) {
    const length =
      ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0

    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])

    if (type === 'tEXt') {
      const dataStart = offset + 8
      const dataEnd = dataStart + length
      const data = bytes.slice(dataStart, dataEnd)
      const separator = data.indexOf(0)

      if (separator > 0) {
        const keyword = new TextDecoder().decode(data.slice(0, separator))
        if (keyword === 'chara') {
          const text = new TextDecoder().decode(data.slice(separator + 1))
          const decoded = JSON.parse(base64ToUtf8(text))
          return v.parse(CharaCardV2Schema, decoded)
        }
      }
    }

    offset += 12 + length
  }

  throw new Error('PNG does not contain a supported chara payload')
}

/**
 * Built chara_card_v2 export payload.
 */
export interface BuiltCharaCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: string[]
    tags: string[]
    creator: string
    character_version: string
    extensions: Record<string, unknown>
    x_airi_probe: string
  }
}

/**
 * Maps an AIRI card to chara_card_v2 format for SillyTavern compatibility.
 * AIRI extensions are nested under `data.extensions.airi`.
 */
export function buildCharaCardV2(card: AiriCard): BuiltCharaCardV2 {
  const exportedExtensions: Record<string, unknown> = {
    ...(card.extensions as Record<string, unknown> | undefined),
    airi: {
      ...((card.extensions as Record<string, unknown> | undefined)?.airi as Record<string, unknown> | undefined),
      sillytavernCompatibilityProbe: {
        exportedBy: 'Project AIRI',
        probe: 'extensions-airi-ok',
        version: 1,
      },
    },
  }

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: card.name || '',
      description: card.description || '',
      personality: card.personality || '',
      scenario: card.scenario || '',
      first_mes: card.greetings?.[0] || '',
      mes_example: Array.isArray(card.messageExample)
        ? card.messageExample
            .map((example) => (Array.isArray(example) ? example.join('\n') : String(example)))
            .join('\n<START>\n')
        : '',
      creator_notes: card.notes || '',
      system_prompt: card.systemPrompt || '',
      post_history_instructions: card.postHistoryInstructions || '',
      alternate_greetings: card.greetings?.slice(1) || [],
      tags: card.tags || [],
      creator: card.creator || '',
      character_version: card.version || '',
      extensions: exportedExtensions,
      x_airi_probe: 'top-level-data-ok',
    },
  }
}
