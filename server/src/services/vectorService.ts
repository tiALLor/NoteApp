import config from '@server/config'
import { CohereClientV2, CohereTimeoutError, CohereError } from 'cohere-ai'
import logger from '../utils/logger'

type InputType =
  | 'search_document'
  | 'search_query'
  | 'classification'
  | 'clustering'
  | 'image'

type EmbeddingType = 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary'

export const vectorSize = 1536

export class VectorService {
  #client: CohereClientV2

  constructor(apiKey: string = config.auth.botApiKey) {
    const resolvedApiKey = apiKey ?? config.auth.botApiKey

    if (!resolvedApiKey) {
      throw new Error(
        'Cohere API key is required. Pass it as a parameter or set COHERE_API_KEY environment variable.'
      )
    }

    this.#client = new CohereClientV2({
      // cohere-ai is using token instead of apiKey
      token: resolvedApiKey,
    })
  }

  async generateEmbeddings(
    data: string[],
    inputType: InputType = 'search_document',
    embeddingTypes: EmbeddingType = 'float'
  ): Promise<{ content: string; embedding: number[] }[]> {
    const model = 'embed-v4.0'

    let res

    try {
      logger.info('Contacted Cohere')
      res = await this.#client.embed({
        texts: data,
        model,
        inputType,
        embeddingTypes: [embeddingTypes],
      })

      const embeddingsForType = res.embeddings[embeddingTypes]

      if (
        !res.texts ||
        !embeddingsForType ||
        embeddingsForType.length !== data.length
      ) {
        logger.error('Returned embeddings are missing or malformed')
        throw new Error('Embedding response invalid')
      }
      return res.texts.map((text: string, index: number) => ({
        content: text,
        // Asserting the type to satisfy the Promise return signature
        embedding: embeddingsForType[index] as number[],
      }))

      // const texts: string[] = [...res.texts]
      // const embeddings: number[][] = [...res.embeddings[embeddingTypes]]

      // return texts.map((text: string, index: number) => ({
      //   content: text,
      //   embedding: embeddings[index],
      // }))
    } catch (err) {
      if (err instanceof CohereTimeoutError) {
        logger.error('Request timed out with CohereTimeoutError', err)
      } else if (err instanceof CohereError) {
        // Log all Cohere-specific error details
        logger.error(`Cohere API Error Status: ${err.statusCode}`)
        logger.error(`Cohere API Error Message: ${err.message}`)
        logger.error('Cohere API Error Details:', err.body)
      } else if (err instanceof Error) {
        logger.error(
          'An unexpected error occurred during embedding generation:',
          err
        )
      } else {
        logger.error(
          'An unknown error occurred during embedding generation:',
          err
        )
      }
      throw err // Re-throw the original error object
    }
  }
}
