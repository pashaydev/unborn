# Multi platform bot

This project is a Bun.js application running telegram & discord bot in separate treads.

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/PashaYakubovsky/unborn
    cd unborn
    ```

2. Install dependencies:

    ```sh
    bun install
    ```

    You must have bun installed:
    For more information, refer to the [Bun documentation](https://bun.sh/docs).

3. Set up environment variables:

    ```sh
    export TELEGRAM_BOT_TOKEN=your-telegram-bot-token
    export DISCORD_BOT_TOKEN=your-discord-bot-token
    export ANTHROPIC_API_KEY=your-anthropic-api-key
    export OPENAI_API_KEY=your-openai-api-key
    export REDDIT_API_URL=reddit-api-url
    export PORT=your-port-default-3000
    export SECRET_PATH=your-secret-path-or-empty
    export STABLE_DIFFUSION_API_KEY=your-api-key
    export DISCORD_APP_ID=your-discord-app-id
    export GCS_BUCKET_NAME=your-google-claude-storage-name
    export GCS_KEY_FILE=json-gcs-file
    ```

## Usage

Start the bot:

```sh
npm run start
```

## Contributing

Feel free to submit issues and pull requests. Contributions are welcome!

## License

This project is licensed under the MIT License.

## Running Tests

To run tests, use the following command:

```sh
npm test
```

## Docker

```sh
npm run docker:build
```
