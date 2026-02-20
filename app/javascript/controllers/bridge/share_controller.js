import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "share"

  share() {
    const type = this.bridgeElement.bridgeAttribute("share-type")
    switch (type) {
      case "card-url":
        this.send("shareCardUrl", this.#data(type))
        break
      default:
        this.send("shareUrl", this.#data(type))
    }
  }

  #data(type) {
    return {
      title: document.title,
      url: window.location.href,
      ...this.#additionalDataFor(type)
    }
  }

  #additionalDataFor(type) {
    switch (type) {
      case "card-url":
        return {
          author: this.#author,
          dateAdded: this.#dateAdded
        }
      default:
        return null
    }
  }

  get #author() {
    return document.querySelector(".card__meta-text--author strong")?.textContent?.trim() ?? null
  }

  get #dateAdded() {
    const timestamp = document.querySelector(".card__meta-text--added time")?.dateTime
    return parseInt(timestamp) || null
  }
}
