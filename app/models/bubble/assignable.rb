module Bubble::Assignable
  extend ActiveSupport::Concern

  included do
    has_many :assignments, dependent: :destroy

    has_many :assignees, through: :assignments
    has_many :assigners, through: :assignments
  end

  def assign(users, assigner: Current.user)
    (Array(users) - assignees).tap do |users|
      users.each { |user| assignments.create!(assignee: user, assigner: assigner) }
    end
  end
end
