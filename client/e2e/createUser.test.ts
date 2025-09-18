import { test, expect } from '@playwright/test'
import { fakeUser } from 'utils/fakeData'
// import testUser with admin role
import { testUser } from '@server/shared/forTests'

const user = fakeUser()


test.describe('login and create user', () => {
  test('visitor can signup', async ({ page }) => {
    // Given (ARRANGE)
    await page.goto('/login')

    const formLogin = page.getByRole('form', { name: 'Login' })

    // We would prefer using getByRole, but flowbite components are
    // not linking labels with inputs
    await formLogin.locator('input[type="email"]').fill(testUser.email)
    await formLogin.locator('input[type="password"]').fill(testUser.password)
    await formLogin.locator('button[type="submit"]').click()

    await expect(page.getByRole('link', { name: 'Create user' })).toBeVisible()

    page.getByRole('link', { name: 'Create user' }).click()

    await expect(page).toHaveURL('/createUser')

    const successMessage = page.getByTestId('successMessage')
    await expect(successMessage).toBeHidden() // sanity check

    // When (ACT)
    const formCreate = page.getByRole('form', { name: 'Create' })

    // We would prefer using getByRole, but flowbite components are
    // not linking labels with inputs
    await formCreate.locator('input[data-testid="name"]').fill(user.name)
    await formCreate.locator('input[type="email"]').fill(user.email)
    await formCreate.locator('input[type="password"]').fill(user.password)
    await page.getByLabel('Select users rolePlease').selectOption('chef')

    await formCreate.locator('button[type="submit"]').click()

    // Then (ASSERT)
    await expect(successMessage).toBeVisible()
  })
})
