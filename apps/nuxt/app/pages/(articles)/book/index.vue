<script setup lang="ts">
import { useNav } from '@typewords/core/utils'
const { nav } = useNav()
nav('/book-list', { replace: true })
</script>
