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
import { getCoreRowModel, useReactTable, type Row } from '@tanstack/react-table'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import type { User } from '../../types'
import { DataTableBulkActions } from '../data-table-bulk-actions'
import { DataTableRowActions } from '../data-table-row-actions'
import { UsersDeleteDialog } from '../users-delete-dialog'
import { UsersProvider, useUsers } from '../users-provider'

const target: User = {
  id: 2,
  username: 'managed-user',
  display_name: 'Managed user',
  role: 1,
  status: 1,
  quota: 0,
  used_quota: 0,
  request_count: 0,
  group: 'default',
}

function mockVerification(scope: string, proofToken: string) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/verify/methods') {
      return {
        data: {
          success: true,
          data: {
            scope,
            methods: [{ method: '2fa', available: true }],
            oauth_providers: [],
            password_encryption_enabled: false,
          },
        },
      }
    }
    return { data: { success: true, data: [] } }
  })
  return {
    data: {
      success: true,
      data: {
        proof_token: proofToken,
        method: '2fa',
        scope,
        expires_at: Math.floor(Date.now() / 1000) + 60,
      },
    },
  }
}

function OpenDeleteDialog() {
  const users = useUsers()
  useEffect(() => {
    users.setCurrentRow(target)
    users.setOpen('delete')
    // The harness only seeds provider state once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function renderInProvider(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <UsersProvider>{children}</UsersProvider>
    </QueryClientProvider>
  )
}

async function completeTwoFactorVerification() {
  await userEvent.type(
    await screen.findByLabelText('Authenticator code or backup code'),
    '123456'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
}

afterEach(() => {
  cleanup()
  useAuthStore.setState((state) => ({ auth: { ...state.auth, user: null } }))
  vi.restoreAllMocks()
})

it('deleting a user sends the request only with a single-use proof for that user', async () => {
  const proof = mockVerification('admin.user.delete', 'delete-proof')
  const post = vi.spyOn(api, 'post').mockResolvedValue(proof)
  const del = vi
    .spyOn(api, 'delete')
    .mockResolvedValue({ data: { success: true } })
  renderInProvider(
    <>
      <OpenDeleteDialog />
      <UsersDeleteDialog />
    </>
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
  await screen.findByLabelText('Authenticator code or backup code')
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(del).not.toHaveBeenCalled()
  await completeTwoFactorVerification()
  await waitFor(() =>
    expect(del).toHaveBeenCalledWith(
      '/api/user/2/',
      expect.objectContaining({
        headers: { 'X-Security-Proof': 'delete-proof' },
        singleUseAuthorization: true,
      })
    )
  )
  expect(post).toHaveBeenCalledWith(
    '/api/verify',
    expect.objectContaining({
      scope: 'admin.user.delete',
      context: { user_id: 2 },
    }),
    expect.anything()
  )
})

it('cancelling verification leaves the user untouched and returns to the confirmation', async () => {
  mockVerification('admin.user.delete', 'delete-proof')
  const del = vi.spyOn(api, 'delete')
  renderInProvider(
    <>
      <OpenDeleteDialog />
      <UsersDeleteDialog />
    </>
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
  await screen.findByLabelText('Authenticator code or backup code')
  await userEvent.keyboard('{Escape}')
  await screen.findByRole('alertdialog')
  expect(del).not.toHaveBeenCalled()
})

it('disabling a user from the row menu binds the proof to the user and action', async () => {
  const proof = mockVerification('admin.user.manage', 'manage-proof')
  const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
    if (url === '/api/verify') return proof
    if (url === '/api/user/manage') return { data: { success: true } }
    throw new Error(`Unexpected POST ${url}`)
  })
  renderInProvider(
    <DataTableRowActions row={{ original: target } as Row<User>} />
  )
  await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Disable' })
  )
  expect(post).not.toHaveBeenCalledWith(
    '/api/user/manage',
    expect.anything(),
    expect.anything()
  )
  await completeTwoFactorVerification()
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/api/user/manage',
      { id: 2, action: 'disable' },
      expect.objectContaining({
        headers: { 'X-Security-Proof': 'manage-proof' },
        singleUseAuthorization: true,
      })
    )
  )
  expect(post).toHaveBeenCalledWith(
    '/api/verify',
    expect.objectContaining({
      scope: 'admin.user.manage',
      context: { user_id: 2, action: 'disable' },
    }),
    expect.anything()
  )
})

function BulkDeleteFixture(props: { users?: User[] }) {
  const users = props.users ?? [
    target,
    { ...target, id: 3, username: 'second-user' },
  ]
  const table = useReactTable({
    data: users,
    columns: [{ accessorKey: 'username' }],
    getRowId: (user) => String(user.id),
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      rowSelection: Object.fromEntries(
        users.map((user) => [String(user.id), true])
      ),
    },
  })
  return <DataTableBulkActions table={table} />
}

it('bulk deletion uses one verification bound to the entire selection', async () => {
  useAuthStore.setState((state) => ({
    auth: { ...state.auth, user: { id: 1, username: 'root', role: 100 } },
  }))
  const proof = mockVerification('admin.users.delete', 'batch-proof')
  const post = vi
    .spyOn(api, 'post')
    .mockImplementation(async (url) =>
      url === '/api/verify'
        ? proof
        : { data: { success: true, data: { deleted_ids: [2, 3] } } }
    )
  renderInProvider(<BulkDeleteFixture />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete selected users' })
  )
  await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
  expect(post).not.toHaveBeenCalled()
  await completeTwoFactorVerification()
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/api/user/batch_delete',
      { user_ids: [2, 3] },
      expect.objectContaining({
        headers: { 'X-Security-Proof': 'batch-proof' },
        singleUseAuthorization: true,
      })
    )
  )
  expect(
    post.mock.calls.filter((call) => call[0] === '/api/verify')
  ).toHaveLength(1)
  expect(post).toHaveBeenCalledWith(
    '/api/verify',
    expect.objectContaining({
      scope: 'admin.users.delete',
      context: { user_ids: [2, 3] },
    }),
    expect.anything()
  )
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  )
})

it('cancelling batch verification deletes no users', async () => {
  useAuthStore.setState((state) => ({
    auth: { ...state.auth, user: { id: 1, username: 'root', role: 100 } },
  }))
  mockVerification('admin.users.delete', 'batch-proof')
  const post = vi.spyOn(api, 'post')
  renderInProvider(<BulkDeleteFixture />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete selected users' })
  )
  await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
  await screen.findByLabelText('Authenticator code or backup code')
  await userEvent.keyboard('{Escape}')
  await screen.findByRole('alertdialog')
  expect(post).not.toHaveBeenCalled()
})

it('a partial failure removes completed users and preserves remaining accounts', async () => {
  useAuthStore.setState((state) => ({
    auth: { ...state.auth, user: { id: 1, username: 'root', role: 100 } },
  }))
  const proof = mockVerification('admin.users.delete', 'batch-proof')
  vi.spyOn(api, 'post').mockImplementation(async (url) =>
    url === '/api/verify'
      ? proof
      : {
          data: {
            success: false,
            message: 'Failed to delete user',
            data: { deleted_ids: [2] },
          },
        }
  )
  renderInProvider(<BulkDeleteFixture />)
  await userEvent.click(
    screen.getByRole('button', { name: 'Delete selected users' })
  )
  await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
  await completeTwoFactorVerification()
  await screen.findByRole('alertdialog')
  await waitFor(() =>
    expect(screen.queryByText('managed-user (ID: 2)')).not.toBeInTheDocument()
  )
  expect(screen.getByText('second-user (ID: 3)')).toBeVisible()
})

it('bulk deletion is disabled for the operator or an equal-role account', () => {
  useAuthStore.setState((state) => ({
    auth: { ...state.auth, user: { id: 2, username: 'admin', role: 10 } },
  }))
  renderInProvider(
    <BulkDeleteFixture users={[target, { ...target, id: 3, role: 10 }]} />
  )
  expect(
    screen.getByRole('button', { name: 'Delete selected users' })
  ).toBeDisabled()
})
