/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { Route as UsageLogsRoute } from '@/routes/_authenticated/usage-logs/$section'
import { useAuthStore } from '@/stores/auth-store'

import { CommonLogsFilterBar } from '../common-logs-filter-bar'
import { UsageLogsProvider } from '../usage-logs-provider'

function FilterFixture() {
  const table = useReactTable({
    data: [],
    columns: [],
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <UsageLogsProvider>
      <CommonLogsFilterBar table={table} />
    </UsageLogsProvider>
  )
}

async function renderFilter(initialEntry = '/usage-logs/common') {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    let data: unknown = { quota: 0, rpm: 0, tpm: 0 }
    if (url === '/api/group/') data = []
    if (url === '/api/user/self/groups') data = {}
    return { data: { success: true, data } }
  })
  const root = createRootRoute()
  const auth = createRoute({ getParentRoute: () => root, id: '_authenticated' })
  const logs = createRoute({
    getParentRoute: () => auth,
    path: '/usage-logs/$section',
    component: FilterFixture,
    validateSearch: UsageLogsRoute.options.validateSearch,
  })
  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([logs])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('combobox', { name: 'Type' })
  return router
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})

it('preserves custom subscription and billing log types in route search', async () => {
  const router = await renderFilter('/usage-logs/common?type=%5B%229%22%5D')
  expect(router.state.location.search).toMatchObject({ type: ['9'] })

  await router.navigate({
    to: '/usage-logs/$section',
    params: { section: 'common' },
    search: { type: ['8'] },
  })
  expect(router.state.location.search).toMatchObject({ type: ['8'] })
})

it('submits the billing selection as type 9 for administrators', async () => {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'admin',
    role: ROLE.ADMIN,
  })
  const router = await renderFilter()

  await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
  await userEvent.click(screen.getByRole('option', { name: 'Payment Billing' }))
  await userEvent.click(screen.getByRole('button', { name: 'Search' }))

  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ type: ['9'], page: 1 })
  )
})

it('hides admin-only types and keeps retired login logs selectable', async () => {
  const router = await renderFilter()
  await userEvent.click(screen.getByRole('combobox', { name: 'Type' }))
  expect(
    screen.queryByRole('option', { name: /^Manage/ })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('option', { name: 'Payment Billing' })
  ).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('option', { name: /^Login/ })).getByText(
      'Deprecated'
    )
  ).toBeVisible()
  for (const label of [
    'All Types',
    'Top-up',
    'Consume',
    'System',
    'Error',
    'Refund',
  ]) {
    expect(
      within(screen.getByRole('option', { name: label })).queryByText(
        'Deprecated'
      )
    ).not.toBeInTheDocument()
  }
  await userEvent.click(screen.getByRole('option', { name: /^Login/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Search' }))
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ type: ['7'], page: 1 })
  )
})
