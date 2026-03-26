(() => {
    function readConfigValue(value) {
        const raw = String(value || '').trim();
        return raw || '';
    }

    function runtimeConfig() {
        const config = window.EMMAQ_RUNTIME_CONFIG;
        return config && typeof config === 'object' ? config : {};
    }

    function isLocalBrowserContext() {
        const locationRef = window.location || {};
        const protocol = String(locationRef.protocol || '').toLowerCase();
        const hostname = String(locationRef.hostname || '').toLowerCase();
        return protocol === 'file:' || hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1';
    }

    function inferDefaultBaseUrl() {
        const config = runtimeConfig();
        const explicit = readConfigValue(config.apiBaseUrl);
        if (explicit) {
            return explicit;
        }

        const localDefault = readConfigValue(config.localApiBaseUrl) || 'http://127.0.0.1:8000/api';
        const productionDefault = readConfigValue(config.productionApiBaseUrl) || 'https://api.your-domain.com/api';
        return isLocalBrowserContext() ? localDefault : productionDefault;
    }

    const DEFAULT_BASE_URL = inferDefaultBaseUrl();

    function normalizeBaseUrl(value) {
        const raw = String(value || '').trim();
        if (!raw) {
            return DEFAULT_BASE_URL;
        }

        return raw.replace(/\/+$/, '');
    }

    class EmmaQApiClient {
        constructor(baseUrl = DEFAULT_BASE_URL) {
            this.baseUrl = normalizeBaseUrl(baseUrl);
        }

        setBaseUrl(baseUrl) {
            this.baseUrl = normalizeBaseUrl(baseUrl);
            return this.baseUrl;
        }

        getBaseUrl() {
            return this.baseUrl;
        }

        async request(path, options = {}) {
            const {
                method = 'GET',
                headers = {},
                body,
                timeout = 15000,
                isFormData = false,
            } = options;

            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), timeout);
            const requestHeaders = new Headers(headers);

            if (!isFormData && body != null && !requestHeaders.has('Content-Type')) {
                requestHeaders.set('Content-Type', 'application/json');
            }

            try {
                const response = await fetch(`${this.baseUrl}${path}`, {
                    method,
                    headers: requestHeaders,
                    body,
                    signal: controller.signal,
                });

                const contentType = response.headers.get('content-type') || '';
                const payload = contentType.includes('application/json')
                    ? await response.json()
                    : await response.text();

                if (!response.ok) {
                    const error = new Error(
                        typeof payload === 'string'
                            ? payload || `Request failed with status ${response.status}.`
                            : payload?.message || `Request failed with status ${response.status}.`
                    );
                    error.status = response.status;
                    error.payload = payload;
                    throw error;
                }

                return payload;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timed out. Confirm the backend service is running.');
                }

                throw error;
            } finally {
                window.clearTimeout(timer);
            }
        }

        async requestWithFallback(paths, options) {
            let lastError = null;

            for (const path of paths) {
                try {
                    const data = await this.request(path, options);
                    return { pathUsed: path, data };
                } catch (error) {
                    lastError = error;
                    if (error.status && error.status !== 404) {
                        throw error;
                    }
                }
            }

            throw lastError || new Error('No backend API endpoint was available.');
        }

        async healthcheck() {
            return this.requestWithFallback([
                '/health',
                '/healthz',
                '/status',
            ], {
                method: 'GET',
                timeout: 8000,
            });
        }

        async savePreferences(payload) {
            return this.requestWithFallback([
                '/preferences',
                '/config/preferences',
                '/prefs',
            ], {
                method: 'POST',
                body: JSON.stringify(payload),
                timeout: 15000,
            });
        }

        async generateMusic({ payload, eegFile, iniContent }) {
            const formData = new FormData();
            formData.append('preferences', JSON.stringify(payload));
            formData.append('preferences_ini', iniContent);
            formData.append('eeg_file', eegFile, eegFile.name);

            return this.requestWithFallback([
                '/generate',
                '/jobs/generate',
                '/music/generate',
            ], {
                method: 'POST',
                body: formData,
                timeout: 30000,
                isFormData: true,
            });
        }

        async runPipeline({ payload, eegFile, iniContent }) {
            const formData = new FormData();
            formData.append('preferences', JSON.stringify(payload));
            formData.append('preferences_ini', iniContent);
            formData.append('eeg_file', eegFile, eegFile.name);

            return this.requestWithFallback([
                '/pipeline/run',
            ], {
                method: 'POST',
                body: formData,
                timeout: 30000,
                isFormData: true,
            });
        }

        async evaluateJob(jobId) {
            return this.requestWithFallback([
                '/evaluate',
            ], {
                method: 'POST',
                body: JSON.stringify({ job_id: jobId }),
                timeout: 30000,
            });
        }

        async getJob(jobId) {
            const safeJobId = encodeURIComponent(String(jobId || '').trim());
            if (!safeJobId) {
                throw new Error('job_id is required.');
            }
            return this.request(`/jobs/${safeJobId}`, {
                method: 'GET',
                timeout: 10000,
            });
        }
    }

    window.EMMAQ_DEFAULT_API_BASE_URL = DEFAULT_BASE_URL;
    window.normalizeEmmaQBaseUrl = normalizeBaseUrl;
    window.EmmaQApiClient = EmmaQApiClient;
})();
