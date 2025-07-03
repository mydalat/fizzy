class Prompts::TagsController < ApplicationController
  def index
    @tags = Tag.all.alphabetically

    if stale? etag: @tags
      render layout: false
    end
  end
end
