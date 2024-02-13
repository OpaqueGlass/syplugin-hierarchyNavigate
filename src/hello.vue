<script setup lang="ts">
</script>

<template>
  <header>
    <div class="wrapper">
      <el-row>
        <el-col :span="6">
          <el-statistic title="总块数" :value="268500" />
        </el-col>
        <el-col :span="6">
          <el-statistic :value="138">
            <template #title>
              <div style="display: inline-flex; align-items: center">
                Ratio of men to women
                <el-icon style="margin-left: 4px" :size="12">
                  <Male />
                </el-icon>
              </div>
            </template>
            <template #suffix>/100</template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="今日块数" :value="172000" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="Feedback number" :value="562">
            <template #suffix>
              <el-icon style="vertical-align: -0.125em">
                <ChatLineRound />
              </el-icon>
            </template>
          </el-statistic>
        </el-col>
      </el-row>
      <el-timeline>
  </el-timeline>
    </div>
  </header>

  <main>
  </main>
</template>

<script lang="ts" setup>
import { ChatLineRound, Male } from '@element-plus/icons-vue'
import {ref} from 'vue'

const count = ref(0)

const activities = [
  {
    content: 'Event start',
    timestamp: '2018-04-15',
  },
  {
    content: 'Approved',
    timestamp: '2018-04-13',
  },
  {
    content: 'Success',
    timestamp: '2018-04-11',
  },
]


function increment() {
  count.value++
}
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
