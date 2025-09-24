import createApp from './app'
import { createDatabase } from './database'
import config from './config'
import logger from './utils/logger'

const database = createDatabase(config.database)

try {
  await database.selectFrom('user').selectAll().execute()
  logger.info('Database is running!')
} catch (error) {
  logger.error('Database connection failed:', error)
  logger.error('Check is database is running and migration to latest')
}

const app = createApp(database)

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  logger.info(`Server is running at http://localhost:${config.port}`)
})
