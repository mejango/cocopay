# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.2.3
FROM ruby:$RUBY_VERSION-slim AS base

WORKDIR /app

# Set production environment
ENV RAILS_ENV="development" \
    BUNDLE_PATH="/app/vendor/bundle" \
    BUNDLE_DEPLOYMENT="0"

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl \
    libjemalloc2 \
    libvips \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Build stage
FROM base AS build

# Install packages needed to build gems (autoconf/automake/libtool for rbsecp256k1)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    pkg-config \
    autoconf \
    automake \
    libtool \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install gems (skip dev/test for production)
ENV BUNDLE_WITHOUT="development test"
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application code
COPY . .

# Development stage
FROM base AS development

# Install build tools for gem compilation
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    pkg-config \
    autoconf \
    automake \
    libtool \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install gems
COPY Gemfile Gemfile.lock* ./
RUN bundle install

# Copy application code
COPY . .

# Create directory structure
RUN mkdir -p tmp/pids tmp/cache log storage

EXPOSE 3000
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]

# Production stage (last — Railway builds this by default)
FROM base AS production

ENV RAILS_ENV="production" \
    BUNDLE_WITHOUT="development test"

# Copy built artifacts
COPY --from=build /app /app
COPY --from=build /usr/local/bundle /usr/local/bundle

# Create runtime directories
RUN mkdir -p tmp/pids tmp/cache log storage

# Run and own files as a non-root user
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails /app

USER rails:rails

ENTRYPOINT ["./bin/docker-entrypoint"]
EXPOSE 8080
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]
