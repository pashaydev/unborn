# Telegram Bot Project

This project is a Node.js-based Telegram bot that utilizes SQLite3 for database management and Telegraph for simplified Telegram API interactions.

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
    ```

## Usage

Start the bot:

```sh
node index.js
```

## Contributing

Feel free to submit issues and pull requests. Contributions are welcome!

## License

This project is licensed under the MIT License.

## Configuration

Ensure you have the following environment variables set in your `.env` file:

```
BOT_TOKEN=your-telegram-bot-token
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Running Tests

To run tests, use the following command:

```sh
npm test
```

## Docker

```sh
npm run docker:build
```

## Support

If you encounter any issues or have questions, feel free to open an issue on the GitHub repository.

## Acknowledgements

Special thanks to the contributors and the open-source community for their invaluable support.
