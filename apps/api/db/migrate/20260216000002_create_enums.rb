# frozen_string_literal: true

class CreateEnums < ActiveRecord::Migration[8.0]
  def up
    execute <<-SQL
      CREATE TYPE auth_method AS ENUM ('email', 'phone', 'passkey', 'wallet');
      CREATE TYPE store_role AS ENUM ('owner', 'admin', 'staff');
      CREATE TYPE transaction_type AS ENUM ('payment', 'received', 'bonus_claim', 'payout', 'consolidation');
      CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');
      CREATE TYPE deployment_status AS ENUM ('pending', 'deploying', 'deployed', 'failed');
      CREATE TYPE payout_type AS ENUM ('pix', 'bank', 'wallet');
      CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
      CREATE TYPE custody_status AS ENUM ('managed', 'self_custody');
      CREATE TYPE chain_id AS ENUM ('1', '10', '8453', '42161', '11155111', '11155420', '84532', '421614');
    SQL
  end

  def down
    execute <<-SQL
      DROP TYPE IF EXISTS auth_method;
      DROP TYPE IF EXISTS store_role;
      DROP TYPE IF EXISTS transaction_type;
      DROP TYPE IF EXISTS transaction_status;
      DROP TYPE IF EXISTS deployment_status;
      DROP TYPE IF EXISTS payout_type;
      DROP TYPE IF EXISTS payout_status;
      DROP TYPE IF EXISTS custody_status;
      DROP TYPE IF EXISTS chain_id;
    SQL
  end
end
