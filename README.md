# Telegram Bot Project

This project is a Node.js-based Telegram bot that utilizes SQLite3 for database management and Telegraph for simplified Telegram API interactions

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

3. Set up environment variables:
    ```sh
    export BOT_TOKEN=your-telegram-bot-token
    export ANTHROPIC_API_KEY=your-anthropic-api-key
    export REDDIT_API_URL=reddit-api-url
    export PORT=your-port-default-3000
    export DOMAIN=your-webhook-url
    export SECRET_PATH=your-secret-path-or-empty
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
