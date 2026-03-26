window.EMMAQ_RUNTIME_CONFIG = Object.assign(
    {
        // Leave apiBaseUrl empty to use the automatic local/production switch.
        apiBaseUrl: "",
        localApiBaseUrl: "http://127.0.0.1:8000/api",
        productionApiBaseUrl: "https://api.your-domain.com/api",
    },
    window.EMMAQ_RUNTIME_CONFIG || {}
);
