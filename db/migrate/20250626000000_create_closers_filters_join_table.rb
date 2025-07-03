class CreateClosersFiltersJoinTable < ActiveRecord::Migration[8.1]
  def change
    create_table :closers_filters, id: false do |t|
      t.integer :filter_id, null: false
      t.integer :closer_id, null: false
    end

    add_index :closers_filters, :filter_id
    add_index :closers_filters, :closer_id
  end
end
