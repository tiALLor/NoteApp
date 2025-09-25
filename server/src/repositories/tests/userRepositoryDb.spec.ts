import { createTestDatabase } from '@tests/utils/database'
import { selectAll, insertAll } from '@tests/utils/records'
import { wrapInRollbacks } from '@tests/utils/transactions'
import {
  fakeUserWithHash,
  fakeUserWithHashMatcher,
} from '@server/entities/tests/fakes'
import { userRepository } from '../userRepository'

const db = await wrapInRollbacks(createTestDatabase())
const repository = userRepository(db)

beforeEach(async () => {
  await db.deleteFrom('user').execute()
})

describe('create user', () => {
  it('should create user', async () => {
    const record = fakeUserWithHash({
      id: 10,
      lastLogin: new Date(),
    })

    const user = await repository.create(record)

    expect(user).toEqual({
      id: expect.any(Number),
      userName: record.userName,
    })

    // check directly in database
    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('id', '=', user.id)
    )

    expect(userInDatabase).toEqual(
      fakeUserWithHashMatcher({ ...record, id: user.id })
    )
    // expect(userInDatabase).toMatchObject({
    //   ...record,
    //   id: user.id,
    //   createdAt: expect.anything(),
    //   updatedAt: expect.anything(),
    //   lastLogin: null,
    // })
  })
})

describe('getById', () => {
  it('should return a user according to provided Id', async () => {
    const [userTwo] = await insertAll(db, 'user', [fakeUserWithHash()])
    const user = await repository.getById(userTwo.id)

    expect(user).toEqual({
      ...userTwo,
    })
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getById(9999999)

    expect(user).toBeUndefined()
  })
})

describe('getByUserName', () => {
  it('should return a user according to provided userName', async () => {
    const [userTwo] = await insertAll(db, 'user', [fakeUserWithHash()])
    const user = await repository.getByUserName(userTwo.userName)

    expect(user).toEqual({
      ...userTwo,
    })
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getByUserName('someFakeName')

    expect(user).toBeUndefined()
  })
})

describe('getByEmail', () => {
  it('should return a user according to provided email', async () => {
    const [userOne] = await insertAll(db, 'user', [fakeUserWithHash()])
    const user = await repository.getByEmail(userOne.email)

    expect(user).toEqual(userOne)
  })

  it('should return undefined if user do not exist', async () => {
    const user = await repository.getByEmail('some@fake.email.com')

    expect(user).toBeUndefined()
  })
})

describe('change password', () => {
  it('should change the password ', async () => {
    const record = fakeUserWithHash({
      passwordHash: 'some_password_123',
    })

    const user = await repository.create(record)

    const result = await repository.updatePassword({
      id: user.id,
      passwordHash: 'newPassword987',
    })

    expect(result).toEqual({ id: user.id, userName: record.userName })

    const [userInDatabase] = await selectAll(db, 'user', (eb) =>
      eb('id', '=', user.id)
    )

    expect(userInDatabase.passwordHash).toEqual('newPassword987')
  })

  it('should throw a error if user do not exist ', async () => {
    const record = {
      id: 999999,
      passwordHash: 'somePassword',
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
      fakeUserWithHash({
        email: 'toBe@deleted.com',
      })
    )

    const result = await repository.deleteUserByEmail('toBe@deleted.com')

    expect(result).toEqual({
      id: userToBeDeleted.id,
      userName: userToBeDeleted.userName,
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
    const [userToBeDeleted] = await insertAll(db, 'user', fakeUserWithHash())

    const result = await repository.deleteUserById(userToBeDeleted.id)

    expect(result).toEqual({
      id: userToBeDeleted.id,
      userName: userToBeDeleted.userName,
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

  describe('setLoginDateTimeByIdById', () => {
    it('should return a user with updated lastLogin for user with Id', async () => {
      // arrange
      const loginDateTime = new Date().toISOString()
      const [userTwo] = await insertAll(db, 'user', [fakeUserWithHash()])

      // act
      const user = await repository.setLoginDateTimeById(
        userTwo.id,
        loginDateTime
      )

      expect(user?.lastLogin?.toISOString()).toBe(loginDateTime)
    })

    it('should return undefined if user do not exist', async () => {
      const user = await repository.getById(9999999)

      expect(user).toBeUndefined()
    })
  })
})
