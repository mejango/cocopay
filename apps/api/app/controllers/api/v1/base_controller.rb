module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!

      private

      def paginate(collection)
        page = (params[:page] || 1).to_i
        per_page = [(params[:per_page] || 20).to_i, 100].min

        paginated = collection.offset((page - 1) * per_page).limit(per_page)
        total = collection.count

        [paginated, {
          page: page,
          per_page: per_page,
          total: total,
          total_pages: (total.to_f / per_page).ceil
        }]
      end
    end
  end
end
