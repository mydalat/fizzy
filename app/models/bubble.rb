class Bubble < ApplicationRecord
  include Assignable, Boostable, Colored, Eventable, Messages, Poppable, Searchable, Staged, Taggable

  belongs_to :bucket
  belongs_to :creator, class_name: "User", default: -> { Current.user }

  has_one_attached :image, dependent: :purge_later

  before_save :set_default_title

  scope :reverse_chronologically, -> { order created_at: :desc, id: :desc }
  scope :chronologically, -> { order created_at: :asc, id: :asc }

  # FIXME: Compute activity and comment count at write time so it's easier to query for.
  scope :left_joins_comments, -> do
    left_joins(:messages).merge(Message.left_joins_messageable(:comments))
  end
  scope :ordered_by_activity, -> do
    left_joins_comments.select("bubbles.*, COUNT(comments.id) + bubbles.boost_count AS activity").group(:id).order("activity DESC")
  end
  scope :ordered_by_comments, -> do
    left_joins_comments.select("bubbles.*, COUNT(comments.id) AS comment_count").group(:id).order("comment_count DESC")
  end

  # FIXME: `status` implies an enum. Consider a name change.
  scope :with_status, ->(status) do
    status = status.presence_in %w[ popped active unassigned ]
    public_send(status) if status
  end

  scope :ordered_by, ->(order) do
    case order
    when "most_active"    then ordered_by_activity
    when "most_discussed" then ordered_by_comments
    when "most_boosted"   then ordered_by_boosts
    when "newest"         then reverse_chronologically
    when "oldest"         then chronologically
    end
  end

  class << self
    def default_order_by
      "most_active"
    end

    def default_status
      "active"
    end
  end

  def activity_count
    boost_count + messages.comments.size
  end

  private
    def set_default_title
      self.title = title.presence || "Untitled"
    end
end
