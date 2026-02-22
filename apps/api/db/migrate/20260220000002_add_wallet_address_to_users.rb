# frozen_string_literal: true

class AddWalletAddressToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :wallet_address, :string, limit: 42

    add_index :users, :wallet_address,
              unique: true,
              where: "wallet_address IS NOT NULL",
              name: "index_users_on_wallet_address_unique"
  end
end
