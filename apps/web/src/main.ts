import { createApp } from "vue";
import { ElAlert } from "element-plus";
import "element-plus/es/components/alert/style/css";
import "./style.css";
import App from "./App.vue";

createApp(App).use(ElAlert).mount("#app");
