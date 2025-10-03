<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import {
  FwbInput,
  FwbButton,
  FwbTable,
  FwbTableBody,
  FwbTableHead,
  FwbTableHeadCell,
  FwbTableRow,
  FwbTableCell,
  FwbSpinner, // Added FwbSpinner for loading state
} from 'flowbite-vue'
import { useNoteStore } from '@/stores/noteStore'
import useErrorMessage from '@/composables/useErrorMessage'

const noteStore = useNoteStore()

const searchFor = ref<string>('')
const loading = ref(false)

const searchResults = computed(() => noteStore.searchResults)

const isSearchResult = computed(() => {
  return searchResults.value !== null && searchResults.value.length > 0
})

function eraseSearchResults() {
  noteStore.searchResults = null
  searchFor.value = ''
}

const [semanticSearchAction] = useErrorMessage(async () => {
  loading.value = true
  noteStore.searchResults = null
  try {
    await noteStore.sendSemanticSearch(searchFor.value)
  } catch (error) {
    console.error('Semantic search failed:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6 pt-5">
    <FwbInput
      label="Search for note"
      id="semanticSearch"
      name="semanticSearch"
      placeholder="search for"
      type="text"
      v-model="searchFor"
      :required="true"
      :disabled="!noteStore.isConnected || loading"
    >
      <template #suffix>
        <FwbButton
          @click="semanticSearchAction"
          :disabled="!searchFor.trim() || !noteStore.isConnected || loading"
        >
          <fwb-spinner v-if="loading" size="4" class="mr-2" />
          <span v-else>Search</span>
        </FwbButton>
      </template>
    </FwbInput>
  </div>

  <div v-if="loading && !isSearchResult" class="mt-8 flex items-center justify-center">
    <fwb-spinner size="6" />
    <span class="ml-3 text-lg text-gray-700 dark:text-gray-300">Searching...</span>
  </div>

  <div v-if="isSearchResult" class="mt-8">
    <div class="mb-4 flex items-center justify-between">
      <h5 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Search results ({{ searchResults?.length }} best matches)
      </h5>
      <FwbButton color="alternative" @click="eraseSearchResults" size="sm">Clear Results</FwbButton>
    </div>

    <div class="overflow-x-auto">
      <fwb-table class="w-full whitespace-normal">
        <fwb-table-head>
          <fwb-table-head-cell class="w-1/2">Note content</fwb-table-head-cell>
          <fwb-table-head-cell>Board</fwb-table-head-cell>
          <fwb-table-head-cell>Task is Done</fwb-table-head-cell>
          <fwb-table-head-cell>Similarity</fwb-table-head-cell>
        </fwb-table-head>
        <fwb-table-body>
          <fwb-table-row v-for="result in searchResults" :key="result.id">
            <fwb-table-cell class="note-content-cell">{{ result.content }}</fwb-table-cell>
            <fwb-table-cell>{{ result.title }}</fwb-table-cell>
            <fwb-table-cell>{{ result.isDone ? 'Yes' : 'No' }}</fwb-table-cell>
            <fwb-table-cell>{{ result.similarity.toFixed(4) }}</fwb-table-cell>
          </fwb-table-row>
        </fwb-table-body>
      </fwb-table>
    </div>
  </div>

  <div
    v-else-if="!loading && searchResults && searchResults.length === 0 && searchFor.trim()"
    class="mt-8 text-center text-gray-500 dark:text-gray-400"
  >
    No results found for "{{ searchFor }}".
  </div>
</template>

<style scoped>
.note-content-cell {
  /* Allow text to wrap naturally */
  white-space: normal;
  /* Prevent content from overflowing the cell while wrapping */
  word-break: break-word;
  /* Optionally set a max-width if you want to limit how wide the column gets */
  /* max-width: 300px; */
}
/* You might need to override Flowbite's default table cell padding if it's too tight */
/* .fwb-table-cell {
  padding: 12px 16px;
} */
</style>
