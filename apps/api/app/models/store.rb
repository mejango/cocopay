# frozen_string_literal: true

class Store < ApplicationRecord
  # Associations
  has_many :store_members, dependent: :destroy
  has_many :members, through: :store_members, source: :user
  has_many :store_deployments, dependent: :destroy
  has_many :transactions
  has_many :payouts, dependent: :destroy
  has_many :token_balances

  # Validations
  validates :name, presence: true
  validates :symbol, presence: true, length: { maximum: 10 }
  validates :short_code, uniqueness: true, allow_nil: true

  # Scopes
  scope :deployed, -> { where(deployment_status: "deployed") }
  scope :pending, -> { where(deployment_status: "pending") }

  # Nearby scope using earthdistance
  scope :nearby, ->(lat, lng, radius_km) {
    where("latitude IS NOT NULL")
      .where(
        "earth_box(ll_to_earth(?, ?), ?) @> ll_to_earth(latitude, longitude)",
        lat, lng, radius_km * 1000
      )
      .order(
        Arel.sql("earth_distance(ll_to_earth(#{connection.quote(lat)}, #{connection.quote(lng)}), ll_to_earth(latitude, longitude))")
      )
  }

  def owner
    store_members.find_by(role: "owner")&.user
  end

  def admins
    members.joins(:store_members).where(store_members: { role: %w[owner admin] })
  end

  def staff
    members.joins(:store_members).where(store_members: { role: "staff" })
  end
end
