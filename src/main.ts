import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// PrimeVue imports
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'

// PrimeVue components  
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dialog from 'primevue/dialog'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import Textarea from 'primevue/textarea'
import Message from 'primevue/message'
import Card from 'primevue/card'
import Divider from 'primevue/divider'
import Panel from 'primevue/panel'
import FloatLabel from 'primevue/floatlabel'
import ColorPicker from 'primevue/colorpicker'

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '',
      cssLayer: false
    }
  }
})

// Register PrimeVue components globally
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Password', Password)
app.component('Dialog', Dialog)
app.component('Calendar', Calendar)
app.component('Dropdown', Dropdown)
app.component('Checkbox', Checkbox)
app.component('RadioButton', RadioButton)
app.component('Textarea', Textarea)
app.component('Message', Message)
app.component('Card', Card)
app.component('Divider', Divider)
app.component('Panel', Panel)
app.component('FloatLabel', FloatLabel)
app.component('ColorPicker', ColorPicker)

app.mount('#app')
