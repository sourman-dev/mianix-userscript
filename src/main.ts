import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
// Import các file CSS
// import './tailwind.css'; // <-- Import file Tailwind chuyên dụng
import './style.css';   // <-- Import file style chung
import { i18n } from "./i18n";
import { useAppStore } from "./stores/app";
import { PricingService } from "./services/pricing-service";
import { ExchangeRateService } from "./services/exchange-rate-service";

const appDiv = document.createElement("div");
document.body.appendChild(appDiv);
const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// Set app to ready. The persisted state is loaded automatically.
const appStore = useAppStore();
appStore.setReady(true);

// Initialize pricing and exchange rate services (async, non-blocking)
PricingService.init().catch(err => console.error('❌ PricingService init failed:', err));
ExchangeRateService.init().catch(err => console.error('❌ ExchangeRateService init failed:', err));

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
app.use(ToastService);
app.mount(appDiv);