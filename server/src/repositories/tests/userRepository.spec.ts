import { createTestDatabase } from '@tests/utils/database'
import { selectAll, insertAll } from '@tests/utils/records'
import { wrapInRollbacks } from '@tests/utils/transactions'
import { fakeUser } from '@server/entities/tests/fakes'
import { userRepository } from '../userRepository'

const db = await wrapInRollbacks(createTestDatabase())
const repository = userRepository(db)

beforeEach(async () => {

  await db.deleteFrom('order').execute()
  await db.deleteFrom('menu').execute()
  await db.deleteFrom('meal').execute()
  await db.deleteFrom('user').execute()
})

describe('create user', () => {
  it('should create user', async () => {
    const record = fakeUser({ id: 10 })

    const user = await repository.create(record)

    expect(user).toEqual({
      id: expect.any(Number),
      name: record.name,
    })

    // check directly in database
    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('id', '=', user.id)
    )
    expect(userInDatabase).toEqual({ ...record, id: user.id })
  })

  it('should throw a error in case of not existing roleId', async () => {
    const record = fakeUser({
      id: 11,
      roleId: 999999,
    })
    await expect(() => repository.create(record)).rejects.toThrow(/role_id/i)
  })
})

describe('getByEmail', () => {
  it('should return a user according to provided email', async () => {
    const [userOne] = await insertAll(db, 'user', [fakeUser()])
    const user = await repository.getByEmail(userOne.email)

    expect(user).toEqual(userOne)
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getByEmail('some@fake.email.com')

    expect(user).toBeUndefined()
  })
})

describe('getByEmailWithRoleName', () => {
  it('should return a user according to provided email', async () => {
    const [userOne] = await insertAll(db, 'user', [fakeUser()])
    const user = await repository.getByEmailWithRoleName(userOne.email)

    expect(user).toEqual({
      ...userOne,
      roleName: 'user',
    })
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getByEmailWithRoleName('some@fake.email.com')

    expect(user).toBeUndefined()
  })
})

describe('getByIdWithRoleName', () => {
  it('should return a user according to provided Id', async () => {
    const [userTwo] = await insertAll(db, 'user', [fakeUser()])
    const user = await repository.getByIdWithRoleName(userTwo.id)

    expect(user).toEqual({
      ...userTwo,
      roleName: 'user',
    })
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getById(9999999)

    expect(user).toBeUndefined()
  })
})

describe('change password', () => {
  it('should change the password ', async () => {
    const record = fakeUser({
      password: 'some_password_123',
    })

    const user = await repository.create(record)

    const result = await repository.updatePassword({
      id: user.id,
      password: 'newPassword987',
    })

    expect(result).toEqual({ id: user.id, name: record.name })

    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('id', '=', user.id)
    )
    expect(userInDatabase.password).toEqual('newPassword987')
  })

  it('should throw a error if user do not exist ', async () => {
    const record = {
      id: 999999,
      password: 'somePassword',
    }

    await expect(repository.updatePassword(record)).rejects.toThrow(
      /Not Found/i
    )
  })
})

describe('deleteUserByEmail', () => {
  it('should delete a user base on email', async () => {
    const [userToBeDeleted] = await insertAll(
      db,
      'user',
      fakeUser({
        email: 'toBe@deleted.com',
      })
    )

    const result = await repository.deleteUserByEmail('toBe@deleted.com')

    expect(result).toEqual({
      id: userToBeDeleted.id,
      name: userToBeDeleted.name,
    })

    // check directly in database
    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('email', '=', userToBeDeleted.email)
    )
    expect(userInDatabase).toBeUndefined()
  })
  it('should return undefined if user do not exist', async () => {
    const result = await repository.deleteUserByEmail('some@fakeMail.com')

    expect(result).toBeUndefined()
  })
})

describe('deleteUserById', () => {
  it('should delete a user base on id', async () => {
    const [userToBeDeleted] = await insertAll(db, 'user', fakeUser())

    const result = await repository.deleteUserById(userToBeDeleted.id)

    expect(result).toEqual({
      id: userToBeDeleted.id,
      name: userToBeDeleted.name,
    })

    // check directly in database
    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('id', '=', userToBeDeleted.id)
    )
    expect(userInDatabase).toBeUndefined()
  })

  it('should return undefined if user do not exist', async () => {
    const result = await repository.deleteUserById(99999)

    expect(result).toBeUndefined()
  })
})
