export default {
    async fetch(request, env) {
        return new Response(JSON.stringify({
            message: "Lotto API is running!",
            contractAddress: "0x0000000000000000000000000000000000000000",
            network: "Sepolia"
        }), {
            headers: {
                "content-type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
};
