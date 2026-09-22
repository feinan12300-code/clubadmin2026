const Store = require('../../utils/store.js')

Component({
  properties: {
    venueId: { type: String, value: '' },
  },
  data: {
    venues: [],
    names: [],
    index: 0,
  },
  lifetimes: {
    attached() { this.refresh() },
  },
  pageLifetimes: {
    show() { this.refresh() },
  },
  observers: {
    venueId() { this.refresh() },
  },
  methods: {
    refresh() {
      const venues = Store.list(Store.KEYS.venues)
      const names = venues.map(v => v.name)
      let index = venues.findIndex(v => v.id === this.properties.venueId)
      if (index < 0) index = 0
      this.setData({ venues, names, index })
    },
    onPick(e) {
      const index = Number(e.detail.value)
      const venue = this.data.venues[index]
      this.setData({ index })
      this.triggerEvent('change', { venueId: venue ? venue.id : '' })
    },
  },
})
