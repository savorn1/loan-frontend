
export function useCrudModals<
  TResponse extends { id: string | number },
  TRequest = Record<string, any>
>(
  basePath: string,
  refresh: () => Promise<void> | void,
  options: {
    /** Used in create/update/delete toast messages — pass a translated name, e.g. t('accounting.entities.feeScheme'). */
    entityName: string
    /** Initial createForm value each time the Create modal is opened. */
    createDefaults: () => Record<string, any>
    /** Row -> editForm value when the Edit modal is opened. */
    toForm: (row: TResponse) => Record<string, any>
    /** DynamicForm values -> request body, shared by create and update. */
    toPayload: (values: Record<string, any>) => TRequest
    /** Called with the created row after a successful create + refresh — e.g. to redirect to its detail page. */
    onCreated?: (created: TResponse) => void | Promise<void>
  }
) {
  const api = useApi()
  const toast = useToast()
  const { t } = useI18n()

  const showCreate = ref(false)
  const creating = ref(false)
  const error = ref('')
  const createForm = ref<Record<string, any>>({})

  function openCreate() {
    createForm.value = options.createDefaults()
    error.value = ''
    showCreate.value = true
  }

  async function onCreate(values: Record<string, any>) {
    creating.value = true
    error.value = ''
    try {
      const created = await api<TResponse>(basePath, { method: 'POST', body: options.toPayload(values) })
      toast.add({ title: t('common.entityCreated', { entity: options.entityName }), color: 'green' })
      showCreate.value = false
      await refresh()
      await options.onCreated?.(created)
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      creating.value = false
    }
  }

  const showEdit = ref(false)
  const editing = ref(false)
  const editError = ref('')
  const editingId = ref<string | number | null>(null)
  const editForm = ref<Record<string, any>>({})

  function openEdit(row: TResponse) {
    editingId.value = row.id
    editForm.value = options.toForm(row)
    editError.value = ''
    showEdit.value = true
  }

  async function onEdit(values: Record<string, any>) {
    if (editingId.value === null) return
    editing.value = true
    editError.value = ''
    try {
      await api(`${basePath}/${editingId.value}`, {
        method: 'PUT',
        body: options.toPayload(values)
      })
      toast.add({ title: t('common.entityUpdated', { entity: options.entityName }), color: 'green' })
      showEdit.value = false
      await refresh()
    } catch (err) {
      editError.value = apiErrorMessage(err)
    } finally {
      editing.value = false
    }
  }

  const deleting = ref(false)
  const confirmDelete = ref<TResponse | null>(null)

  async function onDelete() {
    if (!confirmDelete.value) return
    deleting.value = true
    try {
      await api(`${basePath}/${confirmDelete.value.id}`, { method: 'DELETE' })
      toast.add({ title: t('common.entityDeleted', { entity: options.entityName }), color: 'green' })
      confirmDelete.value = null
      await refresh()
    } catch (err) {
      toast.add({ title: apiErrorMessage(err), color: 'red' })
    } finally {
      deleting.value = false
    }
  }

  return {
    showCreate,
    creating,
    error,
    createForm,
    openCreate,
    onCreate,
    showEdit,
    editing,
    editError,
    editingId,
    editForm,
    openEdit,
    onEdit,
    deleting,
    confirmDelete,
    onDelete
  }
}
