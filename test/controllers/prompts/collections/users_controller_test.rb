require "test_helper"

class Prompts::Collections::UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as :kevin
    @collection = collections(:writebook)
  end

  test "index" do
    get prompts_collection_users_path(@collection)
    assert_response :success
  end
end
