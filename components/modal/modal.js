Component({
  options: {
    addGlobalClass: true,
    multipleSlots: true,
  },
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '提示' },
  },
  methods: {
    onMask() { this.triggerEvent('close') },
    onClose() { this.triggerEvent('close') },
    noop() {},
  },
})
