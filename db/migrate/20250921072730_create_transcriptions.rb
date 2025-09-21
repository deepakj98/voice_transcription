class CreateTranscriptions < ActiveRecord::Migration[7.2]
  def change
    create_table :transcriptions do |t|
      t.text :text, null: false
      t.text :summary

      t.timestamps
    end
  end
end
