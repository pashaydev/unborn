# FROM oven/bun:1 AS base
# WORKDIR /usr/src/app

# # install dependencies into temp directory
# FROM base AS install
# RUN mkdir -p /temp/dev
# COPY package.json bun.lockb /temp/dev/
# RUN cd /temp/dev && bun install --frozen-lockfile

# # install with --production
# RUN mkdir -p /temp/prod
# COPY package.json bun.lockb /temp/prod/
# RUN cd /temp/prod && bun install --frozen-lockfile --production

# # copy node_modules from temp directory
# FROM base AS prerelease
# COPY --from=install /temp/dev/node_modules node_modules
# COPY . .

# # Set environment variables
# ENV NODE_ENV=test
# ENV PORT=3000
# ENV HOST=0.0.0.0

# # [optional] tests
# RUN bun test

# ENV NODE_ENV=production

# # Add this before your CMD or ENTRYPOINT
# RUN mkdir -p /data && chmod 777 /data

# # run the app
# USER bun
# EXPOSE 3000/tcp
# ENTRYPOINT [ "bun", "run", "src/bot.js" ]
# FROM ghcr.io/puppeteer/puppeteer:latest AS chrome

FROM oven/bun:1 AS base

# Copy Chrome and its dependencies from Puppeteer image
# COPY --from=chrome /usr/bin/google-chrome-stable /usr/bin/google-chrome-stable
# COPY --from=chrome /usr/lib/x86_64-linux-gnu/ /usr/lib/x86_64-linux-gnu/
# COPY --from=chrome /usr/share/fonts/ /usr/share/fonts/

WORKDIR /usr/src/app

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome binary path
ENV CHROME_BIN=/usr/bin/google-chrome

# install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Set environment variables
ENV NODE_ENV=test
ENV PORT=3000
ENV HOST=0.0.0.0
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# [optional] tests
RUN bun test

ENV NODE_ENV=production

# Add this before your CMD or ENTRYPOINT
RUN mkdir -p /data && chmod 777 /data

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/bot.js" ]