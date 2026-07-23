// The Create/Edit/Delete modal trio behind every simple "list + modal" admin
// page (fee schemes, templates, payment methods, interest schemes, ...) —
// three near-identical state machines that only differ in the API base path
// and how a row maps to <DynamicForm> values and back to a request payload.
// Same "declarative data + a couple of callbacks" shape as ColumnDef/FieldDef,
// applied to a whole page's CRUD wiring instead of one column/field.
export function useCrudModals<
  TResponse extends { id: string | number },
  TRequest = Record<string, any>
>(
  basePath: string,
  refresh: () => Promise<void> | void,
  options: {
    /** Used in create/update/delete toast messages, e.g. 'Fee scheme'. */
    entityName: string
    /** Initial createForm value each time the Create modal is opened. */
    createDefaults: () => Record<string, any>
    /** Row -> editForm value when the Edit modal is opened. */
    toForm: (row: TResponse) => Record<string, any>
    /** DynamicForm values -> request body, shared by create and update. */
    toPayload: (values: Record<string, any>) => TRequest
  }
) {
  const api = useApi()
  const toast = useToast()

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
      await api(basePath, { method: 'POST', body: options.toPayload(values) })
      toast.add({ title: `${options.entityName} created`, color: 'green' })
      showCreate.value = false
      await refresh()
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
      toast.add({ title: `${options.entityName} updated`, color: 'green' })
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
      toast.add({ title: `${options.entityName} deleted`, color: 'green' })
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
