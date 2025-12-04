// Test file: Kiểm tra xem fetch streaming có hoạt động không
// Chạy file này trong console để test

async function testFetchStreaming() {
    const apiURL = "YOUR_API_URL/chat/completions";
    const apiKey = "YOUR_API_KEY";

    try {
        const response = await fetch(apiURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "Hello" }],
                stream: true,
            }),
        });

        if (!response.body) {
            console.error("❌ Response body is null");
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            console.log("📦 Chunk:", chunk);
        }

        console.log("✅ Fetch streaming works!");
    } catch (error) {
        console.error("❌ Fetch streaming failed:", error);
    }
}

// Uncomment để test:
// testFetchStreaming();
