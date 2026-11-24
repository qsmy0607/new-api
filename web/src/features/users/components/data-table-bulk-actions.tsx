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
import type { Table } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { handleServerError } from '@/lib/handle-server-error'
import { AuthOperationError } from '@/lib/secure-verification'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { deleteUser } from '../api'
import { isUserDeleted } from '../constants'
import type { User } from '../types'
import { useUsers } from './users-provider'

interface DataTableBulkActionsProps {
  table: Table<User>
}

export function DataTableBulkActions(props: DataTableBulkActionsProps) {
  const { t } = useTranslation()
  const operator = useAuthStore((state) => state.auth.user)
  const { requestVerification, verificationActive, triggerRefresh } = useUsers()
  const [targets, setTargets] = useState<User[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const running = useRef(false)
  const selected = props.table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)
  const canDelete =
    selected.length > 0 &&
    selected.every(
      (user) =>
        operator &&
        user.id !== operator.id &&
        user.role < operator.role &&
        !isUserDeleted(user)
    )

  const handleDelete = async () => {
    if (running.current || targets.length === 0) return
    running.current = true
    setIsDeleting(true)
    const completed = new Set<number>()
    try {
      for (const user of targets) {
        const proof = await requestVerification({
          scope: 'admin.user.delete',
          context: { user_id: user.id },
          title: t('Verify to delete user'),
          description: t(
            'Confirm your identity before permanently deleting the account {{username}}.',
            { username: user.username }
          ),
        })
        if (!proof) break
        requireServerSuccess(await deleteUser(user.id, proof.proof_token))
        completed.add(user.id)
        props.table.setRowSelection((previous) => {
          const remaining = { ...previous }
          delete remaining[String(user.id)]
          return remaining
        })
      }
      if (completed.size === targets.length) setTargets([])
    } catch (error) {
      handleServerError(AuthOperationError.from(error))
    } finally {
      if (completed.size > 0) {
        toast.success(t('Deleted {{count}} users.', { count: completed.size }))
        triggerRefresh()
        setTargets((previous) =>
          previous.filter((user) => !completed.has(user.id))
        )
      }
      running.current = false
      setIsDeleting(false)
    }
  }

  return (
    <>
      <BulkActionsToolbar table={props.table} entityName='user'>
        <Button
          variant='destructive'
          size='sm'
          disabled={!canDelete || isDeleting}
          onClick={() => setTargets([...selected])}
        >
          <Trash2 aria-hidden='true' />
          {t('Delete selected users')}
        </Button>
      </BulkActionsToolbar>
      <ConfirmDialog
        open={targets.length > 0 && !verificationActive}
        onOpenChange={(open) => {
          if (!open && !running.current) setTargets([])
        }}
        title={t('Delete selected users')}
        desc={
          <>
            <p>
              {t(
                'Permanently delete {{count}} selected users? Each account requires identity verification. Deletion stops if verification is cancelled or a request fails.',
                { count: targets.length }
              )}
            </p>
            <ul className='mt-2 max-h-48 overflow-y-auto break-all'>
              {targets.map((user) => (
                <li key={user.id}>
                  {user.username} (ID: {user.id})
                </li>
              ))}
            </ul>
            <p>{t('This action cannot be undone.')}</p>
          </>
        }
        confirmText={isDeleting ? t('Deleting...') : t('Delete')}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </>
  )
}
