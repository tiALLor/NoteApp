import { test, expect } from '@playwright/test'
import { fakeUser } from 'utils/fakeData'
import { asUser } from 'utils/api'

const user = fakeUser()

test('user can delete the account', async ({ page }) => {
  await asUser(page, user, async () => {
    // Given (ARRANGE)
    const logoutLink = page.getByRole('link', { name: 'Logout' })
    //confirmation that the user is logged in
    await expect(logoutLink).toBeVisible()

    await page.getByRole('link', { name: 'Account settings' }).click()
    // When (ACT)
    await page.locator('li').filter({ hasText: 'Delete account' }).locator('div').click()
    const form = page.getByRole('form', { name: 'deleteAccount' })
    await form.locator('#password').fill(user.password)

    await form.locator('button[type="submit"]').click()

    // Then (ASSERT)
    const successMessage = page.getByTestId('successMessage')
    await expect(successMessage).toBeVisible()

    await expect(logoutLink).toBeHidden()

    // Confirm
    await page.goto('/login')
    const loginForm = page.getByRole('form', { name: 'Login' })
    await loginForm.locator('input[type="email"]').fill(user.email)
    await loginForm.locator('#password').fill(user.password)
    await loginForm.getByRole('button', { name: 'Log in' }).click()

    const errorMessage = page.getByTestId('errorMessage')
    await expect(errorMessage).toBeVisible()
  })
})
