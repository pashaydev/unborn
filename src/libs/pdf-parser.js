class PDFParser {
    static async parsePDF(fileBuffer) {
        try {
            const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
            const pdf = await loadingTask.promise;
            let text = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(" ") + "\n";
            }

            return text;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            return null;
        }
    }

    static async parseFromBuffer(fileBuffer) {
        try {
            const data = await pdf(fileBuffer);
            return {
                success: true,
                text: data.text,
                info: data.info,
                metadata: data.metadata,
                numPages: data.numpages,
            };
        } catch (error) {
            console.error("PDF parsing error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    static async parseFromURL(url) {
        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(buffer);
            return await this.parseFromBuffer(fileBuffer);
        } catch (error) {
            console.error("PDF download error:", error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

export default PDFParser;
