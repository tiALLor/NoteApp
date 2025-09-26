import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Database, User } from '@server/database'
import type { Selectable } from 'kysely'
import {
  userRepository,
  type UserRepository,
} from '@server/repositories/userRepository'
import type { UserWithHashInsertable, UserPublic } from '@server/entities/user'

// ===========================================
// MOCK SETUP
// ===========================================
describe('UserRepository', () => {
  let repository: UserRepository
  let mockDatabase: Database

  // Test data
  const testUserInsert: UserWithHashInsertable = {
    email: 'test@example.com',
    userName: 'testuser',
    passwordHash: 'hashed-password-123',
  }

  const testUserPublic: UserPublic = {
    id: 1,
    userName: 'testuser',
  }

  const testUserComplete: Selectable<User> = {
    id: 1,
    email: 'test@example.com',
    userName: 'testuser',
    passwordHash: 'hashed-password-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLogin: new Date(),
  }

  beforeEach(() => {
    // Create a fresh mock for each test
    const createMockQueryBuilder = (
      finalResult?: any,
      shouldThrow?: boolean
    ) => {
      const mockBuilder = {
        where: vi.fn(),
        select: vi.fn(),
        returning: vi.fn(),
        set: vi.fn(),
        values: vi.fn(),
        executeTakeFirst: vi.fn(),
        executeTakeFirstOrThrow: vi.fn(),
      }

      // Chain all methods to return the same builder
      mockBuilder.where.mockReturnValue(mockBuilder)
      mockBuilder.select.mockReturnValue(mockBuilder)
      mockBuilder.returning.mockReturnValue(mockBuilder)
      mockBuilder.set.mockReturnValue(mockBuilder)
      mockBuilder.values.mockReturnValue(mockBuilder)

      // Set up final execution methods
      if (shouldThrow) {
        mockBuilder.executeTakeFirst.mockRejectedValue(finalResult)
        mockBuilder.executeTakeFirstOrThrow.mockRejectedValue(finalResult)
      } else {
        mockBuilder.executeTakeFirst.mockResolvedValue(finalResult)
        mockBuilder.executeTakeFirstOrThrow.mockResolvedValue(finalResult)
      }

      return mockBuilder
    }

    // Create database mock with factory function
    mockDatabase = {
      insertInto: vi.fn(),
      selectFrom: vi.fn(),
      updateTable: vi.fn(),
      deleteFrom: vi.fn(),
    } as unknown as Database

    // Default setup - will be overridden per test
    ;(mockDatabase.insertInto as any).mockReturnValue(
      createMockQueryBuilder(testUserPublic)
    )
    ;(mockDatabase.selectFrom as any).mockReturnValue(
      createMockQueryBuilder(testUserComplete)
    )
    ;(mockDatabase.updateTable as any).mockReturnValue(
      createMockQueryBuilder(testUserPublic)
    )
    ;(mockDatabase.deleteFrom as any).mockReturnValue(
      createMockQueryBuilder(testUserPublic)
    )

    repository = userRepository(mockDatabase)
  })

  // ===========================================
  // CREATE USER TESTS
  // ===========================================
  describe('create', () => {
    it('should successfully create a new user and return public data', async () => {
      // Arrange - use default mock setup

      // Act
      const result = await repository.create(testUserInsert)

      // Assert
      expect(result).toEqual(testUserPublic)
      expect(mockDatabase.insertInto).toHaveBeenCalledWith('user')
    })

    it('should throw error when user creation fails', async () => {
      // Arrange - override mock for this specific test
      const dbError = new Error('Database constraint violation')
      const failingQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockRejectedValue(dbError),
        executeTakeFirstOrThrow: vi.fn().mockRejectedValue(dbError),
      }

      ;(mockDatabase.insertInto as any).mockReturnValue(failingQueryBuilder)

      // Act & Assert
      await expect(repository.create(testUserInsert)).rejects.toThrow(
        'Database constraint violation'
      )
      expect(mockDatabase.insertInto).toHaveBeenCalledWith('user')
      expect(failingQueryBuilder.values).toHaveBeenCalledWith(testUserInsert)
    })

    it('should handle empty/minimal user data', async () => {
      // Arrange
      const minimalUser: UserWithHashInsertable = {
        email: 'minimal@test.com',
        userName: 'minimal',
        passwordHash: 'hash123',
      }
      const expectedResult: UserPublic = { id: 2, userName: 'minimal' }

      // Override mock for this test
      const successQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(expectedResult),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue(expectedResult),
      }

      ;(mockDatabase.insertInto as any).mockReturnValue(successQueryBuilder)

      // Act
      const result = await repository.create(minimalUser)

      // Assert
      expect(result).toEqual(expectedResult)
      expect(successQueryBuilder.values).toHaveBeenCalledWith(minimalUser)
    })
  })

  // ===========================================
  // GET BY EMAIL TESTS
  // ===========================================
  describe('getByEmail', () => {
    it('should successfully find user by email', async () => {
      // Act
      const result = await repository.getByEmail('test@example.com')

      // Assert
      expect(result).toEqual(testUserComplete)
      expect(mockDatabase.selectFrom).toHaveBeenCalledWith('user')
    })

    it('should return undefined when user not found', async () => {
      // Arrange - override mock to return undefined
      const notFoundQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(undefined),
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue(undefined),
      }

      ;(mockDatabase.selectFrom as any).mockReturnValue(notFoundQueryBuilder)

      // Act
      const result = await repository.getByEmail('nonexistent@example.com')

      // Assert
      expect(result).toBeUndefined()
      expect(notFoundQueryBuilder.where).toHaveBeenCalledWith(
        'email',
        '=',
        'nonexistent@example.com'
      )
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed')
      const errorQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockRejectedValue(dbError),
        executeTakeFirstOrThrow: vi.fn().mockRejectedValue(dbError),
      }

      ;(mockDatabase.selectFrom as any).mockReturnValue(errorQueryBuilder)

      // Act & Assert
      await expect(repository.getByEmail('test@example.com')).rejects.toThrow(
        'Database connection failed'
      )
    })
  })

  // ===========================================
  // UPDATE PASSWORD TESTS
  // ===========================================
  describe('updatePassword', () => {
    it('should successfully update user password', async () => {
      // Arrange
      const updateData = { id: 1, passwordHash: 'new-hashed-password' }

      // Act
      const result = await repository.updatePassword(updateData)

      // Assert
      expect(result).toEqual(testUserPublic)
      expect(mockDatabase.updateTable).toHaveBeenCalledWith('user')
    })

    it('should throw error when user not found', async () => {
      // Arrange
      const updateData = { id: 999, passwordHash: 'new-hash' }

      // Create a query builder that returns null (user not found)
      const notFoundQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        executeTakeFirst: vi.fn().mockResolvedValue(null), // This triggers the error
        executeTakeFirstOrThrow: vi.fn().mockResolvedValue(null),
      }

      ;(mockDatabase.updateTable as any).mockReturnValue(notFoundQueryBuilder)

      // Act & Assert
      await expect(repository.updatePassword(updateData)).rejects.toThrow(
        'User Not Found'
      )
      expect(notFoundQueryBuilder.where).toHaveBeenCalledWith('id', '=', 999)
    })
  })
})
