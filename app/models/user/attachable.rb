module User::Attachable
  extend ActiveSupport::Concern

  included do
    include ActionText::Attachable
  end

  def attachable_plain_text_representation(...)
    "@#{first_name.downcase}"
  end
end
