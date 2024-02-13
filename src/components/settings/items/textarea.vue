<template>
    <textarea class="b3-text-field fn__block" spellcheck="false" v-model="model"></textarea>
</template>
<script lang="ts" setup>

const model = defineModel({type: String});


</script>