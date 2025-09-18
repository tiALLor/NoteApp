import { omit } from 'lodash-es'
import {
  userSchema,
  userInsertable,
  changePasswordSchema,
  authUserSchemaWithRoleName,
} from '../user'
import { fakeUser } from './fakes'

describe('userSchema - schema parse', () => {
  it('should validate user correctly', async () => {
    const record = fakeUser({
      id: 123,
    })

    expect(userSchema.parse(record)).toEqual(record)
  })

  it('should parse email correctly', async () => {
    const record = {
      id: 111,
      name: 'John Doe',
      email: 'ABF@mail.com',
      password: 'OK password ',
      roleId: 3,
    }

    expect(userSchema.parse(record)).toEqual({
      ...record,
      email: 'abf@mail.com',
    })
  })

  it('should throw a error by missing value', async () => {
    expect(() => userSchema.parse(fakeUser())).toThrow(/id/i)

    expect(() => userSchema.parse(omit(fakeUser({ id: 1 }), ['name']))).toThrow(
      /name/i
    )

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['email']))
    ).toThrow(/email/i)

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['password']))
    ).toThrow(/password/i)

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['roleId']))
    ).toThrow(/roleId/i)
  })

  it('should throw a error by empty value', async () => {
    // @ts-expect-error
    expect(() => userSchema.parse(fakeUser({ id: '' }))).toThrow(/id/i)

    expect(() => userSchema.parse(fakeUser({ id: 1, name: ' ' }))).toThrow(
      /name/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, email: ' ' }))).toThrow(
      /email/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, password: ' ' }))).toThrow(
      /password/i
    )

    // @ts-expect-error
    expect(() => userSchema.parse(fakeUser({ id: 1, roleId: '' }))).toThrow(
      /roleId/i
    )
  })

  it('should throw a error by incorrect id', async () => {
    expect(() => userSchema.parse(fakeUser({ id: 0 }))).toThrow(/id/i)
  })

  it('should throw a error by incorrect mail', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, email: 'abcdefg' }))
    ).toThrow(/email/i)

    expect(() =>
      userSchema.parse(fakeUser({ id: 1, email: '@mail.com' }))
    ).toThrow(/email/i)

    expect(() =>
      userSchema.parse(fakeUser({ id: 1, email: 'abcdefg@abcdefg' }))
    ).toThrow(/email/i)
  })

  it('should throw a error by incorrect password', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, password: 'qwerty' }))
    ).toThrow(/password/i)
  })

  it('should throw a error by incorrect roleId', async () => {
    expect(() => userSchema.parse(fakeUser({ id: 1, roleId: 999999 }))).toThrow(
      /roleId/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, roleId: 0 }))).toThrow(
      /roleId/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, roleId: 4 }))).toThrow(
      /roleId/i
    )
  })
})

describe('insertableUser', () => {
  it('should parse insertable correctly', async () => {
    const record = {
      name: 'John Doe',
      email: 'ABF@mail.com',
      password: 'OK password ',
      roleId: 3,
    }

    expect(userInsertable.parse(record)).toEqual({
      name: 'John Doe',
      email: 'abf@mail.com',
      password: 'OK password ',
      roleId: 3,
    })
  })
})

describe('changePasswordSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = {
      oldPassword: 'qwerty123',
      newPassword: 'password123',
      confirmNewPassword: 'password123',
    }

    expect(changePasswordSchema.parse(record)).toEqual({
      oldPassword: 'qwerty123',
      newPassword: 'password123',
      confirmNewPassword: 'password123',
    })
  })

  it('should throw a error if new and confirm not match', async () => {
    const record = {
      oldPassword: 'qwerty123',
      newPassword: 'password123',
      confirmNewPassword: 'password1234',
    }

    expect(() => changePasswordSchema.parse(record)).throw(
      /Passwords do not match/i
    )
  })

  it('should throw a error if old password is missing', async () => {
    const record = {
      newPassword: 'password123',
      confirmNewPassword: 'password1234',
    }

    expect(() => changePasswordSchema.parse(record)).throw(/oldPassword/i)
  })

  it('should throw a error if new password does not meet requirements', async () => {
    const record = {
      oldPassword: 'qwerty123',
      newPassword: 'pass123',
      confirmNewPassword: 'pass123',
    }

    expect(() => changePasswordSchema.parse(record)).throw(/newPassword/i)
  })
})

describe('authUserSchemaWithRoleName', () => {
  it('should return authUser with role name', async () => {
    const record = {
      id: 1,
      name: 'someName',
      roleName: 'user',
    }

    expect(authUserSchemaWithRoleName.parse(record)).toEqual(record)
  })

  it('should throw a error with wrong roleName', async () => {
    const record = {
      id: 1,
      name: 'someName',
      roleName: 'some Role',
    }

    expect(() => authUserSchemaWithRoleName.parse(record)).throw(/roleName/i)
  })
})
