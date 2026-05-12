<script setup lang="ts">
const realCapabilities = [
  "提示词策略库",
  "AI 拓词候选保存",
  "知识库与 txt/md/csv 文件解析",
  "指令库",
  "内容任务与内容项",
  "模型覆盖记录",
  "GEO 报表"
];

const mockCapabilities = ["GEO 分析", "AI 拓词生成", "内容生成"];

const pendingCapabilities = [
  "真实外部 AI 自动检测",
  "真实 DeepSeek / 豆包 / Kimi / 通义接入",
  "自动发布",
  "登录权限"
];
</script>

<template>
  <div class="capability-boundary">
    <article class="capability-column capability-column--real">
      <el-tag type="success" effect="plain">真实入库能力</el-tag>
      <ul>
        <li v-for="item in realCapabilities" :key="item">{{ item }}</li>
      </ul>
    </article>
    <article class="capability-column capability-column--mock">
      <el-tag type="warning" effect="plain">Mock 能力</el-tag>
      <ul>
        <li v-for="item in mockCapabilities" :key="item">{{ item }}</li>
      </ul>
    </article>
    <article class="capability-column capability-column--pending">
      <el-tag type="info" effect="plain">未做能力</el-tag>
      <ul>
        <li v-for="item in pendingCapabilities" :key="item">{{ item }}</li>
      </ul>
    </article>
  </div>
</template>
