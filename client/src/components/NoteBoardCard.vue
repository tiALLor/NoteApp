<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '@/stores/noteStore'
import { useUserAuthStore } from '@/stores/userAuthStore'
import { FwbButton, FwbSpinner, FwbCard, FwbModal, FwbInput } from 'flowbite-vue'
import useErrorMessage from '@/composables/useErrorMessage'
import type { NoteInsertable } from '@server/shared/types'
import NoteModalBody from './NoteModalBody.vue'
import CollaboratorModalBody from './CollaboratorModalBody.vue'

const noteStore = useNoteStore()
const userAuthStore = useUserAuthStore()

const { noteBoardId } = defineProps<{
  noteBoardId: number
}>()

const noteBoardOwner = computed(() => {
  const board = noteStore.noteBoardsData?.find((noteBoard) => noteBoard.id === noteBoardId)
  return board
    ? {
        ownerId: board.ownerId,
        ownerUserName: board.ownerUserName,
      }
    : {
        ownerId: null,
        ownerUserName: null,
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

const noteId = ref<number | undefined>()
const noteForm = ref<NoteInsertable>({
  boardId: noteBoardId,
  content: '',
})

const isOwner = computed(() => noteBoardOwner.value.ownerId === userAuthStore.authUser?.id)

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

function showCollaboratorModal() {
  modalNoteFunction.value = 'add'
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

const [toggleNoteIsDoneAction] = useErrorMessage(async (noteId, status) => {
  noteStore.sendUpdateNoteIsDone({
    id: noteId,
    boardId: noteBoardId,
    isDone: !status,
  })
  hasSucceeded.value = true
})

const [deleteNoteBoardAction] = useErrorMessage(async () => {
  noteStore.sendDeleteNoteBoard({
    boardId: noteBoardId,
  })
  hasSucceeded.value = true
})

const [deleteNoteAction] = useErrorMessage(async (noteId) => {
  noteStore.sendDeleteNote({
    noteId,
    boardId: noteBoardId,
  })
  hasSucceeded.value = true
})

const newTitleForBoard = ref<string>('')

const [updateBoardTitleAction] = useErrorMessage(async () => {
  loading.value = true
  // Close modal immediately after submit
  closeEditBoardTitleModal()
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
    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-800/60"
    >
      <fwb-spinner size="6" />
    </div>

    <div class="p-4 sm:p-5">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h5 class="flex-grow text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ noteBoardTitle }}
        </h5>

        <div class="flex flex-wrap gap-2">
          <fwb-button v-if="isOwner" size="sm" color="default" @click="showEditBoardTitleModal">
            Edit Title
          </fwb-button>
          <fwb-button size="sm" color="default" @click="showAddNoteModal"> Add Note </fwb-button>
          <fwb-button v-if="isOwner" size="sm" color="default" @click="showCollaboratorModal">
            Manage Collaborators
          </fwb-button>
          <fwb-button v-if="isOwner" size="sm" color="red" @click="deleteNoteBoardAction">
            Delete Board
          </fwb-button>
        </div>
      </div>

      <div class="custom-scrollbar max-h-[55vh] space-y-3 overflow-y-auto p-1">
        <p
          v-if="noteBoardNotes.length === 0 && !loading"
          class="py-4 text-center text-gray-500 dark:text-gray-400"
        >
          No notes yet. Add one!
        </p>
        <div
          v-for="note in noteBoardNotes"
          :key="note.id"
          class="flex flex-col rounded-lg border border-gray-200 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          :data-testId="`row-${note.content}`"
          :class="{ 'bg-green-100 dark:bg-green-900': note.isDone }"
        >
          <div class="mb-2 flex items-start">
            <div
              class="m-1 w-full break-words p-1 text-sm font-medium text-gray-900 dark:text-white"
              :class="{ 'line-through': note.isDone }"
            >
              {{ note.content }}
            </div>
          </div>

          <div
            class="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-2 dark:border-gray-700 sm:justify-start"
          >
            <fwb-button
              size="xs"
              :color="note.isDone ? 'yellow' : 'green'"
              @click="toggleNoteIsDoneAction(note.id, note.isDone)"
              :disabled="loading"
            >
              {{ note.isDone ? 'Undo' : 'Mark Done' }}
            </fwb-button>
            <fwb-button
              size="xs"
              color="purple"
              @click.prevent="showEditNoteModal(note.id, note.content)"
              :disabled="loading"
            >
              Edit
            </fwb-button>
            <fwb-button
              size="xs"
              color="pink"
              @click="deleteNoteAction(note.id)"
              :disabled="loading"
            >
              Delete
            </fwb-button>
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
      :isShowModal="isShowCollaboratorModal"
      :noteBoardId="noteBoardId"
      :noteBoardOwner
      @close-modal="closeCollaboratorModal"
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
</template>

<style scoped>
/* Ensure custom-scrollbar is defined, as it was in previous versions */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
