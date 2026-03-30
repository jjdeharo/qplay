(function () {
    const ANALYTICS_FALLBACK_ENDPOINT = 'https://bilateria.org/app/estadistica/qplay/track.php';
    const ANALYTICS_COOLDOWN_MS = 30 * 60 * 1000;
    const ANALYTICS_TIMEOUT_MS = 4000;
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

    function getMetaContent(name) {
        const node = document.querySelector(`meta[name="${name}"]`);
        return node ? node.getAttribute('content') : '';
    }

    function getAnalyticsConfig() {
        return {
            endpoint: getMetaContent('analytics-endpoint') || ANALYTICS_FALLBACK_ENDPOINT,
            siteId: getMetaContent('analytics-site-id') || 'qplay'
        };
    }

    function shouldTrackAnalytics() {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
            return false;
        }
        const host = String(window.location.hostname || '').toLowerCase();
        if (LOCAL_HOSTS.has(host) || host.endsWith('.local')) {
            return false;
        }
        return true;
    }

    function getStorageKey(siteId) {
        return `analytics:last-visit:${siteId}`;
    }

    function shouldCountVisit(siteId) {
        try {
            const rawValue = window.localStorage.getItem(getStorageKey(siteId));
            if (!rawValue) {
                return true;
            }
            const lastVisit = parseInt(rawValue, 10);
            if (!Number.isFinite(lastVisit)) {
                return true;
            }
            return (Date.now() - lastVisit) > ANALYTICS_COOLDOWN_MS;
        } catch (error) {
            return true;
        }
    }

    function rememberVisit(siteId) {
        try {
            window.localStorage.setItem(getStorageKey(siteId), String(Date.now()));
        } catch (error) {
            // Analytics is optional and must never block the app.
        }
    }

    function requestSummary(config) {
        const countVisit = shouldCountVisit(config.siteId);
        const callbackName = `qplayAnalyticsCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const query = new URLSearchParams();
        const script = document.createElement('script');
        let timeoutId = 0;
        let finished = false;

        query.set('callback', callbackName);
        if (!countVisit) {
            query.set('summary_only', '1');
        }

        function cleanup() {
            if (finished) {
                return;
            }
            finished = true;
            window.clearTimeout(timeoutId);
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            try {
                delete window[callbackName];
            } catch (error) {
                window[callbackName] = undefined;
            }
        }

        window[callbackName] = function (payload) {
            if (countVisit) {
                rememberVisit(config.siteId);
            }
            cleanup();
        };

        timeoutId = window.setTimeout(cleanup, ANALYTICS_TIMEOUT_MS);
        script.async = true;
        script.src = `${config.endpoint}?${query.toString()}`;
        script.onerror = cleanup;
        document.head.appendChild(script);
    }

    function initAnalytics() {
        if (!shouldTrackAnalytics()) {
            return;
        }

        const config = getAnalyticsConfig();
        const run = function () {
            requestSummary(config);
        };

        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout: 2500 });
        } else {
            window.setTimeout(run, 1200);
        }
    }

    document.addEventListener('DOMContentLoaded', initAnalytics);
})();
