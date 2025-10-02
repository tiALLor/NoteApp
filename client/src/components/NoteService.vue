<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { FwbInput, FwbButton, FwbSpinner } from 'flowbite-vue'
import AlertMessages from '@/components/AlertMessages.vue'
import { useNoteStore } from '@/stores/noteStore'
import NoteBoardCard from './NoteBoardCard.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import type { NoteBoardWithNoteAndCollaborators } from '@server/services/noteService'

const noteStore = useNoteStore()

const newNoteBoardTitle = ref<string>('')

const hasSucceeded = ref(false)

const loading = ref(false)

const noteBoardIds = computed(
  () =>
    noteStore.noteBoardsData?.map((noteBoard: NoteBoardWithNoteAndCollaborators) => noteBoard.id) ||
    []
)

watch(
  () => noteStore.error,
  (newError) => {
    if (newError) {
      errorMessage.value = newError
      hasSucceeded.value = false
    }
  },
  { immediate: true }
)

const [createNoteBoardAction, errorMessage] = useErrorMessage(async () => {
  loading.value = false

  hasSucceeded.value = false
  errorMessage.value = ''

  let submitData = {
    title: newNoteBoardTitle.value,
  }
  noteStore.sendNewNoteBoard(submitData)

  newNoteBoardTitle.value = ''
  hasSucceeded.value = true

  loading.value = false
})

onMounted(() => {
  noteStore.connectToWebSocket()
  noteStore.sendGetAllBoards()
  console.log(' sendGetAllBoards from vue')
})
</script>

<template>
  <div class="space-y-6">
    <FwbInput
      label="Create new note board"
      id="createNoteBoard"
      name="createNoteBoard"
      placeholder="enter new Note Board Title"
      type="text"
      v-model="newNoteBoardTitle"
      :required="true"
      :disabled="!noteStore.isConnected || loading"
    >
      <template #suffix>
        <FwbButton
          @click="createNoteBoardAction"
          :disabled="!newNoteBoardTitle.trim() || !noteStore.isConnected || loading"
        >
          Create
        </FwbButton>
      </template>
    </FwbInput>

    <AlertMessages
      :showSuccess="hasSucceeded"
      successMessage="Note board created"
      :errorMessage="errorMessage"
    />

    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
      <FwbSpinner size="3" />
      <span class="ml-3 text-gray-700">Connecting or Loading Boards...</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="noteBoardId in noteBoardIds" :key="noteBoardId">
        <NoteBoardCard :noteBoardId="noteBoardId" />
      </div>

      <p
        v-if="noteStore.isConnected && !loading && noteBoardIds.length === 0"
        class="col-span-full text-center text-gray-500"
      >
        You don't have any note boards yet. Create one above!
      </p>
    </div>
  </div>
</template>
