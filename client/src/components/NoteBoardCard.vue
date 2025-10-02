<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '@/stores/noteStore'
import { useUserAuthStore } from '@/stores/userAuthStore'
import { FwbButton, FwbSpinner, FwbCard, FwbModal, FwbInput } from 'flowbite-vue'
import useErrorMessage from '@/composables/useErrorMessage'
import type { NoteBoardUpdateable, NoteInsertable } from '@server/shared/types'
import NoteModalBody from './NoteModalBody.vue'
import SuperJSON from 'superjson'

const noteStore = useNoteStore()
const userAuthStore = useUserAuthStore()

const { noteBoardId } = defineProps<{
  noteBoardId: number
}>()

const noteBoardOwner = computed(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === noteBoardId)
  return board
    ? {
        OwnerId: board.ownerId,
        OwnerUserName: board.ownerUserName,
      }
    : {
        OwnerId: null,
        OwnerUserName: null,
      }
})

const noteBoardTitle = computed(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === noteBoardId)
  return board?.title ? board.title : ''
})

const noteBoardNotes = computed(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === noteBoardId)
  return board?.notes ? board.notes : []
})

const noteBoardCollaborators = computed(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === noteBoardId)
  return board?.collaborators ? board.collaborators : []
})

const noteId = ref<number | undefined>()
const noteForm = ref<NoteInsertable>({
  boardId: noteBoardId,
  content: '',
})

const isOwner = computed(() => noteBoardOwner.value.OwnerId === userAuthStore.authUser?.id)

const loading = ref(false)

const isShowNoteModal = ref(false)

const modalNoteTitle = ref('')

const modalNoteFunction = ref<'add' | 'update' | undefined>()

function showAddNoteModal() {
  modalNoteTitle.value = 'Add Note'
  modalNoteFunction.value = 'add'
  noteForm.value.content = ''
  isShowNoteModal.value = true
}

function showEditNoteModal(id: number, noteContent: string) {
  modalNoteTitle.value = 'Edit Note'
  modalNoteFunction.value = 'update'
  noteId.value = id
  noteForm.value.content = noteContent
  isShowNoteModal.value = true
}

function closeNoteModal() {
  isShowNoteModal.value = false
}

const isShowCollaboratorModal = ref(false)

const modalCollaboratorTitle = ref('')

const modalCollaboratorFunction = ref<'add' | 'remove' | undefined>()

function showAddCollaboratorModal() {
  modalCollaboratorTitle.value = 'Add Collaborator'
  modalNoteFunction.value = 'add'
  isShowCollaboratorModal.value = true
}

function showRemoveCollaboratorModal() {
  modalCollaboratorTitle.value = 'Remove Collaborator'
  modalCollaboratorFunction.value = 'remove'
  isShowCollaboratorModal.value = true
}

function closeCollaboratorModal() {
  isShowCollaboratorModal.value = false
}

const isShowEditTitleModal = ref(false)

function showEditBoardTitleModal() {
  newTitleForBoard.value = noteBoardTitle.value
  isShowEditTitleModal.value = true
}

function closeEditBoardTitleModal() {
  isShowEditTitleModal.value = false
}

const [noteToggleIsDone] = useErrorMessage(async (noteId, status) => {
  noteStore.sendUpdateNoteIsDone({
    id: noteId,
    boardId: noteBoardId,
    isDone: !status,
  })
  hasSucceeded.value = true
})

const [deleteNoteBoard] = useErrorMessage(async () => {
  noteStore.sendDeleteNoteBoard({
    boardId: noteBoardId,
  })
  hasSucceeded.value = true
})

const [deleteNote] = useErrorMessage(async (noteId) => {
  noteStore.sendDeleteNote({
    noteId,
    boardId: noteBoardId,
  })
  hasSucceeded.value = true
})

const newTitleForBoard = ref<string>('')

const [updateBoardTitleAction] = useErrorMessage(async () => {
  loading.value = true
  closeEditBoardTitleModal() // Close modal immediately
  noteStore.sendUpdateNoteBoard({
    id: noteBoardId,
    title: newTitleForBoard.value,
  })
  hasSucceeded.value = true
  loading.value = false
})

const hasSucceeded = ref(false)
</script>

<template>
  <fwb-card class="relative w-full">
    <h5 class="mb-2 p-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
      {{ noteBoardTitle }}
    </h5>
    <div class="flex">
      <div class="p-2">
        <fwb-button v-if="isOwner" size="xs" color="default" @click="showEditBoardTitleModal"
          >Edit Title</fwb-button
        >
      </div>
      <div class="p-2">
        <fwb-button size="xs" color="default" @click="showAddNoteModal">Add Note</fwb-button>
      </div>
      <div class="p-2">
        <fwb-button
          v-if="isOwner"
          size="xs"
          color="default"
          @click="showAddCollaboratorModal"
          class="mb-2"
          >Add Collaborator</fwb-button
        >
        <fwb-button v-if="isOwner" size="xs" color="default" @click="showRemoveCollaboratorModal"
          >Remove Collaborator</fwb-button
        >
      </div>

      <div class="p-2">
        <fwb-button v-if="isOwner" size="xs" color="default" @click="deleteNoteBoard"
          >Delete NoteBoard</fwb-button
        >
      </div>
    </div>
    <div class="max-h-[55vh] space-y-2 text-wrap">
      <p
        v-if="noteBoardNotes.length === 0 && !loading"
        class="py-4 text-center text-gray-500 dark:text-gray-400"
      >
        No notes yet. Add one!
      </p>
      <div
        v-for="note in noteBoardNotes"
        :key="note.id"
        class="items-start justify-between rounded-lg border border-gray-200 p-3 shadow-sm sm:flex-row sm:items-center"
        :data-testId="`row-${note.content}`"
      >
        <!-- Note content -->
        <div class="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <div
            class="word-wrap m-1 p-1 text-sm font-medium text-gray-900"
            :style="{ background: note.isDone ? 'green' : '' }"
          >
            {{ note.content }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex">
          <fwb-button size="xs" color="green" @click="noteToggleIsDone(note.id, note.isDone)">
            Toggle Done
          </fwb-button>
          <div class="mt-2 flex w-full gap-2 sm:mt-0 sm:w-auto">
            <fwb-button
              size="xs"
              color="purple"
              @click.prevent="showEditNoteModal(note.id, note.content)"
            >
              Edit
            </fwb-button>
            <fwb-button size="xs" color="pink" @click="deleteNote(note.id)"> Delete </fwb-button>
          </div>
        </div>
      </div>
    </div>
  </fwb-card>

  <div>
    <NoteModalBody
      :title="modalNoteTitle"
      :isShowModal="isShowNoteModal"
      :noteId="noteId"
      :noteBoardId="$props.noteBoardId"
      :noteContent="noteForm.content"
      :modalFunction="modalNoteFunction"
      @close-modal="closeNoteModal"
      @success="closeNoteModal"
    />
  </div>
  <div>
    <CollaboratorModalBody
      :title="modalCollaboratorTitle"
      :isShowModal="isShowCollaboratorModal"
      :boardId="noteBoardId"
      :modalFunction="modalCollaboratorFunction"
      @close-modal="closeCollaboratorModal"
      @success="closeCollaboratorModal"
    />
  </div>
  <fwb-modal v-if="isShowEditTitleModal" @close="closeEditBoardTitleModal">
    <template #header>
      <div class="flex items-center text-lg">Edit Board Title</div>
    </template>
    <template #body>
      <FwbInput
        v-model="newTitleForBoard"
        label="New Title"
        placeholder="Enter new board title"
        :disabled="loading"
      />
    </template>
    <template #footer>
      <FwbButton @click="closeEditBoardTitleModal" color="alternative" :disabled="loading">
        Cancel
      </FwbButton>
      <FwbButton @click="updateBoardTitleAction" :disabled="!newTitleForBoard.trim() || loading">
        Save
      </FwbButton>
    </template>
  </fwb-modal>
  <fwb-spinner v-if="loading" size="3" class="mx-auto my-4" />
</template>
