# frozen_string_literal: true

class CreateFunctionsAndTriggers < ActiveRecord::Migration[8.0]
  def up
    # Generate confirmation code function
    execute <<-SQL
      CREATE OR REPLACE FUNCTION generate_confirmation_code()
      RETURNS VARCHAR(6) AS $$
      DECLARE
        chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        result VARCHAR := '';
        i INTEGER;
      BEGIN
        FOR i IN 1..6 LOOP
          result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    SQL

    # Auto-update updated_at function
    execute <<-SQL
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    SQL

    # Apply triggers to tables with updated_at
    execute <<-SQL
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER update_stores_updated_at
        BEFORE UPDATE ON stores
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER update_token_balances_updated_at
        BEFORE UPDATE ON token_balances
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER update_feature_flags_updated_at
        BEFORE UPDATE ON feature_flags
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    SQL
  end

  def down
    execute <<-SQL
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
      DROP TRIGGER IF EXISTS update_token_balances_updated_at ON token_balances;
      DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;

      DROP FUNCTION IF EXISTS update_updated_at();
      DROP FUNCTION IF EXISTS generate_confirmation_code();
    SQL
  end
end
