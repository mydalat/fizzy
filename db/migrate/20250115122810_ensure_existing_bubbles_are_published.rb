class EnsureExistingBubblesArePublished < ActiveRecord::Migration[8.1]
  def change
    execute "update bubbles set status = 'published' where status = 'drafted'"
  end
end
