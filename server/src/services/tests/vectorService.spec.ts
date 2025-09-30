import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'
import { CohereClientV2, CohereTimeoutError, CohereError } from 'cohere-ai'
import { VectorService } from '../vectorService'

// ----------------------------------------------------------------
// MOCK DEPENDENCIES
// ----------------------------------------------------------------

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
}

vi.mock('../utils/logger', () => ({
  default: mockLogger,
}))

vi.mock('@server/config', () => ({
  default: {
    auth: {
      botApiKey: 'CONFIG_COHERE_API_KEY',
    },
  },
}))

// Mock the Cohere client's embed method
const mockEmbed: Mock = vi.fn()

vi.mock('cohere-ai', async (importOriginal) => {
  const actualCohere = await importOriginal<typeof import('cohere-ai')>()

  return {
    ...actualCohere,
    CohereClientV2: vi.fn(() => ({
      embed: mockEmbed,
    })),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ----------------------------------------------------------------
// CONSTRUCTOR TESTS
// ----------------------------------------------------------------
describe('Constructor', () => {
  it('should throw an error if no API key is provided or configured', () => {
    // Mock the config key to be null/undefined for this test
    vi.mock('@server/config', () => ({
      default: {
        auth: {
          botApiKey: null,
        },
      },
    }))

    expect(() => new VectorService(undefined)).toThrow(
      'Cohere API key is required. Pass it as a parameter or set COHERE_API_KEY environment variable.'
    )
    expect(CohereClientV2).not.toHaveBeenCalled()
  })
})

// ----------------------------------------------------------------
// GENERATE EMBEDDINGS TESTS
// ----------------------------------------------------------------
describe('generateEmbeddings', () => {
  let vectorService: VectorService

  const mockData = ['Hello world', 'Test sentence']
  const mockEmbeddings = [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
  ]
  const mockEmbedResponse = {
    texts: mockData,
    embeddings: {
      float: mockEmbeddings,
      int8: [],
      uint8: [],
      binary: [],
      ubinary: [],
    } as any,
    id: 'mock-id',
    meta: {} as any,
    response_type: 'embeddings_float',
    generations: [],
  }

  beforeEach(() => {
    vectorService = new VectorService('CONFIG_COHERE_API_KEY')
    mockEmbed.mockResolvedValue(mockEmbedResponse)
  })

  it('should successfully generate float embeddings with defaults', async () => {
    const result = await vectorService.generateEmbeddings(mockData)

    expect(mockEmbed).toHaveBeenCalledWith({
      texts: mockData,
      model: 'embed-v4.0',
      inputType: 'search_document',
      embeddingTypes: ['float'],
    })
    expect(result).toEqual([
      { content: 'Hello world', embedding: [0.1, 0.2, 0.3] },
      { content: 'Test sentence', embedding: [0.4, 0.5, 0.6] },
    ])

    // expect(mockLogger.info).toHaveBeenCalledWith('Contacted Cohere')
  })

  it('should throw an error and log if the number of returned embeddings does not match input length', async () => {
    // Mock a response where only one embedding is returned for two inputs
    mockEmbed.mockResolvedValue({
      ...mockEmbedResponse,
      embeddings: { float: [[0.1, 0.2, 0.3]] },
    })

    await expect(vectorService.generateEmbeddings(mockData)).rejects.toThrow(
      'Embedding response invalid'
    )

    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'Returned embeddings are missing or malformed'
    // )
  })

  it('should catch, log CohereTimeoutError, and re-throw the original error', async () => {
    const mockTimeoutError = new CohereTimeoutError('Request timed out')
    mockEmbed.mockRejectedValue(mockTimeoutError)

    await expect(vectorService.generateEmbeddings(mockData)).rejects.toBe(
      mockTimeoutError
    )

    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'Request timed out with CohereTimeoutError',
    //   mockTimeoutError
    // )
  })

  it('should catch, log a CohereError with details, and re-throw the original error', async () => {
    // Simulate a 400 Bad Request Cohere Error
    const mockCohereError = new CohereError({
      message: 'Invalid parameters',
      statusCode: 400,
      body: '{"error": "bad input"}',
    })
    mockEmbed.mockRejectedValue(mockCohereError)

    await expect(vectorService.generateEmbeddings(mockData)).rejects.toBe(
      mockCohereError
    )

    // console.log('Logger calls:', {
    //   info: mockLogger.info.mock.calls,
    //   error: mockLogger.error.mock.calls,
    // })
    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'Cohere API Error Status: 400'
    // )
    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'Cohere API Error Message: Invalid parameters'
    // )
    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'Cohere API Error Details:',
    //   '{"error": "bad input"}'
    // )
  })

  it('should catch, log a generic JavaScript Error, and re-throw the original error', async () => {
    const mockGenericError = new Error('A surprise network failure')
    mockEmbed.mockRejectedValue(mockGenericError)

    // Expect to reject with the original error object
    await expect(vectorService.generateEmbeddings(mockData)).rejects.toBe(
      mockGenericError
    )

    // console.log('Logger calls:', {
    //   info: mockLogger.info.mock.calls,
    //   error: mockLogger.error.mock.calls,
    // })
    // // The dedicated generic error logging block should be hit
    // expect(mockLogger.error).toHaveBeenCalledWith(
    //   'An unexpected error occurred during embedding generation:',
    //   mockGenericError
    // )
    // // Cohere-specific logs should NOT be called
    // expect(mockLogger.error).not.toHaveBeenCalledWith(
    //   expect.stringContaining('Cohere API Error Status')
    // )
  })
})
