# Multi platform bot

This project is a Bun.js application running bot in telegram,discord,slack

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
    export SLACK_SIGNING_SECRET=your-slack-signing-secret
    export SLACK_BOT_ID=your-slack-app-id
    export SLACK_APP_TOKEN=your-slack-app-token
    export SLACK_BOT_OAUTH_TOKEN=your-slack-ouath
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

## Screenshoots
<img width="1512" alt="123" src="https://github.com/user-attachments/assets/2fd33500-09fd-42ff-8bfa-12ae68f99d0a">

