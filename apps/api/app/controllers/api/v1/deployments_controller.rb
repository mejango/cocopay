# frozen_string_literal: true

module Api
  module V1
    class DeploymentsController < BaseController
      # Create a balance bundle on Relayr staging (proxy to avoid CORS).
      def create_bundle
        transactions = params.require(:transactions).map do |tx|
          {
            chain: tx[:chain],
            target: tx[:target],
            data: tx[:data],
            value: tx[:value]
          }
        end

        Rails.logger.info "[Deployments] Creating balance bundle with #{transactions.length} transactions"
        transactions.each_with_index do |tx, i|
          Rails.logger.info "[Deployments] tx[#{i}]: chain=#{tx[:chain]} target=#{tx[:target]} value=#{tx[:value]} data_length=#{tx[:data]&.length}"
        end
        Rails.logger.info "[Deployments] signer_address=#{params[:signer_address]}"

        result = RelayrService.create_staging_balance_bundle(
          transactions: transactions,
          signer_address: params[:signer_address]
        )

        render_success(result)
      rescue StandardError => e
        Rails.logger.error "Deployment bundle creation failed: #{e.message}"
        render_error(
          code: "DEPLOYMENT_ERROR",
          message: e.message,
          status: :unprocessable_entity
        )
      end

      # Get bundle status from Relayr staging (proxy to avoid CORS).
      def bundle_status
        result = RelayrService.get_staging_bundle_status(params[:bundle_id])
        render_success(result)
      rescue StandardError => e
        Rails.logger.error "Deployment status check failed: #{e.message}"
        render_error(
          code: "DEPLOYMENT_ERROR",
          message: e.message,
          status: :unprocessable_entity
        )
      end
    end
  end
end
