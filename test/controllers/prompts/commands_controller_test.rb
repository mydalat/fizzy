require "test_helper"

class Prompts::CommandsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as :kevin
  end

  test "index" do
    get prompts_commands_path
    assert_response :success
  end
end
