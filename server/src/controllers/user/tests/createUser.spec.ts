import { createTestDatabase } from '@tests/utils/database'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { createCallerFactory } from '@server/trpc'
import { selectAll, insertAll } from '@tests/utils/records'
import { fakeUser } from '@server/entities/tests/fakes'
import { authContext } from '@tests/utils/context'
import { random } from '@tests/utils/random'
import { authUserSchemaWithRoleName } from '@server/entities/user'
import userRouter from '@server/controllers/user'

const db = await wrapInRollbacks(createTestDatabase())
const createCaller = createCallerFactory(userRouter)

const [userOne] = await insertAll(db, 'user', [fakeUser({ roleId: 1 })])

const { createUser } = createCaller(
  authContext(
    { db },
    authUserSchemaWithRoleName.parse({ ...userOne, roleName: 'admin' })
  )
)

it('should create a user with role chef', async () => {
  const userData = fakeUser({
    roleId: 2,
  })

  const result = await createUser({ ...userData, roleName: 'chef' })

  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userData.email)
  )

  expect(userInDatabase).toEqual({
    id: expect.any(Number),
    ...userData,
    password: expect.not.stringContaining(userData.password),
  })

  expect(userInDatabase.password).toHaveLength(60)

  expect(result).toEqual({
    id: userInDatabase.id,
    name: userInDatabase.name,
  })
})

it('should require a valid email', async () => {
  await expect(
    createUser({
      ...fakeUser({
        email: 'user-email-invalid',
      }),
      roleName: 'chef',
    })
  ).rejects.toThrow(/email/i) // throws out some error complaining about "email"
})

it('should require a password with at least 8 characters', async () => {
  await expect(
    createUser({
      ...fakeUser({
        password: 'pass12',
      }),
      roleName: 'chef',
    })
  ).rejects.toThrow(/password/i)
})

it('stores lowercased email', async () => {
  const userData = fakeUser({
    email: 'some@email.com',
  })

  await createUser({
    ...userData,
    email: userData.email.toUpperCase(),
    roleName: 'chef',
  })

  // get user with original lowercase email
  const [userInDatabase] = await selectAll(db, 'user', (eb) =>
    eb('email', '=', userData.email)
  )

  expect(userInDatabase.email).toBe('some@email.com')
})

it('stores email with trimmed whitespace', async () => {
  const user = fakeUser()
  await createUser({
    ...user,
    email: ` \t ${user.email}\t `, // tabs and spaces
    roleName: 'chef',
  })

  const userInDatabase = await selectAll(db, 'user', (eb) =>
    eb('email', '=', user.email)
  )

  expect(userInDatabase).toHaveLength(1)
})

it('throws an error for duplicate email', async () => {
  const email = random.email()

  // signup once
  await createUser({
    ...fakeUser({
      email,
    }),
    roleName: 'chef',
  })

  // expect that the second signup will throw an error
  await expect(
    createUser({
      ...fakeUser({
        email,
      }),
      roleName: 'chef',
    })
  ).rejects.toThrow(/email already exists/i)
})
