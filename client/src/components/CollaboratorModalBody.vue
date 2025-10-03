<script setup lang="ts">
import { useNoteStore } from '@/stores/noteStore'
import { ref, watch, computed } from 'vue'
import { FwbModal, FwbListGroup, FwbListGroupItem, FwbButton, FwbSpinner } from 'flowbite-vue'
import AlertMessages from '@/components/AlertMessages.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import type { BoardCollaboratorPublicWithUser, UserPublic } from '@server/shared/types'

const noteStore = useNoteStore()

const props = defineProps<{
  noteBoardId: number
  isShowModal: boolean
  noteBoardOwner: { ownerId: number | null; ownerUserName: string | null }
}>()

const emit = defineEmits<{
  (e: 'closeModal'): void
  (e: 'success'): void
}>()

const title = 'Manage Collaboration'
const errorMessage = ref('')
const loading = ref(false)
const hasSucceeded = ref(false)
const successMessage = ref('')

const noteBoardCollaborators = computed<BoardCollaboratorPublicWithUser[]>(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === props.noteBoardId)
  console.log(board)
  return board?.collaborators ? board.collaborators : []
})
console.log(noteBoardCollaborators)

const usersNotCollaboratingOnNoteBoard = computed<UserPublic[]>(() => {
  if (!noteStore.allUsers) return []

  const ownerId = props.noteBoardOwner.ownerId

  // Collect IDs of collaborators and the owner (if available)
  const excludedIds = [
    ...noteBoardCollaborators.value.map((c) => c.userId),
    ...(ownerId !== null ? [ownerId] : []),
  ] as number[]

  return noteStore.allUsers.filter((user) => !excludedIds.includes(user.id))
})

const [addCollaborator] = useErrorMessage(async (id: number) => {
  noteStore.sendAddCollaborator({
    boardId: props.noteBoardId,
    userId: id,
  })

  successMessage.value = 'Collaborator added successfully.'
  emit('success')
  hasSucceeded.value = true
})

const [removeCollaborator] = useErrorMessage(async (id: number) => {
  noteStore.sendRemoveCollaborator({
    boardId: props.noteBoardId,
    userId: id,
  })

  successMessage.value = 'Collaborator added successfully.'
  emit('success')
  hasSucceeded.value = true
})

// Watch the store's global error state
watch(
  () => noteStore.error,
  (newError) => {
    if (newError) {
      errorMessage.value = newError
      hasSucceeded.value = false
    } else {
      errorMessage.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => props.isShowModal,
  (isOpen) => {
    if (isOpen) {
      hasSucceeded.value = false
      successMessage.value = ''
      loading.value = true
      noteStore.sendGetAllUsers()
      loading.value = false
    } else {
      errorMessage.value = ''
    }
  }
)
</script>

<template>
  <fwb-modal v-if="isShowModal" @close="$emit('closeModal')" :disabled="loading">
    <h5 class="mb-2 p-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
      {{ title }}
    </h5>

    <template #header>
      <div class="flex items-center text-2xl" :aria-label="`Add/Remove Collaborator Modal Header`">
        Add or remove user from collaboration
      </div>
    </template>
    <template #body>
      <div class="max-h-[70vh] overflow-y-auto">
        <fwb-list-group aria-label="add collaborator" class="w-full">
          <fwb-list-group-item
            v-for="user in usersNotCollaboratingOnNoteBoard"
            :key="user.id"
            class="w-full px-0"
          >
            <div class="flex w-full items-center px-4 justify-between">
              <div>
                {{ user.userName }}
              </div>
              <div class="p-2">
                <fwb-button size="xs" color="yellow" @click="addCollaborator(user.id)"
                  >➕</fwb-button
                >
              </div>
            </div>
          </fwb-list-group-item>
        </fwb-list-group>
      </div>
      <div class="max-h-[70vh] overflow-y-auto">
        <fwb-list-group aria-label="add collaborator" class="w-full">
          <fwb-list-group-item
            v-for="user in noteBoardCollaborators"
            :key="user.userId"
            class="w-full px-0"
          >
            <div class="flex w-full items-center px-4 justify-between">
              <div>
                {{ user.collaboratorUserName }}
              </div>
              <div class="p-2">
                <fwb-button size="xs" color="dark" @click="removeCollaborator(user.userId)"
                  >❌</fwb-button
                >
              </div>
            </div>
          </fwb-list-group-item>
        </fwb-list-group>
      </div>
    </template>
    <div class="pb-5">
      <AlertMessages
        :showSuccess="hasSucceeded"
        successMessage="Meal added."
        :errorMessage="errorMessage"
      />
    </div>
  </fwb-modal>
  <fwb-spinner v-if="loading" size="3" class="mx-auto my-4" />
</template>
