import { test, expect } from '@playwright/test'
import { fakeUser } from 'utils/fakeData'
import { signInUser, asUser } from 'utils/api'

const user = fakeUser()

// We are grouping these tests in a serial block to clearly
// indicate that these tests should be run in the provided order.
// However, ideally we would like to run each test in isolation.
// That would allow us to develop faster and to see more clearly
// which part of our flow is broken.
// In this particular case, we might want to run the signup and
// login tests one after the other because we want to make sure
// that the signup + login flow works.
test.describe.serial('signup and login sequence', () => {
  test('visitor can signup', async ({ page }) => {
    // Given (ARRANGE)
    await page.goto('/signup')
    const successMessage = page.getByTestId('successMessage')
    await expect(successMessage).toBeHidden() // sanity check

    // When (ACT)
    const form = page.getByRole('form', { name: 'Signup' })

    // We would prefer using getByRole, but flowbite components are
    // not linking labels with inputs
    await form.locator('input[data-testid="name"]').fill(user.name)
    await form.locator('input[type="email"]').fill(user.email)
    await form.locator('input[type="password"]').fill(user.password)
    await form.locator('button[type="submit"]').click()

    // Then (ASSERT)
    await expect(successMessage).toBeVisible()
  })

  test('visitor can login', async ({ page }) => {
    await page.goto('/login')
    // When (ACT)
    const loginForm = page.getByRole('form', { name: 'Login' })

    await loginForm.locator('input[type="email"]').fill(user.email)
    await loginForm.locator('#password').fill(user.password)
    await loginForm.getByRole('button', { name: 'Log in' }).click()

    await expect(page).toHaveURL('/')

    await expect(page.getByRole('link', { name: 'Account settings' })).toBeVisible()
  })
})

test('visitor can logout', async ({ page }) => {
  // Given (ARRANGE)
  const user = fakeUser()
  await signInUser(user)

  await page.goto('/login')
  const loginForm = page.getByRole('form', { name: 'Login' })
  await loginForm.locator('input[type="email"]').fill(user.email)
  await loginForm.locator('#password').fill(user.password)
  await loginForm.getByRole('button', { name: 'Log in' }).click()

  await expect(page).toHaveURL('/')

  const logoutLink = page.getByRole('link', { name: 'Logout' })

  // When (ACT)
  await logoutLink.click()

  // Then (ASSERT)
  await expect(logoutLink).toBeHidden()

  // Ensure that we are redirected to the login page.
  await expect(page).toHaveURL('/login')

  // Refresh the page to make sure that the user is still logged out.
  await page.goto('/')
  await expect(logoutLink).toBeHidden()
})

test('visitor test', async ({ page }) => {
  const user = fakeUser()
  await asUser(page, user, async () => {
    const logoutLink = page.getByRole('link', { name: 'Logout' })
    await expect(logoutLink).toBeVisible()

    // When (ACT)
    await logoutLink.click()

    // Then (ASSERT)
    await expect(logoutLink).toBeHidden()

    // Ensure that we are redirected to the login page.
    await expect(page).toHaveURL('/login')

    // Refresh the page to make sure that the user is still logged out.
    await page.goto('/')
    await expect(logoutLink).toBeHidden()
  })
})
