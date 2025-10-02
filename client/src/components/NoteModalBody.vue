<script setup lang="ts">
import { ref, watch } from 'vue'
import { FwbButton, FwbModal, FwbInput } from 'flowbite-vue'
import PageForm from '@/components/PageForm.vue'
import useErrorMessage from '@/composables/useErrorMessage'
import { useNoteStore } from '@/stores/noteStore'

const noteStore = useNoteStore()

const props = defineProps<{
  noteId?: number
  title: string
  noteBoardId: number
  noteContent: string
  isShowModal: boolean
  modalFunction: 'add' | 'update' | undefined
}>()

const emit = defineEmits<{
  (e: 'closeModal'): void
  (e: 'submit'): void
  (e: 'success'): void
}>()
console.log(props.noteContent)
const hasSucceeded = ref(false)

const successMessage = ref<string>()

const noteForm = ref({ content: props.noteContent })

watch(
  () => props.noteContent,
  (newContent) => {
    noteForm.value.content = newContent
  },
  { immediate: true } // Run immediately on setup to sync initial content
)

watch(
  () => props.isShowModal,
  (isOpen) => {
    if (isOpen) {
      hasSucceeded.value = false
      successMessage.value = undefined
    }
  }
)

const [submit] = useErrorMessage(async () => {
  if (props.modalFunction === 'add') {
    noteStore.sendNewNote({
      content: noteForm.value.content,
      boardId: props.noteBoardId,
    })
    successMessage.value = `Note ${noteForm.value.content} created.`
  } else if (props.modalFunction === 'update' && props.noteId) {
    noteStore.sendUpdateNoteContent({
      id: props.noteId,
      content: noteForm.value.content,
      boardId: props.noteBoardId,
    })
    successMessage.value = `Note ${noteForm.value.content} updated.`
  } else {
    throw new Error('Internal server Error, function')
  }

  hasSucceeded.value = true
  emit('success')
})
</script>

<template>
  <fwb-modal v-if="isShowModal" @close="$emit('closeModal')" :aria-label="`modal ${props.title}`">
    <template #header>
      <div class="flex items-center text-2xl">
        {{ title }}
      </div>
    </template>
    <template #body>
      <PageForm heading="Input the values" formLabel="mealForm" @submit="submit">
        <template #default>
          <FwbInput
            label="Note:"
            id="noteContent"
            name="noteContent"
            type="text"
            v-model="noteForm.content"
            input-class="overflow-x-auto whitespace-nowrap"
            class="w-full"
            :required="true"
          />

          <div class="grid">
            <FwbButton color="default" type="submit" size="xl">{{ title }}</FwbButton>
          </div>
        </template>
      </PageForm>
    </template>
  </fwb-modal>
</template>
