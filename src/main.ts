import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ConfirmationService from "primevue/confirmationservice";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import "./style.css";
import { i18n } from "./i18n";

const appDiv = document.createElement("div");
  document.body.appendChild(appDiv);
  const app = createApp(App);
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  app.use(pinia);
  app.use(i18n);
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: "p",
        darkModeSelector: 'html[data-theme="dark"]',
        cssLayer: false,
      },
    },
  });
  app.use(ConfirmationService);
  app.mount(appDiv);