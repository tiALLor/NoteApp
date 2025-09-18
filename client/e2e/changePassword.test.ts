import { test, expect } from '@playwright/test'
import { fakeUser } from 'utils/fakeData'
import { asUser } from 'utils/api'

const user = fakeUser()

test('user can change a password', async ({ page }) => {
  const newPassword = 'newPassword12345'
  await asUser(page, user, async () => {
    // Given (ARRANGE)
    const logoutLink = page.getByRole('link', { name: 'Logout' })
    //confirmation that the user is logged in
    await expect(logoutLink).toBeVisible()

    await page.getByRole('link', { name: 'Account settings' }).click()
    // When (ACT)
    await page.locator('li').filter({ hasText: 'Change Password' }).locator('div').click()
    const form = page.getByRole('form', { name: 'changePassword' })
    await form.locator('#oldPassword').fill(user.password)
    await form.locator('#newPassword').fill(newPassword)
    await form.locator('#confirmNewPassword').fill(newPassword)

    await form.locator('button[type="submit"]').click()

    // Then (ASSERT)
    const successMessage = page.getByTestId('successMessage')
    await expect(successMessage).toBeVisible()

    // await logoutLink.click()
    await expect(logoutLink).toBeHidden()

    // Confirm
    await page.goto('/login')
    const loginForm = page.getByRole('form', { name: 'Login' })
    await loginForm.locator('input[type="email"]').fill(user.email)
    await loginForm.locator('#password').fill(newPassword)
    await loginForm.getByRole('button', { name: 'Log in' }).click()

    await expect(logoutLink).toBeVisible()
    await expect(page).toHaveURL('/')
  })
})

test('throw error if newPassword and confirmNewPassWord do not match', async ({ page }) => {
  const user = fakeUser()
  const newPassword = 'newPassword12345'
  await asUser(page, user, async () => {
    // Given (ARRANGE)
    await page.getByRole('link', { name: 'Account settings' }).click()
    const logoutLink = page.getByRole('link', { name: 'Logout' })
    await expect(logoutLink).toBeVisible()
    // When (ACT)
    await page.locator('li').filter({ hasText: 'Change Password' }).locator('div').click()
    const form = page.getByRole('form', { name: 'changePassword' })
    await form.locator('#oldPassword').fill(user.password)
    await form.locator('#newPassword').fill(newPassword)
    await form.locator('#confirmNewPassword').fill('kkaksjfgkasl1123')

    await form.locator('button[type="submit"]').click()

    // Then (ASSERT)
    const errorMessage = page.getByTestId('errorMessage')
    await expect(errorMessage).toBeVisible()
  })
})
