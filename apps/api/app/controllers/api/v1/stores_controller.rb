# frozen_string_literal: true

module Api
  module V1
    class StoresController < BaseController
      # Allow browsing stores without authentication (JIT auth pattern)
      skip_before_action :authenticate_user!, only: [:index, :show]

      def index
        stores = Store.deployed

        if params[:lat].present? && params[:lng].present?
          radius = (params[:radius] || 10).to_f
          stores = stores.nearby(params[:lat].to_f, params[:lng].to_f, radius)
        end

        if params[:search].present?
          stores = stores.where("name ILIKE ?", "%#{params[:search]}%")
        end

        paginated, meta = paginate(stores)

        render_success(
          paginated.map { |store| serialize_store_summary(store) },
          meta: meta
        )
      end

      def show
        store = Store.find(params[:id])
        render_success(serialize_store(store))
      end

      def create
        store = Store.new(store_params)

        Store.transaction do
          store.save!
          StoreMember.create!(
            store: store,
            user: current_user,
            role: "owner",
            accepted_at: Time.current
          )

          # Queue deployment job
          # StoreDeploymentJob.perform_later(store.id)
        end

        render_success(serialize_store(store), status: :created)
      rescue ActiveRecord::RecordInvalid => e
        render_error(
          code: "VALIDATION_ERROR",
          message: e.message,
          details: e.record.errors.to_hash,
          status: :unprocessable_entity
        )
      end

      def qr
        store = Store.find(params[:id])
        # Generate QR code (placeholder)
        render_success({
          qr_code_url: store.qr_code_url || "https://pay.cocopay.app/#{store.short_code || store.id}",
          short_code: store.short_code
        })
      end

      private

      def store_params
        location = params[:location] || {}

        params.permit(:name, :symbol, :category, :description, :website, :instagram)
              .merge(
                latitude: location[:lat],
                longitude: location[:lng],
                address: location[:address]
              )
      end

      def serialize_store_summary(store)
        {
          id: store.id,
          name: store.name,
          symbol: store.symbol,
          category: store.category,
          location: location_info(store),
          user_rewards_usd: user_rewards_for_store(store)
        }
      end

      def serialize_store(store)
        deployment = store.store_deployments.deployed.first

        {
          id: store.id,
          name: store.name,
          symbol: store.symbol,
          category: store.category,
          description: store.description,
          location: location_info(store),
          revnet: deployment ? {
            project_id: deployment.project_id,
            token_address: deployment.token_address,
            terminal_address: deployment.terminal_address
          } : nil,
          deployment_status: store.deployment_status,
          qr_code_url: "https://pay.cocopay.app/#{store.short_code || store.id}",
          website: store.website,
          instagram: store.instagram,
          created_at: store.created_at.iso8601
        }
      end

      def location_info(store)
        return nil unless store.latitude && store.longitude

        {
          lat: store.latitude.to_f,
          lng: store.longitude.to_f,
          address: store.address
        }
      end

      def user_rewards_for_store(store)
        return "0.00" unless current_user

        balance = current_user.token_balances.find_by(store_id: store.id)
        format("%.2f", balance&.balance_usd || 0)
      end
    end
  end
end
