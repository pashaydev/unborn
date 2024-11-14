class PinterestAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseURL = "https://api.pinterest.com/v5";
    }

    async searchPins(query, limit = 10) {
        try {
            const response = await fetch(
                `${this.baseURL}/pins/search?query=${query}&limit=${limit}&media_type=image`,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();
            return data.items;
        } catch (error) {
            console.error("Error searching Pinterest:", error.message);
            throw error;
        }
    }

    async getRandomImage(query) {
        try {
            const pins = await this.searchPins(query);

            if (!pins || pins.length === 0) {
                throw new Error("No images found for the given query");
            }

            // Get a random pin from the results
            const randomIndex = Math.floor(Math.random() * pins.length);
            const randomPin = pins[randomIndex];

            return {
                imageUrl: randomPin.media?.images?.originals?.url,
                pinUrl: randomPin.link,
                description: randomPin.description,
            };
        } catch (error) {
            console.error("Error getting random image:", error.message);
            throw error;
        }
    }
}

async function main() {
    const accessToken = "";
    const pinterest = new PinterestAPI(accessToken);

    try {
        const searchQuery = "nature landscapes";
        const randomImage = await pinterest.getRandomImage(searchQuery);

        console.log("Random Image Details:");
        console.log("Image URL:", randomImage.imageUrl);
        console.log("Pin URL:", randomImage.pinUrl);
        console.log("Description:", randomImage.description);
    } catch (error) {
        console.error("Main error:", error.message);
    }
}

// Run the example
main();
