import { createTestDatabase } from '@tests/utils/database'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { createCallerFactory } from '@server/trpc'
import { selectAll, insertAll } from '@tests/utils/records'
import { fakeUser } from '@server/entities/tests/fakes'
import { authContext } from '@tests/utils/context'
import { authUserSchemaWithRoleName } from '@server/entities/user'
import userRouter from '@server/controllers/user'
import { getPasswordHash } from '@server/utils/hash'

const db = await wrapInRollbacks(createTestDatabase())
const createCaller = createCallerFactory(userRouter)

const PASSWORD_CORRECT = 'Password.098'
const HASH_PASSWORD_CORRECT = await getPasswordHash(PASSWORD_CORRECT)

const [userOne] = await insertAll(db, 'user', [
  fakeUser({ password: HASH_PASSWORD_CORRECT }),
])

const { removeUser } = createCaller(
  authContext(
    { db },
    authUserSchemaWithRoleName.parse({ ...userOne, roleName: 'user' })
  )
)

it('should allow user to delete the user', async () => {
  const data = {
    password: PASSWORD_CORRECT,
  }

  const result = await removeUser(data)

  expect(result).toEqual({ id: userOne.id })

  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userOne.email)
  )

  expect(userInDatabase).toBeUndefined()
})

it('should throw a error if password do not match authUser', async () => {
  const data = {
    password: 'some_password',
  }

  await expect(removeUser(data)).rejects.toThrow(/password/i)
})
