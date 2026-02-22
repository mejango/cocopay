# frozen_string_literal: true

class RemovePhoneFieldsFromUsers < ActiveRecord::Migration[8.0]
  def up
    remove_index :users, :phone, if_exists: true
    remove_column :users, :phone
    remove_column :users, :phone_verified_at
    remove_column :users, :backup_owner_phone

    execute <<-SQL
      ALTER TYPE auth_method RENAME TO auth_method_old;
      CREATE TYPE auth_method AS ENUM ('email', 'passkey', 'wallet');
      ALTER TABLE sessions ALTER COLUMN auth_method TYPE auth_method USING auth_method::text::auth_method;
      DROP TYPE auth_method_old;
    SQL
  end

  def down
    add_column :users, :phone, :string, limit: 20
    add_column :users, :phone_verified_at, :datetime
    add_column :users, :backup_owner_phone, :string, limit: 20
    add_index :users, :phone, unique: true, where: "phone IS NOT NULL"

    execute <<-SQL
      ALTER TYPE auth_method RENAME TO auth_method_old;
      CREATE TYPE auth_method AS ENUM ('email', 'phone', 'passkey', 'wallet');
      ALTER TABLE sessions ALTER COLUMN auth_method TYPE auth_method USING auth_method::text::auth_method;
      DROP TYPE auth_method_old;
    SQL
  end
end
