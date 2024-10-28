class Message < ApplicationRecord
  belongs_to :bubble, touch: true

  delegated_type :messageable, types: Messageable::TYPES, inverse_of: :message, dependent: :destroy

  scope :chronologically, -> { order created_at: :asc, id: :desc }

  # FIXME: Will be made redundant when we compute activity and comment count at write time. See commit.
  scope :left_joins_messageable, ->(messageable_type) do
    joins "LEFT OUTER JOIN #{messageable_type} ON messages.messageable_id = #{messageable_type}.id"
  end
end
