# frozen_string_literal: true

class EnableExtensions < ActiveRecord::Migration[8.0]
  def change
    enable_extension "uuid-ossp"
    enable_extension "pgcrypto"
    enable_extension "cube"
    enable_extension "earthdistance"
  end
end
