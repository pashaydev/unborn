# Telegram Bot Project

This project is a Node.js (Bun runtime) Telegram bot that utilizes SQLite for database management and integrates with various AI services including OpenAI, Anthropic, and Stable Diffusion.

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/PashaYakubovsky/unborn
    cd unborn
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

    You must have bun installed:
    For more information, refer to the [Bun documentation](https://bun.sh/docs).

3. Set up environment variables:
    ```sh
    export BOT_TOKEN=your-telegram-bot-token
    export ANTHROPIC_API_KEY=your-anthropic-api-key
    export REDDIT_API_URL=reddit-api-url
    export PORT=your-port-default-3000
    export DOMAIN=your-webhook-url
    export SECRET_PATH=your-secret-path-or-empty
    export STABLE_DIFFUSION_API_KEY=your-api-key
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
