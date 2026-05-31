import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'

import { describe, expect, it } from 'vitest'

import {
  buildCharaCardV2,
  concatUint8Arrays,
  crc32,
  createPngTextChunk,
  injectPngTextChunk,
  parsePngCharaPayload,
  uint32ToBytes,
} from './utils'

// ===========================================================================
// T11.5: PNG chunk utilities
// ===========================================================================

describe('crc32', () => {
  /**
   * @example
   * Known value: CRC32 of "hello" → 0x3610A686
   */
  it('computes correct CRC32 for "hello"', () => {
    const data = new TextEncoder().encode('hello')
    expect(crc32(data)).toBe(0x3610a686)
  })

  /**
   * @example
   * Known value: CRC32 of empty input → 0x00000000
   */
  it('returns 0 for empty input', () => {
    const data = new Uint8Array(0)
    expect(crc32(data)).toBe(0)
  })

  /**
   * @example
   * Known value: CRC32 of "123456789" → 0xCBF43926 (standard test vector)
   */
  it('computes correct CRC32 for standard test vector "123456789"', () => {
    const data = new TextEncoder().encode('123456789')
    expect(crc32(data)).toBe(0xcbf43926)
  })

  /**
   * @example
   * Known value: CRC32 of "The quick brown fox jumps over the lazy dog" → 0x414FA339
   */
  it('computes correct CRC32 for a longer string', () => {
    const data = new TextEncoder().encode('The quick brown fox jumps over the lazy dog')
    expect(crc32(data)).toBe(0x414fa339)
  })
})

describe('uint32ToBytes', () => {
  /**
   * @example
   * 0x12345678 → [0x12, 0x34, 0x56, 0x78]
   */
  it('converts uint32 to big-endian bytes', () => {
    expect(uint32ToBytes(0x12345678)).toEqual(new Uint8Array([0x12, 0x34, 0x56, 0x78]))
  })

  /**
   * @example
   * 0 → [0, 0, 0, 0]
   */
  it('converts zero to four zero bytes', () => {
    expect(uint32ToBytes(0)).toEqual(new Uint8Array([0, 0, 0, 0]))
  })

  /**
   * @example
   * 0xFFFFFFFF → [0xFF, 0xFF, 0xFF, 0xFF]
   */
  it('converts max uint32 to four 0xFF bytes', () => {
    expect(uint32ToBytes(0xffffffff)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]))
  })
})

describe('concatUint8Arrays', () => {
  /**
   * @example
   * Concatenates multiple arrays into one
   */
  it('concatenates multiple Uint8Arrays', () => {
    const a = new Uint8Array([1, 2, 3])
    const b = new Uint8Array([4, 5])
    const c = new Uint8Array([6])
    expect(concatUint8Arrays([a, b, c])).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
  })

  /**
   * @example
   * Empty input → empty output
   */
  it('returns empty array for empty input', () => {
    expect(concatUint8Arrays([])).toEqual(new Uint8Array(0))
  })

  /**
   * @example
   * Single array → same array
   */
  it('returns same array for single input', () => {
    const a = new Uint8Array([1, 2, 3])
    expect(concatUint8Arrays([a])).toEqual(a)
  })
})

describe('createPngTextChunk', () => {
  /**
   * @example
   * Produces correct byte structure: length + type + data + CRC
   */
  it('produces correct byte structure for a tEXt chunk', () => {
    const chunk = createPngTextChunk('keyword', 'text value')

    // Chunk structure: 4 bytes length + 4 bytes type + data + 4 bytes CRC
    const keywordBytes = new TextEncoder().encode('keyword')
    const textBytes = new TextEncoder().encode('text value')
    const dataLength = keywordBytes.length + 1 + textBytes.length // keyword + null separator + text

    // Read length (first 4 bytes, big-endian)
    const length = (chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]
    expect(length).toBe(dataLength)

    // Read type (bytes 4-7)
    const type = String.fromCharCode(chunk[4], chunk[5], chunk[6], chunk[7])
    expect(type).toBe('tEXt')

    // Read keyword
    const storedKeyword = new TextDecoder().decode(chunk.slice(8, 8 + keywordBytes.length))
    expect(storedKeyword).toBe('keyword')

    // Null separator
    expect(chunk[8 + keywordBytes.length]).toBe(0)

    // Read text value
    const storedText = new TextDecoder().decode(chunk.slice(8 + keywordBytes.length + 1, 8 + dataLength))
    expect(storedText).toBe('text value')

    // Total chunk size: 4 (length) + 4 (type) + dataLength + 4 (CRC)
    expect(chunk.length).toBe(4 + 4 + dataLength + 4)
  })

  /**
   * @example
   * CRC is correct for the chunk data
   */
  it('computes correct CRC for the chunk', () => {
    const chunk = createPngTextChunk('test', 'hello')

    // CRC is the last 4 bytes
    const storedCrc =
      (chunk[chunk.length - 4] << 24) |
      (chunk[chunk.length - 3] << 16) |
      (chunk[chunk.length - 2] << 8) |
      chunk[chunk.length - 1]

    // CRC should cover type + data
    const typeAndData = chunk.slice(4, chunk.length - 4)
    const computedCrc = crc32(typeAndData)

    expect(storedCrc >>> 0).toBe(computedCrc)
  })

  /**
   * @example
   * Empty text value is handled
   */
  it('handles empty text value', () => {
    const chunk = createPngTextChunk('key', '')
    const type = String.fromCharCode(chunk[4], chunk[5], chunk[6], chunk[7])
    expect(type).toBe('tEXt')

    const length = (chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]
    expect(length).toBe(4) // 'key' + null separator = 4 bytes
  })
})

describe('injectPngTextChunk', () => {
  /**
   * @example
   * Creates a minimal valid PNG with IEND, injects a tEXt chunk
   */
  it('injects a tEXt chunk before IEND in a valid PNG', () => {
    // Build a minimal valid PNG: signature + IHDR + IEND
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13) // 1x1 image, 8-bit RGBA
    ihdrData[3] = 1 // width = 1
    ihdrData[7] = 1 // height = 1
    ihdrData[8] = 8 // bit depth
    ihdrData[9] = 6 // color type (RGBA)
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])

    // IEND chunk (empty data)
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])

    const minimalPng = concatUint8Arrays([signature, ihdrChunk, iendChunk])

    // Inject a tEXt chunk
    const result = injectPngTextChunk(minimalPng, 'chara', 'test-payload')

    // Result should be larger than original
    expect(result.length).toBeGreaterThan(minimalPng.length)

    // Result should still start with PNG signature
    expect(result.slice(0, 8)).toEqual(signature)

    // Parse the result to verify the tEXt chunk is present
    let foundText = false
    for (let offset = 8; offset < result.length - 8; ) {
      const length =
        ((result[offset] << 24) | (result[offset + 1] << 16) | (result[offset + 2] << 8) | result[offset + 3]) >>> 0
      const type = String.fromCharCode(result[offset + 4], result[offset + 5], result[offset + 6], result[offset + 7])

      if (type === 'tEXt') {
        const data = result.slice(offset + 8, offset + 8 + length)
        const separator = data.indexOf(0)
        const keyword = new TextDecoder().decode(data.slice(0, separator))
        if (keyword === 'chara') {
          foundText = true
          const text = new TextDecoder().decode(data.slice(separator + 1))
          expect(text).toBe('test-payload')
        }
      }

      if (type === 'IEND') break
      offset += 12 + length
    }

    expect(foundText).toBe(true)
  })

  /**
   * @example
   * Throws on PNG without IEND
   */
  it('throws when PNG has no IEND chunk', () => {
    const invalidPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(() => injectPngTextChunk(invalidPng, 'chara', 'data')).toThrow('PNG is missing IEND chunk')
  })

  /**
   * @example
   * CRC in injected chunk is valid
   */
  it('produces valid CRC for injected chunk', () => {
    // Minimal valid PNG
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13)
    ihdrData[3] = 1
    ihdrData[7] = 1
    ihdrData[8] = 8
    ihdrData[9] = 6
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])
    const minimalPng = concatUint8Arrays([signature, ihdrChunk, iendChunk])

    const result = injectPngTextChunk(minimalPng, 'chara', 'test')

    // Find the tEXt chunk and verify CRC
    for (let offset = 8; offset < result.length - 8; ) {
      const length =
        ((result[offset] << 24) | (result[offset + 1] << 16) | (result[offset + 2] << 8) | result[offset + 3]) >>> 0
      const type = String.fromCharCode(result[offset + 4], result[offset + 5], result[offset + 6], result[offset + 7])

      if (type === 'tEXt') {
        const chunkData = result.slice(offset + 4, offset + 8 + length) // type + data
        const storedCrc =
          (result[offset + 8 + length] << 24) |
          (result[offset + 9 + length] << 16) |
          (result[offset + 10 + length] << 8) |
          result[offset + 11 + length]
        const computedCrc = crc32(chunkData)
        expect(storedCrc >>> 0).toBe(computedCrc)
        break
      }

      if (type === 'IEND') break
      offset += 12 + length
    }
  })
})

// ===========================================================================
// T11.1: parsePngCharaPayload()
// ===========================================================================

describe('parsePngCharaPayload', () => {
  /**
   * @example
   * Extracts chara text chunk from a valid PNG
   */
  it('parses valid PNG with chara text chunk', () => {
    // Build a minimal PNG with a chara tEXt chunk
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13)
    ihdrData[3] = 1
    ihdrData[7] = 1
    ihdrData[8] = 8
    ihdrData[9] = 6
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])

    // Create a chara payload
    const payload = { spec: 'chara_card_v3', spec_version: '3.0', data: { name: 'Test' } }
    const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    const textChunk = createPngTextChunk('chara', encodedPayload)

    const png = concatUint8Arrays([signature, ihdrChunk, textChunk, iendChunk])
    const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)

    const result = parsePngCharaPayload(buffer)
    expect(result).toEqual(payload)
  })

  /**
   * @example
   * Throws on PNG without chara chunk
   */
  it('throws when PNG has no chara text chunk', () => {
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13)
    ihdrData[3] = 1
    ihdrData[7] = 1
    ihdrData[8] = 8
    ihdrData[9] = 6
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])

    const png = concatUint8Arrays([signature, ihdrChunk, iendChunk])
    const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)

    expect(() => parsePngCharaPayload(buffer)).toThrow('PNG does not contain a supported chara payload')
  })

  /**
   * @example
   * Throws on invalid PNG (no tEXt chunks at all)
   */
  it('throws on PNG with non-chara tEXt chunks only', () => {
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13)
    ihdrData[3] = 1
    ihdrData[7] = 1
    ihdrData[8] = 8
    ihdrData[9] = 6
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])

    // Add a non-chara tEXt chunk
    const otherTextChunk = createPngTextChunk('Software', 'Test')

    const png = concatUint8Arrays([signature, ihdrChunk, otherTextChunk, iendChunk])
    const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)

    expect(() => parsePngCharaPayload(buffer)).toThrow('PNG does not contain a supported chara payload')
  })

  /**
   * @example
   * Parses ccv3 format correctly
   */
  it('parses ccv3 CharacterCardV3 from chara chunk', () => {
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdrData = new Uint8Array(13)
    ihdrData[3] = 1
    ihdrData[7] = 1
    ihdrData[8] = 8
    ihdrData[9] = 6
    const ihdrType = new TextEncoder().encode('IHDR')
    const ihdrCrc = uint32ToBytes(crc32(concatUint8Arrays([ihdrType, ihdrData])))
    const ihdrChunk = concatUint8Arrays([uint32ToBytes(13), ihdrType, ihdrData, ihdrCrc])
    const iendType = new TextEncoder().encode('IEND')
    const iendCrc = uint32ToBytes(crc32(iendType))
    const iendChunk = concatUint8Arrays([uint32ToBytes(0), iendType, iendCrc])

    const ccv3Payload = {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: 'Ayaka',
        description: 'A test character',
        personality: 'Friendly',
        scenario: 'Testing',
        first_mes: 'Hello!',
        mes_example: '',
        creator_notes: 'Test notes',
        system_prompt: 'Be friendly',
        post_history_instructions: 'Stay in character',
        alternate_greetings: ['Hi there!'],
        tags: ['test'],
        creator: 'Tester',
        character_version: '1.0.0',
        extensions: { airi: { groundingEnabled: true } },
      },
    }
    const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(ccv3Payload))))
    const textChunk = createPngTextChunk('chara', encodedPayload)

    const png = concatUint8Arrays([signature, ihdrChunk, textChunk, iendChunk])
    const buffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)

    const result = parsePngCharaPayload(buffer)
    expect(result.spec).toBe('chara_card_v3')
    expect(result.data.name).toBe('Ayaka')
    expect(result.data.extensions.airi.groundingEnabled).toBe(true)
  })
})

// ===========================================================================
// T11.2: buildCharaCardV2()
// ===========================================================================

describe('buildCharaCardV2', () => {
  /**
   * @example
   * Maps AIRI card fields to chara_card_v2 format
   */
  it('maps AIRI card fields to chara_card_v2 format', () => {
    const card: AiriCard = {
      name: 'TestCard',
      version: '2.0.0',
      description: 'A test card',
      personality: 'Cheerful',
      scenario: 'In a test suite',
      systemPrompt: 'Be a test character',
      postHistoryInstructions: 'Stay in character',
      greetings: ['Hello!', 'Hi there!'],
      notes: 'Creator notes',
      tags: ['test', 'demo'],
      creator: 'Tester',
      messageExample: [['{{user}}: Hi', '{{char}}: Hello!']],
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'openai', model: 'gpt-4o' },
            speech: { provider: 'elevenlabs', model: 'multilingual', voice_id: 'alloy' },
          },
          acting: {
            modelExpressionPrompt: '',
            speechExpressionPrompt: '',
            speechMannerismPrompt: '',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
            enabled: false,
            strictAfkGating: true,
            journalingThreshold: 'balanced',
            maxSessionsPerDay: 4,
            sessionTimeoutMinutes: 60,
            afkThresholdMinutes: 5,
            minConversationTurns: 4,
            lastProcessedAt: undefined,
            dailyRunDate: undefined,
            dailyRunCount: 0,
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            widgetInstruction: 'test',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: false,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    }

    const result = buildCharaCardV2(card)

    expect(result.spec).toBe('chara_card_v2')
    expect(result.spec_version).toBe('2.0')
    expect(result.data.name).toBe('TestCard')
    expect(result.data.description).toBe('A test card')
    expect(result.data.personality).toBe('Cheerful')
    expect(result.data.scenario).toBe('In a test suite')
    expect(result.data.first_mes).toBe('Hello!')
    expect(result.data.system_prompt).toBe('Be a test character')
    expect(result.data.post_history_instructions).toBe('Stay in character')
    expect(result.data.creator_notes).toBe('Creator notes')
    expect(result.data.character_version).toBe('2.0.0')
    expect(result.data.tags).toEqual(['test', 'demo'])
    expect(result.data.creator).toBe('Tester')
    expect(result.data.alternate_greetings).toEqual(['Hi there!'])
  })

  /**
   * @example
   * AIRI extensions are nested under data.extensions.airi
   */
  it('nests AIRI extensions under data.extensions.airi', () => {
    const card: AiriCard = {
      name: 'Test',
      version: '1.0.0',
      extensions: {
        airi: {
          modules: {
            consciousness: { provider: 'anthropic', model: 'claude-3' },
            speech: { provider: 'openai', model: 'tts-1', voice_id: 'nova' },
          },
          acting: {
            modelExpressionPrompt: 'expr',
            speechExpressionPrompt: 'speech',
            speechMannerismPrompt: 'mann',
            idleAnimations: [],
          },
          agents: {},
          heartbeats: {
            enabled: false,
            intervalMinutes: 5,
            prompt: '',
            injectIntoPrompt: true,
            useAsLocalGate: true,
            contextOptions: { windowHistory: true, systemLoad: true, usageMetrics: true },
            schedule: { start: '09:00', end: '22:00' },
            respectSchedule: true,
          },
          dreamState: {
            enabled: false,
            strictAfkGating: true,
            journalingThreshold: 'balanced',
            maxSessionsPerDay: 4,
            sessionTimeoutMinutes: 60,
            afkThresholdMinutes: 5,
            minConversationTurns: 4,
            lastProcessedAt: undefined,
            dailyRunDate: undefined,
            dailyRunCount: 0,
          },
          shortTermMemory: { windowSize: 3, tokenBudgetPerDay: 1000 },
          artistry: {
            widgetInstruction: 'test',
            spawnMode: 'bg_widget',
            autonomousEnabled: false,
            autonomousThreshold: 70,
            autonomousTarget: 'user',
            autonomousMonitorEnabled: true,
            autonomousHistoryDepth: 3,
          },
          generation: {
            enabled: false,
            provider: 'openai',
            model: 'gpt-4o',
            known: { contextWidth: undefined, reasoningFallback: true },
            advanced: undefined,
            compaction: { strategy: 'none', minKeepTurns: 15 },
            importedPresetMeta: undefined,
          },
          groundingEnabled: true,
          visual_assets: {},
          active_concepts: [],
          eternal_record: { relational_milestones: [], lore_bits: [] },
          imageJournal: { selfie: false },
          proactivity_metrics: { ttsCount: 0, sttCount: 0, chatCount: 0, totalTurns: 0 },
        },
      },
    }

    const result = buildCharaCardV2(card)

    expect(result.data.extensions.airi).toBeDefined()
    expect(result.data.extensions.airi.modules.consciousness.model).toBe('claude-3')
    expect(result.data.extensions.airi.groundingEnabled).toBe(true)
  })

  /**
   * @example
   * Standard fields are in correct positions
   */
  it('places standard fields in correct positions', () => {
    const card: AiriCard = {
      name: 'Ayaka',
      version: '1.0.0',
      description: 'Desc',
      personality: 'Pers',
      scenario: 'Scen',
      systemPrompt: 'Sys',
      postHistoryInstructions: 'Post',
      greetings: ['First greeting', 'Alt 1', 'Alt 2'],
      notes: 'Notes',
      tags: ['tag1'],
      creator: 'Creator',
      messageExample: [],
      extensions: { airi: {} } as any,
    }

    const result = buildCharaCardV2(card)

    expect(result.data.name).toBe('Ayaka')
    expect(result.data.first_mes).toBe('First greeting')
    expect(result.data.alternate_greetings).toEqual(['Alt 1', 'Alt 2'])
    expect(result.data.system_prompt).toBe('Sys')
    expect(result.data.post_history_instructions).toBe('Post')
    expect(result.data.creator_notes).toBe('Notes')
    expect(result.data.tags).toEqual(['tag1'])
    expect(result.data.creator).toBe('Creator')
    expect(result.data.character_version).toBe('1.0.0')
  })

  /**
   * @example
   * Message examples are joined with <START>
   */
  it('joins message examples with <START>', () => {
    const card: AiriCard = {
      name: 'Test',
      version: '1.0.0',
      messageExample: [
        ['{{user}}: Hi', '{{char}}: Hello!'],
        ['{{user}}: Bye', '{{char}}: Goodbye!'],
      ],
      greetings: ['Hi'],
      extensions: { airi: {} } as any,
    }

    const result = buildCharaCardV2(card)

    expect(result.data.mes_example).toBe('{{user}}: Hi\n{{char}}: Hello!\n<START>\n{{user}}: Bye\n{{char}}: Goodbye!')
  })

  /**
   * @example
   * Adds AIRI probe markers
   */
  it('adds AIRI compatibility probe markers', () => {
    const card: AiriCard = {
      name: 'Test',
      version: '1.0.0',
      greetings: ['Hi'],
      extensions: { airi: {} } as any,
    }

    const result = buildCharaCardV2(card)

    expect(result.data.x_airi_probe).toBe('top-level-data-ok')
    expect(result.data.extensions.airi.sillytavernCompatibilityProbe).toEqual({
      exportedBy: 'Project AIRI',
      probe: 'extensions-airi-ok',
      version: 1,
    })
  })

  /**
   * @example
   * Handles empty/undefined fields gracefully
   */
  it('handles empty and undefined fields with defaults', () => {
    const card: AiriCard = {
      name: '',
      version: '',
      greetings: [],
      extensions: { airi: {} } as any,
    }

    const result = buildCharaCardV2(card)

    expect(result.data.name).toBe('')
    expect(result.data.first_mes).toBe('')
    expect(result.data.alternate_greetings).toEqual([])
    expect(result.data.tags).toEqual([])
    expect(result.data.character_version).toBe('')
  })
})
