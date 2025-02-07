require "test_helper"

class NotifierTest < ActiveSupport::TestCase
  test "for returns the matching notifier class for the event" do
    assert_kind_of Notifier::Published, Notifier.for(events(:logo_published))
  end

  test "for does not raise an error when the event is not notifiable" do
    assert_nothing_raised do
      assert_no_difference -> { Notification.count } do
        Notifier.for(events(:logo_boost_dhh))
      end
    end
  end

  test "generate creates notifications for the event recipients" do
    assert_difference -> { Notification.count }, +2 do
      Notifier.for(events(:logo_published)).generate
    end
  end
end
