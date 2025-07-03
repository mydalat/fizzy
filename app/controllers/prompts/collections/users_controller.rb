class Prompts::Collections::UsersController < ApplicationController
  include CollectionScoped

  def index
    @users = @collection.users.alphabetically

    if stale? etag: @users
      render layout: false
    end
  end
end
