import { omit } from 'lodash-es'
import {
  userSchema,
  userInsertable,
  changePasswordSchema,
  userPublicSchema,
} from '../user'
import { fakeUser } from './fakes'

describe('userSchema - schema parse', () => {
  it('should validate user correctly', async () => {
    const record = fakeUser({ id: 123 })

    expect(userSchema.parse(record)).toEqual(record)
  })

  it('should parse email correctly', async () => {
    const record = {
      id: 111,
      userName: 'John Doe',
      email: 'ABF@mail.com',
      password: 'OKpassword123.',
    }

    expect(userSchema.parse(record)).toEqual({
      ...record,
      email: 'abf@mail.com',
    })
  })

  it('should throw a error by missing value', async () => {
    expect(() => userSchema.parse(fakeUser())).toThrow(/id/i)

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['userName']))
    ).toThrow(/name/i)

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['email']))
    ).toThrow(/email/i)

    expect(() =>
      userSchema.parse(omit(fakeUser({ id: 1 }), ['password']))
    ).toThrow(/password/i)
  })

  it('should throw a error by empty value', async () => {
    // @ts-expect-error
    expect(() => userSchema.parse(fakeUser({ id: '' }))).toThrow(/id/i)

    expect(() => userSchema.parse(fakeUser({ id: 1, userName: ' ' }))).toThrow(
      /name/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, email: ' ' }))).toThrow(
      /email/i
    )

    expect(() => userSchema.parse(fakeUser({ id: 1, password: ' ' }))).toThrow(
      /password/i
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

  it('should throw a error by incorrect password - length', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, password: 'Qwe123!' }))
    ).toThrow(/password/i)
  })

  it('should throw a error by incorrect password - uppercase', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, password: 'qwerty123!' }))
    ).toThrow(/password/i)
  })

  it('should throw a error by incorrect password - lowercase', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, password: 'QWERTY123!' }))
    ).toThrow(/password/i)
  })

  it('should throw a error by incorrect password - special symbol', async () => {
    expect(() =>
      userSchema.parse(fakeUser({ id: 1, password: 'QWERTY123!' }))
    ).toThrow(/password/i)
  })
})

describe('insertableUser', () => {
  it('should parse insertable correctly', async () => {
    const record = {
      userName: 'John Doe',
      email: 'ABF@mail.com',
      password: 'OKpassword123.',
    }

    expect(userInsertable.parse(record)).toEqual({
      userName: 'John Doe',
      email: 'abf@mail.com',
      password: 'OKpassword123.',
    })
  })
})

describe('changePasswordSchema', () => {
  it('should parse updateable correctly', async () => {
    const record = {
      oldPassword: 'Qwerty123.',
      newPassword: 'Password123!',
      confirmNewPassword: 'Password123!',
    }

    expect(changePasswordSchema.parse(record)).toEqual({
      oldPassword: 'Qwerty123.',
      newPassword: 'Password123!',
      confirmNewPassword: 'Password123!',
    })
  })

  it('should throw a error if new and confirm password not match', async () => {
    const record = {
      oldPassword: 'Qwerty123.',
      newPassword: 'Password123!',
      confirmNewPassword: 'password1234',
    }

    expect(() => changePasswordSchema.parse(record)).throw(
      /Passwords do not match/i
    )
  })
  it('should throw a error if new and old password match', async () => {
    const record = {
      oldPassword: 'Qwerty123.',
      newPassword: 'Qwerty123.',
      confirmNewPassword: 'Qwerty123.',
    }

    expect(() => changePasswordSchema.parse(record)).throw(
      /New password cannot match old/i
    )
  })

  it('should throw a error if old password is missing', async () => {
    const record = {
      newPassword: 'Password123!',
      confirmNewPassword: 'Password123!',
    }

    expect(() => changePasswordSchema.parse(record)).throw(/oldPassword/i)
  })

  it('should throw a error if old password does not meet requirements', async () => {
    const record = {
      oldPassword: 'qerty123',
      newPassword: 'Password123!',
      confirmNewPassword: 'Password123!',
    }

    expect(() => changePasswordSchema.parse(record)).throw(/oldPassword/i)
  })

  it('should throw a error if new password does not meet requirements', async () => {
    const record = {
      oldPassword: 'Qwerty123.',
      newPassword: 'pass123',
      confirmNewPassword: 'pass123',
    }

    expect(() => changePasswordSchema.parse(record)).throw(/newPassword/i)
  })
})

describe('userPublicSchema', () => {
  it('should return userPublic', async () => {
    const record = { id: 1, userName: 'someName' }

    expect(userPublicSchema.parse(record)).toEqual(record)
  })
})
