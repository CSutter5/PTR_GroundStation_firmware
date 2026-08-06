let ws = null;
let pollTimer = null;
let usingFallback = false;

document.addEventListener("DOMContentLoaded", function() {
    connectWebSocket();
});

function connectWebSocket() {
    const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected");
        stopFallbackPolling();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            populateTable(data);
        } catch (e) {
            console.error("Failed to parse WS message:", e);
        }
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
        console.log("WebSocket closed, falling back to polling");
        startFallbackPolling();
        // Try to reconnect the socket every 5s in the background
        setTimeout(connectWebSocket, 5000);
    };
}

function startFallbackPolling() {
    if (usingFallback) return;
    usingFallback = true;

    fetchAndPopulate(); // immediate refresh
    pollTimer = setInterval(fetchAndPopulate, 1000);
}

function stopFallbackPolling() {
    usingFallback = false;
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function fetchAndPopulate() {
    fetch('/tracker_list_api')
        .then(response => response.json())
        .then(data => populateTable(data))
        .catch(error => console.error('Error fetching data:', error));
}

function populateTable(data) {
    const tableBody = document.querySelector('#trackerTable tbody');
    tableBody.innerHTML = ""; // clear previous rows so we don't duplicate on refresh

    data.forEach(item => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = item.id;
        row.appendChild(idCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = item.age;
        timeCell.classList.add('time-column');
        row.appendChild(timeCell);

        const latitudeCell = document.createElement('td');
        latitudeCell.textContent = item.latitude;
        row.appendChild(latitudeCell);

        const longitudeCell = document.createElement('td');
        longitudeCell.textContent = item.longitude;
        row.appendChild(longitudeCell);

        const altitudeCell = document.createElement('td');
        altitudeCell.textContent = item.altitude;
        altitudeCell.classList.add('altitude-column');
        row.appendChild(altitudeCell);

        const mapCell = document.createElement('td');
        const mapButton = document.createElement('button');
        mapButton.textContent = 'Go to Map';
        mapButton.onclick = (event) => {
            event.stopPropagation();
            const mapUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
            window.open(mapUrl, '_blank');
        };
        mapCell.classList.add('map-column');
        mapCell.appendChild(mapButton);
        row.appendChild(mapCell);

        row.onclick = () => {
            const mapUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
            window.open(mapUrl, '_blank');
        };

        tableBody.appendChild(row);
    });
}
