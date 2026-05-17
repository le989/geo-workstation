<script setup lang="ts">
const realCapabilities = [
  "提示词策略库",
  "AI 拓词候选保存",
  "知识库与 txt/md/csv 文件解析",
  "指令库",
  "内容任务与内容项",
  "模型覆盖记录",
  "GEO 报表",
  "登录与路由保护"
];

const internalReferenceCapabilities = ["GEO 诊断辅助分析", "AI 拓词候选生成", "内容草稿生成"];

const pendingCapabilities = [
  "真实外部 AI 自动检测",
  "多模型批量自动检测",
  "自动发布",
  "开放注册 / OAuth / 复杂权限"
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
    <article class="capability-column capability-column--reference">
      <el-tag type="warning" effect="plain">内部参考能力</el-tag>
      <ul>
        <li v-for="item in internalReferenceCapabilities" :key="item">{{ item }}</li>
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
