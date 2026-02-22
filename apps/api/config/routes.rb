Rails.application.routes.draw do
  # Health checks
  get "up", to: "health#show"
  get "health/ready", to: "health#ready"

  # API V1
  namespace :api do
    namespace :v1 do
      # Authentication (scope instead of namespace to avoid nested controller path)
      scope :auth do
        post "email/send", to: "auth#send_magic_link"
        post "email/verify", to: "auth#verify_magic_link"
        post "wallet/nonce", to: "auth#wallet_nonce"
        post "wallet/siwe", to: "auth#verify_siwe"
        delete "session", to: "auth#logout"
      end

      # Users
      resource :user, only: [:show, :update], controller: "users" do
        get :balance
        get :transactions
        get :bonus
        post "bonus/claim", to: "users#claim_bonus"
      end

      # Payments
      resources :payments, only: [:create, :show] do
        collection do
          post :preview
        end
        member do
          get :status
        end
      end

      # Deployments (Relayr proxy)
      scope :deployments do
        post "bundle", to: "deployments#create_bundle"
        get "bundle/:bundle_id", to: "deployments#bundle_status"
      end

      # Stores
      resources :stores, only: [:index, :show, :create] do
        member do
          get :qr
        end
      end

      # Merchant Dashboard
      resource :my_store, only: [:show], controller: "my_store" do
        get :payments
        get :analytics
        resources :team, controller: "my_store/team", only: [:index, :create, :update, :destroy]
        resources :payouts, controller: "my_store/payouts", only: [:create, :index]
      end
    end
  end

  # ActionCable
  mount ActionCable.server => "/cable"
end
