import { it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import bcrypt from 'bcrypt'
import jsonwebtoken from 'jsonwebtoken'
import { TRPCError } from '@trpc/server'
import { type UserPublic } from '@server/entities/user'
import type { Database } from '@server/database'
import logger from '@server/utils/logger'
import * as tokenPayloadModule from '@server/trpc/tokenPayload'
import { AuthService } from '../authService'

// Mock dependencies
vi.mock('bcrypt')
vi.mock('jsonwebtoken')
vi.mock('@server/config', () => ({
  default: {
    auth: {
      tokenKey: 'test-token-key',
      refreshTokenKey: 'test-refresh-token-key',
      tokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
      passwordPepper: 'test-pepper',
      passwordCost: 10,
    },
  },
}))

vi.mock('@server/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock repository
const mockUserRepository = {
  getByEmail: vi.fn(),
  getByUserName: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  updatePassword: vi.fn(),
  deleteUserById: vi.fn(),
  setLoginDateTimeById: vi.fn(),
}

vi.mock('@server/repositories/userRepository', () => ({
  userRepository: () => mockUserRepository,
}))

// Mock token payload functions
vi.mock('@server/trpc/tokenPayload')
// TODO: clean up code
// vi.mock('@server/trpc/tokenPayload', () => ({
//   prepareTokenPayload: vi.fn().mockReturnValue({
//     user: { id: 1, userName: 'test-user' },
//     type: 'access',
//   }),
//   parseTokenPayload: vi.fn().mockReturnValue({
//     user: { id: 1, userName: 'test-user' },
//     type: 'refresh',
//   }),
// }))

let authService: AuthService
let mockDatabase: Database

const fakeTestUserWithHash = {
  id: 1,
  email: 'test@example.com',
  userName: 'test-user',
  passwordHash: 'hashed-password',
}

const testUserPublic: UserPublic = {
  id: fakeTestUserWithHash.id,
  userName: fakeTestUserWithHash.userName,
}

// TODO: clean up code
// const testTokens: AuthTokens = {
//   accessToken: 'access-token',
//   refreshToken: 'refresh-token',
// }

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  mockDatabase = {} as Database
  authService = new AuthService(mockDatabase)

  // Setup default mock implementations
  ;(bcrypt.hash as Mock).mockResolvedValue('hashed-password')
  ;(bcrypt.compare as Mock).mockResolvedValue(true)
  ;(jsonwebtoken.sign as Mock).mockReturnValue('jwt-token')
  ;(jsonwebtoken.verify as Mock).mockReturnValue({
    user: testUserPublic,
    type: 'access',
  })
  ;(tokenPayloadModule.prepareTokenPayload as Mock).mockReturnValue({
    user: testUserPublic,
    type: 'access',
  })
  ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue({
    user: testUserPublic,
    type: 'refresh',
  })
})

afterEach(() => {
  vi.resetAllMocks()
})
// ===========================================
// SIGNUP TESTS
// ===========================================
describe('signup', () => {
  it('should successfully create a new user', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(null)
    mockUserRepository.getByUserName.mockResolvedValue(null)
    mockUserRepository.create.mockResolvedValue(fakeTestUserWithHash)

    // Act
    const result = await authService.signup(
      'test@example.com',
      'test-user',
      'password123'
    )

    // Assert
    expect(result).toEqual(testUserPublic)

    expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(
      'test@example.com'
    )
    expect(mockUserRepository.getByUserName).toHaveBeenCalledWith('test-user')
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      userName: 'test-user',
      passwordHash: 'hashed-password',
    })
    expect(bcrypt.hash).toHaveBeenCalledWith('password123test-pepper', 10)
  })

  it('should throw error if email already exists', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(fakeTestUserWithHash)

    // Act & Assert
    await expect(
      authService.signup('test@example.com', 'test-user', 'password123')
    ).rejects.toThrow(TRPCError)

    const error = await authService
      .signup('test@example.com', 'test-user', 'password123')
      .catch((err) => err)

    expect(error.code).toBe('BAD_REQUEST')
    expect(error.message).toBe('User with this email already exists')
  })

  it('should throw error if username already exists', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(null)
    mockUserRepository.getByUserName.mockResolvedValue(fakeTestUserWithHash)

    // Act & Assert
    await expect(
      authService.signup('test@example.com', 'test-user', 'password123')
    ).rejects.toThrow(TRPCError)

    const error = await authService
      .signup('test@example.com', 'test-user', 'password123')
      .catch((err) => err)

    expect(error.code).toBe('BAD_REQUEST')
    expect(error.message).toBe('Username is already taken')
  })

  it('should handle database duplicate key error', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(null)
    mockUserRepository.getByUserName.mockResolvedValue(null)
    mockUserRepository.create.mockRejectedValue(
      new Error('duplicate key violation')
    )

    // Act & Assert
    const error = await authService
      .signup('test@example.com', 'test-user', 'password123')
      .catch((err) => err)

    expect(error.code).toBe('BAD_REQUEST')
    expect(error.message).toBe('User with this email already exists')
  })

  it('should rethrow non-duplicate key database errors', async () => {
    // Arrange
    const dbError = new Error('Database connection failed')
    mockUserRepository.create.mockRejectedValue(dbError)

    // Act & Assert
    await expect(
      authService.signup('test@example.com', 'test-user', 'password123')
    ).rejects.toThrow('Database connection failed')
  })
})

// ===========================================
// LOGIN TESTS
// ===========================================
describe('login', () => {
  beforeEach(() => {
    // Setup token generation mocks
    ;(jsonwebtoken.sign as Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token')
  })

  it('should successfully login with valid credentials', async () => {
    // Arrange
    ;(bcrypt.compare as Mock).mockResolvedValue(true)

    mockUserRepository.getByEmail.mockResolvedValue(fakeTestUserWithHash)

    const loginDateTime = new Date().toISOString()
    mockUserRepository.setLoginDateTimeById.mockResolvedValue(loginDateTime)

    // Act
    const result = await authService.login('test@example.com', 'password123')

    // Assert
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: testUserPublic,
    })
    expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(
      'test@example.com'
    )
    const [[calledId, calledDate]] =
      mockUserRepository.setLoginDateTimeById.mock.calls

    expect(calledId).toBe(fakeTestUserWithHash.id)
    expect(new Date(calledDate).getTime()).toBeCloseTo(
      new Date(loginDateTime).getTime(),
      -2
    )

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123test-pepper',
      'hashed-password'
    )
  })

  it('should generate tokens with correct payload', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(fakeTestUserWithHash)

    // Act
    await authService.login('test@example.com', 'password123')

    // Assert
    expect(tokenPayloadModule.prepareTokenPayload).toHaveBeenCalledWith({
      user: testUserPublic,
      type: 'access',
    })
    expect(tokenPayloadModule.prepareTokenPayload).toHaveBeenCalledWith({
      user: testUserPublic,
      type: 'refresh',
    })
    expect(jsonwebtoken.sign).toHaveBeenCalledTimes(2)
  })

  it('should throw error for non-existent user', async () => {
    // Arrange
    mockUserRepository.getByEmail.mockResolvedValue(null)

    // Act & Assert
    const error = await authService
      .login('nonexistent@example.com', 'password123')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid email or password')
  })

  it('should throw error for invalid password', async () => {
    // Arrange
    ;(bcrypt.compare as Mock).mockResolvedValue(false)

    mockUserRepository.getByEmail.mockResolvedValue(fakeTestUserWithHash)

    // Act & Assert
    const error = await authService
      .login('test@example.com', 'wrongpassword')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid email or password')
    expect(logger.warn).toHaveBeenCalledWith(
      `${fakeTestUserWithHash.id}: 'invalid_password`
    )
  })
})

// ===========================================
// REFRESH TOKEN TESTS
// ===========================================
describe('refreshTokens', () => {
  beforeEach(() => {
    ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue({
      user: testUserPublic,
      type: 'refresh',
    })
  })

  it('should successfully refresh tokens', async () => {
    // Arrange
    ;(jsonwebtoken.verify as Mock).mockReturnValue({
      user: testUserPublic,
      type: 'refresh',
    })
    ;(jsonwebtoken.sign as Mock)
      .mockReturnValueOnce('new-access-token')
      .mockReturnValueOnce('new-refresh-token')

    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)

    // Act
    const result = await authService.refreshTokens('valid-refresh-token')

    // Assert
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })
    expect(jsonwebtoken.verify).toHaveBeenCalledWith(
      'valid-refresh-token',
      'test-refresh-token-key'
    )
    expect(mockUserRepository.getById).toHaveBeenCalledWith(
      fakeTestUserWithHash.id
    )
  })

  it('should throw error for invalid refresh token', async () => {
    // Arrange
    ;(jsonwebtoken.verify as Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    // Act & Assert
    const error = await authService
      .refreshTokens('invalid-refresh-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid or expired refresh token')
  })

  it('should throw error if user no longer exists', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(null)

    // Act & Assert
    const error = await authService
      .refreshTokens('valid-refresh-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid or expired refresh token')
  })

  it('should handle incorrect token type validation (BUG TEST)', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue({
      user: testUserPublic,
      type: 'access', // This should be 'refresh' for refresh tokens
    })

    // Act & Assert
    const error = await authService
      .refreshTokens('refresh-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
  })
})

// ===========================================
// CHANGE PASSWORD TESTS
// ===========================================
describe('changePassword', () => {
  it('should successfully change password', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    mockUserRepository.updatePassword.mockResolvedValue(testUserPublic)
    ;(bcrypt.compare as Mock).mockResolvedValue(true)
    ;(bcrypt.hash as Mock).mockResolvedValue('new-hashed-password')

    // Act
    const result = await authService.changePassword(
      1,
      'oldpassword',
      'newpassword'
    )

    // Assert
    expect(result).toEqual(testUserPublic)
    expect(mockUserRepository.getById).toHaveBeenCalledWith(1)
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'oldpasswordtest-pepper',
      'hashed-password'
    )
    expect(bcrypt.hash).toHaveBeenCalledWith('newpasswordtest-pepper', 10)
    expect(mockUserRepository.updatePassword).toHaveBeenCalledWith({
      id: 1,
      passwordHash: 'new-hashed-password',
    })
  })

  it('should throw error if user not found', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(null)

    // Act & Assert
    const error = await authService
      .changePassword(999, 'oldpassword', 'newpassword')
      .catch((err) => err)

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('User not found')
  })
  it('should throw error if old password is incorrect', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    ;(bcrypt.compare as Mock).mockResolvedValue(false)

    // Act & Assert
    const error = await authService
      .changePassword(1, 'wrongpassword', 'newpassword')
      .catch((e) => e)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Old password is incorrect')
  })
})

// ===========================================
// REMOVE USER TESTS
// ===========================================
describe('removeUser', () => {
  it('should successfully remove user', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    mockUserRepository.deleteUserById.mockResolvedValue(testUserPublic)
    ;(bcrypt.compare as Mock).mockResolvedValue(true)

    // Act
    const result = await authService.removeUser(1, 'password123')

    // Assert
    expect(result).toEqual(testUserPublic)
    expect(mockUserRepository.getById).toHaveBeenCalledWith(1)
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123test-pepper',
      'hashed-password'
    )
    expect(mockUserRepository.deleteUserById).toHaveBeenCalledWith(1)
  })
  it('should throw error if user not found', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(null)

    // Act & Assert
    const error = await authService
      .removeUser(999, 'password123')
      .catch((err) => err)

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('User not found')
  })

  it('should throw error if password is incorrect', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    ;(bcrypt.compare as Mock).mockResolvedValue(false)

    // Act & Assert
    const error = await authService
      .removeUser(1, 'wrongpassword')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Password is incorrect')
  })

  it('should throw error if user deletion fails', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    mockUserRepository.deleteUserById.mockResolvedValue(null)
    ;(bcrypt.compare as Mock).mockResolvedValue(true)

    // Act & Assert
    const error = await authService.removeUser(1, 'password123').catch((e) => e)

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('could not find user with user.id')
  })
})

// ===========================================
// VERIFY ACCESS TOKEN TESTS
// ===========================================
describe('verifyAccessToken', () => {
  it('should successfully verify access token', async () => {
    // Arrange
    const tokenPayload = { user: testUserPublic, type: 'access' }
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue(
      tokenPayload
    )

    // Act
    const result = await authService.verifyAccessToken('valid-access-token')

    // Assert
    expect(result).toEqual(tokenPayload)
    expect(jsonwebtoken.verify).toHaveBeenCalledWith(
      'valid-access-token',
      'test-token-key'
    )
    expect(mockUserRepository.getById).toHaveBeenCalledWith(
      fakeTestUserWithHash.id
    )
  })

  it('should throw error for invalid access token', async () => {
    // Arrange
    ;(jsonwebtoken.verify as Mock).mockImplementation(() => {
      throw new Error('Invalid token')
    })

    // Act & Assert
    const error = await authService
      .verifyAccessToken('invalid-access-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid or expired access token')
  })

  it('should throw error if user no longer exists', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(null)
    ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue({
      user: testUserPublic,
      type: 'access',
    })

    // Act & Assert
    const error = await authService
      .verifyAccessToken('valid-access-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Invalid or expired access token')
  })

  it('should handle incorrect token type validation (BUG TEST)', async () => {
    // Arrange
    mockUserRepository.getById.mockResolvedValue(fakeTestUserWithHash)
    ;(tokenPayloadModule.parseTokenPayload as Mock).mockReturnValue({
      user: testUserPublic,
      type: 'refresh', // This should be 'access' for access tokens
    })

    // Act & Assert
    const error = await authService
      .verifyAccessToken('access-token')
      .catch((err) => err)

    expect(error.code).toBe('UNAUTHORIZED')
  })

  // ===========================================
  // STATIC METHOD TESTS
  // ===========================================
  describe('static methods', () => {
    describe('getPasswordHash', () => {
      it('should hash password with pepper', async () => {
        // Arrange
        ;(bcrypt.hash as Mock).mockResolvedValue('hashed-result')

        // Act
        const result = await authService.getPasswordHash('password')

        // Assert
        expect(result).toBe('hashed-result')
        expect(bcrypt.hash).toHaveBeenCalledWith('passwordtest-pepper', 10)
      })
    })

    describe('verifyPassword', () => {
      it('should verify password with pepper', async () => {
        // Arrange
        ;(bcrypt.compare as Mock).mockResolvedValue(true)

        // Act
        const result = await (AuthService as any).verifyPassword(
          'password',
          'pepper',
          'hash'
        )

        // Assert
        expect(result).toBe(true)
        expect(bcrypt.compare).toHaveBeenCalledWith('passwordpepper', 'hash')
      })
    })
  })
})
