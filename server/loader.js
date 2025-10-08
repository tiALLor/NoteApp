import { isBuiltin } from 'node:module'
import { dirname } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import resolveCallback from 'resolve/async.js'

const resolveAsync = promisify(resolveCallback)

const baseURL = pathToFileURL(cwd() + '/').href

/**
 * Node's ESM specifier resolution, modified for Subpath Exports.
 */
export async function resolve(specifier, context, next) {
  const { parentURL = baseURL } = context

  if (isBuiltin(specifier)) {
    return next(specifier, context)
  } // special case for the kysely module to fix the module resolution

  if (specifier === 'kysely') {
    return next(specifier, context)
  }

  // If the specifier is an absolute path, URL, or package name:
  // (e.g. 'pgvector/pg', 'lodash', 'file:///path/to/file.js')
  // DO NOT TRY TO RESOLVE IT WITH 'resolve', but let Node.js handle it.
  // This resolves the 'pgvector/pg' error because Node.js natively knows how Subpath Exports work.
  if (
    !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.startsWith('file://')
  ) {
    // will cover'pgvector/pg'
    return next(specifier, context)
  }

  // If the specifier is a URL, it will be converted to a path.
  if (specifier.startsWith('file://')) {
    specifier = fileURLToPath(specifier)
  }
  const parentPath = fileURLToPath(parentURL)
  console.log(parentPath)

  let url
  try {
    // Run CommonJS resolution only for relative paths (. / ..)
    const resolution = await resolveAsync(specifier, {
      basedir: dirname(parentPath),
      // If you are sure that '.mjs' modules should be resolved this way, leave them.
      extensions: ['.js', '.json', '.node', '.mjs'],
    })
    url = pathToFileURL(resolution).href
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      error.code = 'ERR_MODULE_NOT_FOUND'
    }
    throw error
  }

  return next(url, context)
}
