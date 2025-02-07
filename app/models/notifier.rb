class Notifier
  attr_reader :event

  delegate :creator, to: :event

  class << self
    def for(event)
      "Notifier::#{event.action.classify}".safe_constantize&.new(event)
    end
  end

  def generate
    recipients.map do |recipient|
      Notification.create! user: recipient, event: event, bubble: bubble, resource: resource
    end
  end

  private
    def initialize(event)
      @event = event
    end

    def recipients
      bubble.bucket.users.without(creator)
    end

    def resource
      bubble
    end

    def bubble
      event.summary.message.bubble
    end
end
