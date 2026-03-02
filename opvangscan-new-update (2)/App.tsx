async function syncToCloud() {
    try {
        const response = await fetch('https://example.com/api/sync', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(`Sync failed: ${data.message}`);
        }
        console.log('Sync successful:', data);
    } catch (error) {
        console.error('Error during sync:', error);
    }
}

async function fetchFromCloud() {
    try {
        const response = await fetch('https://example.com/api/fetch');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching from cloud:', error);
        throw error; // Optionally rethrow the error for further handling
    }
}